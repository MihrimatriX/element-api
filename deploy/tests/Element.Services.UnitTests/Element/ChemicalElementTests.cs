using Element.Services.Element.Core.Domain;
using Element.Services.Element.Core.Entities;
using FluentAssertions;

namespace Element.Services.UnitTests.Element;

/// <summary>Price rules of the element aggregate: trades and simulator ticks move the last price, never below the floor.</summary>
public class ChemicalElementTests
{
    private static readonly DateTime Now = new(2026, 10, 22, 12, 0, 0, DateTimeKind.Utc);

    private static ChemicalElement Gold(decimal price = 100m, decimal stock = 1000m) =>
        new() { Symbol = "Au", PricePerGram = price, StockWeightGrams = stock };

    [Fact]
    public void RecordTrade_Buy_PushesPriceUp_AndReturnsTheHistoryPoint()
    {
        var gold = Gold();

        var point = gold.RecordTrade(10m, buy: true, Now);

        gold.PricePerGram.Should().Be(100.04m);
        point.ElementSymbol.Should().Be("Au");
        point.Price.Should().Be(100.04m);
        point.Timestamp.Should().Be(Now);
        point.Id.Should().NotBeEmpty();
    }

    [Fact]
    public void RecordTrade_Sell_PushesPriceDown()
    {
        var gold = Gold();

        gold.RecordTrade(10m, buy: false, Now);

        gold.PricePerGram.Should().Be(99.96m);
    }

    [Fact]
    public void RecordTrade_LargerThanStock_UsesTheTradeAsDepth_SoTheMoveIsCapped()
    {
        var gold = Gold(stock: 0m);

        gold.RecordTrade(500m, buy: true, Now);

        gold.PricePerGram.Should().Be(100m * (1 + MarketMaker.ImpactCap));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void RecordTrade_RejectsNonPositiveGrams(decimal grams)
    {
        var gold = Gold();

        var act = () => gold.RecordTrade(grams, buy: true, Now);

        act.Should().Throw<ArgumentOutOfRangeException>();
        gold.PricePerGram.Should().Be(100m);
    }

    [Fact]
    public void Tick_MovesPriceByTheFraction_RoundedToFourDecimals()
    {
        var gold = Gold(price: 1.23456m);

        var point = gold.Tick(0.001m, Now);

        gold.PricePerGram.Should().Be(1.2358m);
        point!.Price.Should().Be(1.2358m);
    }

    [Fact]
    public void Tick_ThatWouldReachTheFloor_IsSkipped()
    {
        var dust = Gold(price: MarketMaker.MinimumPrice);

        var point = dust.Tick(-0.004m, Now);

        point.Should().BeNull();
        dust.PricePerGram.Should().Be(MarketMaker.MinimumPrice);
    }
}
