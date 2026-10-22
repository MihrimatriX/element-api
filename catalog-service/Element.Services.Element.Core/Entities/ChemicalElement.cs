using Element.Services.Element.Core.Domain;

namespace Element.Services.Element.Core.Entities;

/// <summary>
/// One periodic-table element as stored in the market database: reference data,
/// Turkish display texts, simulated commerce metadata and the simulated stock/price.
/// It is the aggregate for the price: every price move goes through <see cref="RecordTrade"/> or <see cref="Tick"/>.
/// </summary>
public class ChemicalElement
{
    public Guid Id { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string NameTr { get; set; } = string.Empty;
    public int AtomicNumber { get; set; }
    public decimal AtomicMass { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Phase { get; set; } = string.Empty;
    public string? Color { get; set; }
    public decimal? Density { get; set; }
    public decimal? MeltingPoint { get; set; }
    public decimal? BoilingPoint { get; set; }
    public string? DiscoveredBy { get; set; }
    public int? YearDiscovered { get; set; }
    public string? ElectronConfiguration { get; set; }
    public int Period { get; set; }
    public int Group { get; set; }
    public string Block { get; set; } = "s";
    public decimal? Electronegativity { get; set; }
    public string? Appearance { get; set; }
    public string? Uses { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string SellerName { get; set; } = "Elemental Resmi";
    public decimal Rating { get; set; } = 4.5m;
    public int ReviewCount { get; set; }
    public string? Badge { get; set; }
    public decimal PricePerGram { get; set; }
    public decimal StockWeightGrams { get; set; }
    public decimal ReservedWeightGrams { get; set; }

    /// <summary>Grams that can still be sold: total stock minus grams held for open orders.</summary>
    public decimal AvailableStock => StockWeightGrams - ReservedWeightGrams;

    /// <summary>
    /// Moves the last price after a house trade of <paramref name="grams"/> (a buy pushes it up, a sell down)
    /// and returns the new history point. The market depth is the stock, or the trade itself when it is larger.
    /// </summary>
    public ElementPriceHistory RecordTrade(decimal grams, bool buy, DateTime now)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(grams);

        var depth = Math.Max(StockWeightGrams, grams);
        PricePerGram = MarketMaker.NextLast(PricePerGram, grams, depth, buy);
        return PricePoint(now);
    }

    /// <summary>
    /// Simulator tick: moves the price by <paramref name="fraction"/> (0.004 = +0.4%), rounded to 4 decimals.
    /// Returns null and leaves the price alone when the move would reach the <see cref="MarketMaker.MinimumPrice"/> floor.
    /// </summary>
    public ElementPriceHistory? Tick(decimal fraction, DateTime now)
    {
        var next = Math.Round(PricePerGram + PricePerGram * fraction, 4);
        if (next <= MarketMaker.MinimumPrice)
        {
            return null;
        }

        PricePerGram = next;
        return PricePoint(now);
    }

    private ElementPriceHistory PricePoint(DateTime now) => new()
    {
        Id = Guid.NewGuid(),
        ElementSymbol = Symbol,
        Price = PricePerGram,
        Timestamp = now,
    };
}
