using Element.Services.Element.Core.Domain;
using FluentAssertions;

namespace Element.Services.UnitTests.Element;

public class MarketMakerTests
{
    [Fact]
    public void Quotes_ApplyDefaultSpread()
    {
        var (bid, ask) = MarketMaker.Quotes(100m, 0.008m);
        bid.Should().Be(99.2m);
        ask.Should().Be(100.8m);
    }

    [Fact]
    public void NextLast_BuyIsCappedAt3Percent()
    {
        var next = MarketMaker.NextLast(100m, 1000m, 100m, buy: true);
        next.Should().Be(103m);
    }

    [Fact]
    public void NextLast_SellMovesDown()
    {
        var next = MarketMaker.NextLast(100m, 10m, 1000m, buy: false);
        next.Should().Be(99.96m);
    }

    [Fact]
    public void ChangePct_NullWhenNoHistory()
    {
        MarketMaker.ChangePct(100m, null).Should().BeNull();
    }
}
