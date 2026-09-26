using Element.Services.Shipment.Infrastructure.Consumers;
using Element.Services.Shipment.Infrastructure.Data;
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

        await using var provider = new ServiceCollection()
            .AddLogging()
            .AddSingleton<IConfiguration>(new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Shipment:FailQuantityGte"] = "100"
                })
                .Build())
            .AddSingleton(new ShipmentDbContext(options))
            .AddMassTransitTestHarness(x => x.AddConsumer<ShipmentRequestedConsumer>())
            .BuildServiceProvider(true);

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
        shipment.TrackingNumber.Should().StartWith("TRK-");
    }
}
