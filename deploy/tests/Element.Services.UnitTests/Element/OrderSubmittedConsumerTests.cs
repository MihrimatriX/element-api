using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Messaging.Consumers;
using Element.Services.Element.Infrastructure.Persistence;
using Element.Shared.Events;
using FluentAssertions;
using MassTransit;
using MassTransit.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Element.Services.UnitTests.Element;

public class OrderSubmittedConsumerTests
{
    private static ElementDbContext CreateDb(string dbName, Action<ElementDbContext>? seed = null)
    {
        var options = new DbContextOptionsBuilder<ElementDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;
        var db = new ElementDbContext(options);
        seed?.Invoke(db);
        db.SaveChanges();
        return db;
    }

    [Fact]
    public async Task Consume_PublishesStockReservationFailed_WhenElementMissing()
    {
        await using var provider = new ServiceCollection()
            .AddLogging()
            .AddSingleton(CreateDb("missing-element"))
            .AddMassTransitTestHarness(x => x.AddConsumer<OrderSubmittedConsumer>())
            .BuildServiceProvider(true);

        var harness = provider.GetRequiredService<ITestHarness>();
        await harness.Start();

        var orderId = Guid.NewGuid();
        await harness.Bus.Publish(new OrderSubmittedEvent(orderId, Guid.NewGuid(), "Xx", 1, 10));

        (await harness.Published.Any<StockReservationFailedEvent>()).Should().BeTrue();
        (await harness.Published.Any<StockReservedEvent>()).Should().BeFalse();
    }

    [Fact]
    public async Task Consume_PublishesStockReservationFailed_WhenInsufficientStock()
    {
        var db = CreateDb("low-stock", ctx =>
        {
            ctx.ChemicalElements.Add(new ChemicalElement
            {
                Id = Guid.NewGuid(),
                Symbol = "Au",
                Name = "Gold",
                AtomicNumber = 79,
                PricePerGram = 10,
                StockWeightGrams = 5,
                ReservedWeightGrams = 0
            });
        });

        await using var provider = new ServiceCollection()
            .AddLogging()
            .AddSingleton(db)
            .AddMassTransitTestHarness(x => x.AddConsumer<OrderSubmittedConsumer>())
            .BuildServiceProvider(true);

        var harness = provider.GetRequiredService<ITestHarness>();
        await harness.Start();

        await harness.Bus.Publish(new OrderSubmittedEvent(Guid.NewGuid(), Guid.NewGuid(), "Au", 100, 1000));

        (await harness.Published.Any<StockReservationFailedEvent>(x =>
            x.Context.Message.Reason.Contains("Insufficient stock"))).Should().BeTrue();
    }

    [Fact]
    public async Task Consume_ReservesStock_AndPublishesStockReserved()
    {
        var db = CreateDb("ok-stock", ctx =>
        {
            ctx.ChemicalElements.Add(new ChemicalElement
            {
                Id = Guid.NewGuid(),
                Symbol = "Ag",
                Name = "Silver",
                AtomicNumber = 47,
                PricePerGram = 1,
                StockWeightGrams = 1000,
                ReservedWeightGrams = 0
            });
        });

        await using var provider = new ServiceCollection()
            .AddLogging()
            .AddSingleton(db)
            .AddMassTransitTestHarness(x => x.AddConsumer<OrderSubmittedConsumer>())
            .BuildServiceProvider(true);

        var harness = provider.GetRequiredService<ITestHarness>();
        await harness.Start();

        var orderId = Guid.NewGuid();
        await harness.Bus.Publish(new OrderSubmittedEvent(orderId, Guid.NewGuid(), "Ag", 50, 50));

        (await harness.Published.Any<StockReservedEvent>(x => x.Context.Message.OrderId == orderId)).Should().BeTrue();

        var element = await db.ChemicalElements.FirstAsync(e => e.Symbol == "Ag");
        element.ReservedWeightGrams.Should().Be(50);
    }
}
