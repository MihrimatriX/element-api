using System;
using Element.Services.Element.Core.Entities;

namespace Element.Services.Element.Core.Domain;

/// <summary>
/// Sort keys callers may request on element collections.
/// </summary>
public enum ElementSort
{
    AtomicNumber,
    Name,
    Price,
    AtomicMass,
    Density,
    MeltingPoint,
    BoilingPoint,
    Rating
}

/// <summary>
/// Immutable query specification for chemical elements. A pure value object: it
/// knows how to decide whether a single element matches, and how to rank a pair,
/// so the same rules can be unit tested without a database.
/// </summary>
public sealed class ElementFilter
{
    public string? Category { get; init; }
    public string? Block { get; init; }
    public string? Phase { get; init; }
    public int? Group { get; init; }
    public int? Period { get; init; }
    public decimal? MinPrice { get; init; }
    public decimal? MaxPrice { get; init; }
    public bool? InStockOnly { get; init; }
    public string? Search { get; init; }
    public ElementSort Sort { get; init; } = ElementSort.AtomicNumber;
    public bool Descending { get; init; }

    public static ElementSort ParseSort(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "name" => ElementSort.Name,
        "price" or "priceper gram" or "pricepergram" => ElementSort.Price,
        "mass" or "atomicmass" => ElementSort.AtomicMass,
        "density" => ElementSort.Density,
        "melting" or "meltingpoint" => ElementSort.MeltingPoint,
        "boiling" or "boilingpoint" => ElementSort.BoilingPoint,
        "rating" => ElementSort.Rating,
        _ => ElementSort.AtomicNumber
    };

    public bool Matches(ChemicalElement e)
    {
        if (e is null) return false;

        if (!string.IsNullOrWhiteSpace(Category) &&
            !e.Category.Contains(Category.Trim(), StringComparison.OrdinalIgnoreCase))
            return false;

        if (!string.IsNullOrWhiteSpace(Block) &&
            !string.Equals(e.Block, Block.Trim(), StringComparison.OrdinalIgnoreCase))
            return false;

        if (!string.IsNullOrWhiteSpace(Phase) &&
            !string.Equals(e.Phase, Phase.Trim(), StringComparison.OrdinalIgnoreCase))
            return false;

        if (Group.HasValue && e.Group != Group.Value) return false;
        if (Period.HasValue && e.Period != Period.Value) return false;
        if (MinPrice.HasValue && e.PricePerGram < MinPrice.Value) return false;
        if (MaxPrice.HasValue && e.PricePerGram > MaxPrice.Value) return false;
        if (InStockOnly == true && e.AvailableStock <= 0) return false;

        if (!string.IsNullOrWhiteSpace(Search))
        {
            var term = Search.Trim();
            var hit = e.Name.Contains(term, StringComparison.OrdinalIgnoreCase)
                      || e.Symbol.Contains(term, StringComparison.OrdinalIgnoreCase)
                      || (e.NameTr?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false)
                      || e.AtomicNumber.ToString().Contains(term, StringComparison.OrdinalIgnoreCase);
            if (!hit) return false;
        }

        return true;
    }

    /// <summary>Sort key projection, used by <see cref="ElementAnalytics"/> for ordering.</summary>
    public IComparable SortKey(ChemicalElement e) => Sort switch
    {
        ElementSort.Name => e.Name,
        ElementSort.Price => e.PricePerGram,
        ElementSort.AtomicMass => e.AtomicMass,
        ElementSort.Density => e.Density ?? decimal.MinValue,
        ElementSort.MeltingPoint => e.MeltingPoint ?? decimal.MinValue,
        ElementSort.BoilingPoint => e.BoilingPoint ?? decimal.MinValue,
        ElementSort.Rating => e.Rating,
        _ => e.AtomicNumber
    };
}
