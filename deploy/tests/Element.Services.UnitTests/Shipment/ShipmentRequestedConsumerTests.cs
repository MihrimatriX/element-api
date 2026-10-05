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
using Npgsql;

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
    public async Task Consume_ConcurrentDuplicate_RepublishesTheWinnersTrackingNumber()
    {
        var options = new DbContextOptionsBuilder<ShipmentDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var orderId = Guid.NewGuid();
        var winner = new ShipmentRecord
        {
            Id = Guid.NewGuid(), OrderId = orderId, CustomerId = "customer-1", ElementSymbol = "Au",
            Quantity = 25, Status = "Shipped", TrackingNumber = "TRK-WINNER", CreatedAt = DateTime.UtcNow
        };

        await using var provider = BuildProvider(new RacingDbContext(options, winner));
        var harness = provider.GetRequiredService<ITestHarness>();
        await harness.Start();

        await harness.Bus.Publish(new ShipmentRequestedEvent(orderId, "customer-1", "Au", 25));

        // Consumed without a fault: the unique violation is "already processed", not an error to retry.
        (await harness.Consumed.Any<ShipmentRequestedEvent>(x => x.Exception == null)).Should().BeTrue();
        harness.Published.Select<ShipmentDispatchedEvent>().Select(x => x.Context.Message.TrackingNumber)
            .Should().Equal("TRK-WINNER");
        await using var db = new ShipmentDbContext(options);
        (await db.Shipments.CountAsync()).Should().Be(1);
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

    /// <summary>
    /// Another delivery of the same order commits first; our insert then hits the unique index on OrderId.
    /// The in-memory provider has no unique constraints, so the Postgres error is raised by hand.
    /// </summary>
    private sealed class RacingDbContext(DbContextOptions<ShipmentDbContext> options, ShipmentRecord winner)
        : ShipmentDbContext(options)
    {
        public override async Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken ct = default)
        {
            await using (var other = new ShipmentDbContext(options))
            {
                other.Shipments.Add(winner);
                await other.SaveChangesAsync(ct);
            }
            throw new DbUpdateException("duplicate key",
                new PostgresException("duplicate key value violates unique constraint", "ERROR", "ERROR", PostgresErrorCodes.UniqueViolation));
        }
    }
}
