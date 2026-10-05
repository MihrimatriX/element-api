using System.Collections.Generic;
using System.Linq;
using Element.Services.Element.Core.Domain;
using Element.Services.Element.Core.Entities;
using FluentAssertions;

namespace Element.Services.UnitTests.Element;

public class ElementAnalyticsTests
{
    private static ChemicalElement Make(
        string symbol, string name, int atomicNumber, string category,
        decimal price, decimal mass, int period, int group,
        decimal? melting = null, decimal? density = null,
        decimal stock = 100, decimal reserved = 0, string phase = "Solid", string block = "s") =>
        new()
        {
            Symbol = symbol,
            Name = name,
            AtomicNumber = atomicNumber,
            Category = category,
            PricePerGram = price,
            AtomicMass = mass,
            Period = period,
            Group = group,
            MeltingPoint = melting,
            Density = density,
            StockWeightGrams = stock,
            ReservedWeightGrams = reserved,
            Phase = phase,
            Block = block
        };

    private static List<ChemicalElement> Sample() =>
    [
        Make("H", "Hydrogen", 1, "diatomic nonmetal", price: 9m, mass: 1.008m, period: 1, group: 1, phase: "Gas"),
        Make("Au", "Gold", 79, "transition metal", price: 75m, mass: 196.97m, period: 6, group: 11, melting: 1337m, density: 19.3m),
        Make("Ag", "Silver", 47, "transition metal", price: 1.15m, mass: 107.87m, period: 5, group: 11, melting: 1234m, density: 10.49m),
        Make("Cu", "Copper", 29, "transition metal", price: 0.009m, mass: 63.55m, period: 4, group: 11, melting: 1357m, density: 8.96m, stock: 50, reserved: 50),
        Make("Fe", "Iron", 26, "transition metal", price: 0.38m, mass: 55.85m, period: 4, group: 8, melting: 1811m, density: 7.87m)
    ];

    [Fact]
    public void ComputeStatistics_ReportsLeadersAndAverages()
    {
        var stats = ElementAnalytics.ComputeStatistics(Sample());

        stats.Count.Should().Be(5);
        stats.Cheapest!.Symbol.Should().Be("Cu");
        stats.MostExpensive!.Symbol.Should().Be("Au");
        stats.Heaviest!.Symbol.Should().Be("Au");
        stats.HighestMelting!.Symbol.Should().Be("Fe");
        stats.CountByCategory["transition metal"].Should().Be(4);
        stats.AveragePrice.Should().BeApproximately(17.1078m, 0.01m);
    }

    [Fact]
    public void ComputeStatistics_OnEmptySet_ReturnsZeroedValueObject()
    {
        var stats = ElementAnalytics.ComputeStatistics(new List<ChemicalElement>());

        stats.Count.Should().Be(0);
        stats.Cheapest.Should().BeNull();
        stats.CountByCategory.Should().BeEmpty();
    }

    [Fact]
    public void MedianPrice_WithOddCount_IsMiddleValue()
    {
        // prices: 0.009, 0.38, 1.15, 9, 75 -> median 1.15
        var stats = ElementAnalytics.ComputeStatistics(Sample());
        stats.MedianPrice.Should().Be(1.15m);
    }

    [Fact]
    public void Query_FiltersByCategoryAndPriceRange()
    {
        var filter = new ElementFilter { Category = "transition", MinPrice = 0.1m, MaxPrice = 2m };
        var result = ElementAnalytics.Query(Sample(), filter);

        result.Select(e => e.Symbol).Should().BeEquivalentTo(["Ag", "Fe"]);
    }

    [Fact]
    public void Query_InStockOnly_ExcludesFullyReserved()
    {
        var result = ElementAnalytics.Query(Sample(), new ElementFilter { InStockOnly = true });
        result.Should().NotContain(e => e.Symbol == "Cu"); // Cu is fully reserved
    }

    [Fact]
    public void Query_SortsByPriceDescending()
    {
        var filter = new ElementFilter { Sort = ElementSort.Price, Descending = true };
        var result = ElementAnalytics.Query(Sample(), filter);

        result.First().Symbol.Should().Be("Au");
        result.Last().Symbol.Should().Be("Cu");
    }

    [Fact]
    public void Query_SearchMatchesSymbolNameOrAtomicNumber()
    {
        ElementAnalytics.Query(Sample(), new ElementFilter { Search = "gold" })
            .Should().ContainSingle().Which.Symbol.Should().Be("Au");

        ElementAnalytics.Query(Sample(), new ElementFilter { Search = "79" })
            .Should().ContainSingle().Which.Symbol.Should().Be("Au");
    }

    [Fact]
    public void Compare_IdentifiesPerMetricWinners()
    {
        var elements = Sample().Where(e => e.Symbol is "Au" or "Cu").ToList();
        var comparison = ElementAnalytics.Compare(elements);

        comparison.CheapestSymbol.Should().Be("Cu");
        comparison.MostExpensiveSymbol.Should().Be("Au");
        comparison.HeaviestSymbol.Should().Be("Au");
        comparison.LightestSymbol.Should().Be("Cu");
        comparison.DensestSymbol.Should().Be("Au");
    }

    [Fact]
    public void Neighbors_ReturnsPeriodAndGroupAdjacentCells()
    {
        var all = Sample();
        var ag = all.First(e => e.Symbol == "Ag");

        // Same group 11: Cu (period 4) and Au (period 6) are vertical neighbours of Ag (period 5).
        var neighbors = ElementAnalytics.Neighbors(all, ag).Select(e => e.Symbol).ToList();

        neighbors.Should().Contain("Cu");
        neighbors.Should().Contain("Au");
        neighbors.Should().NotContain("Ag");
    }

    [Fact]
    public void Related_ReturnsSameCategoryNearestByAtomicNumber()
    {
        var all = Sample();
        var au = all.First(e => e.Symbol == "Au"); // atomic 79, transition metal

        var related = ElementAnalytics.Related(all, au, count: 2).Select(e => e.Symbol).ToList();

        related.Should().HaveCount(2);
        related.Should().NotContain("Au");
        related.First().Should().Be("Ag"); // 47 is nearest to 79 among {47,29,26}
    }
}
