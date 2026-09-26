namespace Element.Services.Element.Core.Domain;

public static class MarketMaker
{
    public const decimal ImpactK = 0.04m;
    public const decimal ImpactCap = 0.03m;
    public const decimal DefaultSpreadPct = 0.008m;

    public static decimal NextLast(decimal last, decimal grams, decimal depthGrams, bool buy)
    {
        if (last <= 0) return 0.0001m;
        var depth = depthGrams > 0 ? depthGrams : grams;
        if (depth <= 0) return Math.Max(0.0001m, last);
        var factor = Math.Min(ImpactCap, ImpactK * (grams / depth));
        var next = buy ? last * (1 + factor) : last * (1 - factor);
        return Math.Max(0.0001m, Math.Round(next, 4));
    }

    public static (decimal Bid, decimal Ask) Quotes(decimal last, decimal spreadPct)
    {
        var spread = spreadPct > 0 ? spreadPct : DefaultSpreadPct;
        return (
            Math.Round(last * (1 - spread), 4),
            Math.Round(last * (1 + spread), 4)
        );
    }

    public static decimal? ChangePct(decimal last, decimal? first)
    {
        if (first is null or 0) return null;
        return Math.Round((last - first.Value) / first.Value * 100m, 4);
    }
}
