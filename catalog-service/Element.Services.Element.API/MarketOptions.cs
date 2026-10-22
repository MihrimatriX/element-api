using Element.Services.Element.Core.Domain;

namespace Element.Services.Element.API;

/// <summary>Market settings bound from the "Market" configuration section.</summary>
public sealed class MarketOptions
{
    public const string SectionName = "Market";

    /// <summary>Half-spread between last price and bid/ask, as a fraction (0.008 = 0.8%).</summary>
    public decimal SpreadPct { get; set; } = 0.008m;

    /// <summary>The configured spread, or the market maker default when the setting is zero or negative.</summary>
    public decimal EffectiveSpreadPct => SpreadPct > 0 ? SpreadPct : MarketMaker.DefaultSpreadPct;
}
