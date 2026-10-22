namespace Element.Services.Element.Core.Domain;

/// <summary>
/// House market maker for the simulated KREDI market: moves the last price after a trade
/// and derives bid/ask quotes, so every service prices elements with the same rules.
/// </summary>
public static class MarketMaker
{
    /// <summary>Price impact per unit of "traded grams / market depth".</summary>
    public const decimal ImpactK = 0.04m;

    /// <summary>Largest price move a single trade may cause (3%).</summary>
    public const decimal ImpactCap = 0.03m;

    /// <summary>Spread used when configuration does not provide a positive one (0.8%).</summary>
    public const decimal DefaultSpreadPct = 0.008m;

    /// <summary>Prices never drop below this floor so a symbol can never become free.</summary>
    public const decimal MinimumPrice = 0.0001m;

    /// <summary>Display currency of every simulated price.</summary>
    public const string Currency = "KREDI";

    /// <summary>Tells API clients that prices come from the simulator, not a real exchange.</summary>
    public const string SimulatedPriceSource = "simulation";

    private const int PriceDecimals = 4;

    /// <summary>
    /// Returns the new last price after a trade of <paramref name="grams"/>: buys push the price up,
    /// sells push it down, proportionally to the trade size versus the market depth.
    /// </summary>
    public static decimal NextLast(decimal last, decimal grams, decimal depthGrams, bool buy)
    {
        if (last <= 0)
        {
            return MinimumPrice;
        }

        var depth = depthGrams > 0 ? depthGrams : grams;
        if (depth <= 0)
        {
            return Math.Max(MinimumPrice, last);
        }

        var impact = Math.Min(ImpactCap, ImpactK * (grams / depth));
        var nextPrice = buy
            ? last * (1 + impact)
            : last * (1 - impact);

        return Math.Max(MinimumPrice, Math.Round(nextPrice, PriceDecimals));
    }

    /// <summary>Builds the bid and ask quotes around the last price using the given spread.</summary>
    public static (decimal Bid, decimal Ask) Quotes(decimal last, decimal spreadPct)
    {
        var spread = spreadPct > 0 ? spreadPct : DefaultSpreadPct;
        var bid = Math.Round(last * (1 - spread), PriceDecimals);
        var ask = Math.Round(last * (1 + spread), PriceDecimals);
        return (bid, ask);
    }

    /// <summary>Percentage change from <paramref name="first"/> to <paramref name="last"/>; null when there is no usable start price.</summary>
    public static decimal? ChangePct(decimal last, decimal? first)
    {
        if (first is null or 0)
        {
            return null;
        }

        var change = (last - first.Value) / first.Value * 100m;
        return Math.Round(change, PriceDecimals);
    }
}
