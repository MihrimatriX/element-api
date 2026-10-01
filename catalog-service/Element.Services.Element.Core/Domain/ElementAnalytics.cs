using Element.Services.Element.Core.Entities;

namespace Element.Services.Element.Core.Domain;

/// <summary>
/// Pure domain service: filtering, ranking, aggregate statistics, comparison and
/// periodic-table adjacency over chemical elements. Every method is deterministic
/// and side-effect free so it can be exercised directly in unit tests.
///
/// ponytail: operates on materialised in-memory collections rather than IQueryable.
/// The catalogue is a fixed ~119 rows, so this is intentionally simple; if the set
/// ever grew large, push filtering down into the repository/SQL instead.
/// </summary>
public static class ElementAnalytics
{
    private const int PriceDecimals = 4;
    private const string UnknownPhase = "unknown";
    private const string UnknownBlock = "?";

    /// <summary>Filters and sorts elements; ties are always broken by atomic number so paging is stable.</summary>
    public static IReadOnlyList<ChemicalElement> Query(IEnumerable<ChemicalElement> source, ElementFilter filter)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentNullException.ThrowIfNull(filter);

        var matched = source.Where(filter.Matches);

        var ordered = filter.Descending
            ? matched.OrderByDescending(filter.SortKey)
            : matched.OrderBy(filter.SortKey);

        return ordered
            .ThenBy(element => element.AtomicNumber)
            .ToList();
    }

    /// <summary>Computes counts, price averages and per-metric leaders for the given elements.</summary>
    public static ElementStatistics ComputeStatistics(IReadOnlyCollection<ChemicalElement> elements)
    {
        ArgumentNullException.ThrowIfNull(elements);

        if (elements.Count == 0)
        {
            var empty = new Dictionary<string, int>();
            return new ElementStatistics(0, 0m, 0m, null, null, null, null, 0m, empty, empty, empty);
        }

        var sortedPrices = elements
            .Select(element => element.PricePerGram)
            .OrderBy(price => price)
            .ToList();

        var cheapest = elements.MinBy(element => element.PricePerGram)!;
        var mostExpensive = elements.MaxBy(element => element.PricePerGram)!;
        var heaviest = elements.MaxBy(element => element.AtomicMass)!;
        var highestMelting = elements
            .Where(element => element.MeltingPoint.HasValue)
            .MaxBy(element => element.MeltingPoint!.Value);

        return new ElementStatistics(
            Count: elements.Count,
            AveragePrice: Math.Round(elements.Average(element => element.PricePerGram), PriceDecimals),
            MedianPrice: Median(sortedPrices),
            Cheapest: new ElementRef(cheapest.Symbol, cheapest.Name, cheapest.PricePerGram),
            MostExpensive: new ElementRef(mostExpensive.Symbol, mostExpensive.Name, mostExpensive.PricePerGram),
            Heaviest: new ElementRef(heaviest.Symbol, heaviest.Name, heaviest.AtomicMass),
            HighestMelting: highestMelting is null
                ? null
                : new ElementRef(highestMelting.Symbol, highestMelting.Name, highestMelting.MeltingPoint!.Value),
            TotalAvailableStock: elements.Sum(element => element.AvailableStock),
            CountByCategory: CountBy(elements, element => element.Category),
            CountByPhase: CountBy(elements, element => ValueOrDefault(element.Phase, UnknownPhase)),
            CountByBlock: CountBy(elements, element => ValueOrDefault(element.Block, UnknownBlock)));
    }

    /// <summary>Names the winner of each metric (cheapest, heaviest, densest, ...) within the given set.</summary>
    public static ElementComparison Compare(IReadOnlyList<ChemicalElement> elements)
    {
        ArgumentNullException.ThrowIfNull(elements);

        var symbols = elements.Select(element => element.Symbol).ToList();
        if (elements.Count == 0)
        {
            return new ElementComparison(symbols, null, null, null, null, null, null);
        }

        var highestMelting = elements
            .Where(element => element.MeltingPoint.HasValue)
            .MaxBy(element => element.MeltingPoint!.Value);
        var densest = elements
            .Where(element => element.Density.HasValue)
            .MaxBy(element => element.Density!.Value);

        return new ElementComparison(
            Symbols: symbols,
            CheapestSymbol: elements.MinBy(element => element.PricePerGram)!.Symbol,
            MostExpensiveSymbol: elements.MaxBy(element => element.PricePerGram)!.Symbol,
            HeaviestSymbol: elements.MaxBy(element => element.AtomicMass)!.Symbol,
            LightestSymbol: elements.MinBy(element => element.AtomicMass)!.Symbol,
            HighestMeltingSymbol: highestMelting?.Symbol,
            DensestSymbol: densest?.Symbol);
    }

    /// <summary>
    /// Direct periodic-table neighbours of <paramref name="target"/>: the cells
    /// immediately left/right in the same period and up/down in the same group.
    /// </summary>
    public static IReadOnlyList<ChemicalElement> Neighbors(IEnumerable<ChemicalElement> all, ChemicalElement target)
    {
        ArgumentNullException.ThrowIfNull(all);
        ArgumentNullException.ThrowIfNull(target);

        var elements = all.ToList();
        var neighbors = new List<ChemicalElement>();

        void AddIfNew(ChemicalElement? candidate)
        {
            if (candidate is null || candidate.Symbol == target.Symbol || neighbors.Contains(candidate))
            {
                return;
            }

            neighbors.Add(candidate);
        }

        ChemicalElement? FindCell(int period, int group) =>
            elements.FirstOrDefault(element => element.Period == period && element.Group == group);

        AddIfNew(FindCell(target.Period, target.Group - 1));
        AddIfNew(FindCell(target.Period, target.Group + 1));
        AddIfNew(FindCell(target.Period - 1, target.Group));
        AddIfNew(FindCell(target.Period + 1, target.Group));

        return neighbors;
    }

    /// <summary>Same-category elements closest by atomic number, nearest first.</summary>
    public static IReadOnlyList<ChemicalElement> Related(IEnumerable<ChemicalElement> all, ChemicalElement target, int count)
    {
        ArgumentNullException.ThrowIfNull(all);
        ArgumentNullException.ThrowIfNull(target);

        return all
            .Where(element => element.Symbol != target.Symbol)
            .Where(element => string.Equals(element.Category, target.Category, StringComparison.OrdinalIgnoreCase))
            .OrderBy(element => Math.Abs(element.AtomicNumber - target.AtomicNumber))
            .ThenBy(element => element.AtomicNumber)
            .Take(Math.Max(0, count))
            .ToList();
    }

    private static decimal Median(IReadOnlyList<decimal> sortedValues)
    {
        if (sortedValues.Count == 0)
        {
            return 0m;
        }

        var middle = sortedValues.Count / 2;
        var hasOddCount = sortedValues.Count % 2 == 1;
        if (hasOddCount)
        {
            return sortedValues[middle];
        }

        var middlePairAverage = (sortedValues[middle - 1] + sortedValues[middle]) / 2m;
        return Math.Round(middlePairAverage, PriceDecimals);
    }

    /// <summary>Counts elements per key, largest group first.</summary>
    private static IReadOnlyDictionary<string, int> CountBy(
        IEnumerable<ChemicalElement> elements,
        Func<ChemicalElement, string> keySelector)
    {
        return elements
            .GroupBy(keySelector)
            .OrderByDescending(group => group.Count())
            .ToDictionary(group => group.Key, group => group.Count());
    }

    private static string ValueOrDefault(string value, string fallback) =>
        string.IsNullOrWhiteSpace(value) ? fallback : value;
}
