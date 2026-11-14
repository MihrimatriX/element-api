using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Element.Services.UnitTests.Element;

public class EfElementRepositoryTests
{
    private static ElementDbContext Db() =>
        new(new DbContextOptionsBuilder<ElementDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static ChemicalElement Element(string symbol, int z) =>
        new() { Id = Guid.NewGuid(), Symbol = symbol, Name = symbol, AtomicNumber = z, PricePerGram = 1 };

    [Fact]
    public async Task GetAllAsync_SharesOneSnapshotAcrossRequestsWithinTtl()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());
        await using var db = Db();
        db.ChemicalElements.Add(Element("Au", 79));
        await db.SaveChangesAsync();

        var first = await new EfElementRepository(db, cache).GetAllAsync();
        db.ChemicalElements.Add(Element("Ag", 47));
        await db.SaveChangesAsync();

        // A new request scope (new repository, same singleton cache) must not query again.
        (await new EfElementRepository(db, cache).GetAllAsync()).Should().BeSameAs(first).And.ContainSingle();
    }

    [Fact]
    public async Task GetPriceRangeSinceAsync_AggregatesOnlyTheSymbolsWindow()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());
        await using var db = Db();
        var now = DateTime.UtcNow;
        void Add(string symbol, decimal price, double hoursAgo) => db.PriceHistories.Add(new ElementPriceHistory
            { Id = Guid.NewGuid(), ElementSymbol = symbol, Price = price, Timestamp = now.AddHours(-hoursAgo) });
        Add("Au", 1m, 30);   // before the window
        Add("Au", 9m, 10);
        Add("Au", 5m, 20);   // earliest in window
        Add("Au", 3m, 1);
        Add("Ag", 100m, 2);  // other symbol
        await db.SaveChangesAsync();
        var repo = new EfElementRepository(db, cache);

        (await repo.GetPriceRangeSinceAsync(" au ", now.AddHours(-24))).Should().Be(((decimal?)5m, (decimal?)9m, (decimal?)3m));
        (await repo.GetPriceRangeSinceAsync("xx", now.AddHours(-24))).Should().Be(((decimal?)null, (decimal?)null, (decimal?)null));
    }

    [Fact]
    public async Task GetFulfilledVolumeSinceAsync_CountsCompletedOrdersAndDeskSalesInTheWindow()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());
        await using var db = Db();
        var now = DateTime.UtcNow;
        db.StockReservations.AddRange(
            StockReservation.ForCompletedOrder(Guid.NewGuid(), "Au", 2m, now.AddHours(-1)),
            StockReservation.ForDeskSale(Guid.NewGuid(), "Au", 0.5m, now.AddHours(-2)),
            StockReservation.ForCompletedOrder(Guid.NewGuid(), "Au", 7m, now.AddHours(-30)),  // before the window
            StockReservation.ForCompletedOrder(Guid.NewGuid(), "Ag", 100m, now.AddHours(-1))); // other symbol
        await db.SaveChangesAsync();

        (await new EfElementRepository(db, cache).GetFulfilledVolumeSinceAsync("au", now.AddHours(-24))).Should().Be(2.5m);
    }
}
