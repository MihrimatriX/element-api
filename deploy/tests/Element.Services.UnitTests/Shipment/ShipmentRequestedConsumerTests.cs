using Element.Services.Shipment.Infrastructure.Consumers;
using Element.Services.Shipment.Infrastructure.Data;
using Element.Services.Shipment.Infrastructure.Entities;
using Element.Shared.Events;
using FluentAssertions;
using MassTransit;
using MassTransit.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Element.Services.UnitTests.Shipment;

public class ShipmentRequestedConsumerTests
{
    [Fact]
    public async Task Consume_PersistsShipment_AndPublishesDispatchedEvent()
    {
        var options = new DbContextOptionsBuilder<ShipmentDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        await using var provider = BuildProvider(new ShipmentDbContext(options));

        var harness = provider.GetRequiredService<ITestHarness>();
        await harness.Start();

        var orderId = Guid.NewGuid();
        await harness.Bus.Publish(new ShipmentRequestedEvent(orderId, "customer-1", "Au", 25));

        (await harness.Published.Any<ShipmentDispatchedEvent>(x => x.Context.Message.OrderId == orderId)).Should().BeTrue();

        await using var scope = provider.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ShipmentDbContext>();
        var shipment = await db.Shipments.SingleAsync();
        shipment.OrderId.Should().Be(orderId);
        shipment.Status.Should().Be("Shipped");
        shipment.TrackingNumber.Should().MatchRegex("^TRK-[0-9A-F]{16}$");
    }

    [Fact]
    public async Task Consume_RepeatedRequest_RepublishesTheStoredTrackingNumber_WithoutASecondShipment()
    {
        var options = new DbContextOptionsBuilder<ShipmentDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var orderId = Guid.NewGuid();
        await using (var seed = new ShipmentDbContext(options))
        {
            seed.Shipments.Add(ShipmentRecord.Open(orderId, "customer-1", "Au", 25, 0, "TRK-FIRST", DateTime.UtcNow));
            await seed.SaveChangesAsync();
        }

        await using var provider = BuildProvider(new ShipmentDbContext(options));
        var harness = provider.GetRequiredService<ITestHarness>();
        await harness.Start();

        await harness.Bus.Publish(new ShipmentRequestedEvent(orderId, "customer-1", "Au", 25));

        (await harness.Consumed.Any<ShipmentRequestedEvent>(x => x.Exception == null)).Should().BeTrue();
        harness.Published.Select<ShipmentDispatchedEvent>().Select(x => x.Context.Message.TrackingNumber)
            .Should().Equal("TRK-FIRST");
        await using var db = new ShipmentDbContext(options);
        (await db.Shipments.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Consume_OverTheCarrierLimit_StoresAFailedShipment_AndPublishesFailed()
    {
        var options = new DbContextOptionsBuilder<ShipmentDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        await using var provider = BuildProvider(new ShipmentDbContext(options));
        var harness = provider.GetRequiredService<ITestHarness>();
        await harness.Start();

        var orderId = Guid.NewGuid();
        await harness.Bus.Publish(new ShipmentRequestedEvent(orderId, "customer-1", "Au", 150));

        (await harness.Published.Any<ShipmentFailedEvent>(x =>
            x.Context.Message.OrderId == orderId && x.Context.Message.Reason.Contains("carrier limit"))).Should().BeTrue();
        await using var db = new ShipmentDbContext(options);
        (await db.Shipments.SingleAsync()).Status.Should().Be(ShipmentRecord.FailedStatus);
    }

    [Fact]
    public void Migrations_MatchTheModel()
    {
        // Migrations here are hand-written; EF refuses to migrate when the snapshot drifts from the model.
        using var db = new ShipmentDbContext(new DbContextOptionsBuilder<ShipmentDbContext>()
            .UseNpgsql("Host=unused").Options);
        db.Database.HasPendingModelChanges().Should().BeFalse();
    }

    private static ServiceProvider BuildProvider(ShipmentDbContext db) =>
        new ServiceCollection()
            .AddLogging()
            .AddSingleton<IConfiguration>(new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Shipment:FailQuantityGte"] = "100"
                })
                .Build())
            .AddSingleton(db)
            .AddMassTransitTestHarness(x => x.AddConsumer<ShipmentRequestedConsumer>())
            .BuildServiceProvider(true);
}
