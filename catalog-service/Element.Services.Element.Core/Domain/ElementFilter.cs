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

    /// <summary>Turns the free-text <c>sort</c> query value into a sort key; unknown values sort by atomic number.</summary>
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

    /// <summary>Returns true when the element passes every filter that is set; unset filters are ignored.</summary>
    public bool Matches(ChemicalElement element)
    {
        if (element is null)
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(Category) &&
            !element.Category.Contains(Category.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(Block) &&
            !string.Equals(element.Block, Block.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(Phase) &&
            !string.Equals(element.Phase, Phase.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (Group.HasValue && element.Group != Group.Value)
        {
            return false;
        }

        if (Period.HasValue && element.Period != Period.Value)
        {
            return false;
        }

        if (MinPrice.HasValue && element.PricePerGram < MinPrice.Value)
        {
            return false;
        }

        if (MaxPrice.HasValue && element.PricePerGram > MaxPrice.Value)
        {
            return false;
        }

        if (InStockOnly == true && element.AvailableStock <= 0)
        {
            return false;
        }

        return MatchesSearch(element);
    }

    /// <summary>Sort key projection, used by <see cref="ElementAnalytics"/> for ordering.</summary>
    public IComparable SortKey(ChemicalElement element) => Sort switch
    {
        ElementSort.Name => element.Name,
        ElementSort.Price => element.PricePerGram,
        ElementSort.AtomicMass => element.AtomicMass,
        // Missing measurements sort as the smallest value so they stay together at one end.
        ElementSort.Density => element.Density ?? decimal.MinValue,
        ElementSort.MeltingPoint => element.MeltingPoint ?? decimal.MinValue,
        ElementSort.BoilingPoint => element.BoilingPoint ?? decimal.MinValue,
        ElementSort.Rating => element.Rating,
        _ => element.AtomicNumber
    };

    private bool MatchesSearch(ChemicalElement element)
    {
        if (string.IsNullOrWhiteSpace(Search))
        {
            return true;
        }

        var term = Search.Trim();
        var turkishName = element.NameTr ?? string.Empty;

        return element.Name.Contains(term, StringComparison.OrdinalIgnoreCase)
            || element.Symbol.Contains(term, StringComparison.OrdinalIgnoreCase)
            || turkishName.Contains(term, StringComparison.OrdinalIgnoreCase)
            || element.AtomicNumber.ToString().Contains(term, StringComparison.OrdinalIgnoreCase);
    }
}
