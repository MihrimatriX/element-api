using System;
using System.Collections.Generic;
using System.Linq;
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
    public static IReadOnlyList<ChemicalElement> Query(IEnumerable<ChemicalElement> source, ElementFilter filter)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentNullException.ThrowIfNull(filter);

        var matched = source.Where(filter.Matches);

        var ordered = filter.Descending
            ? matched.OrderByDescending(filter.SortKey).ThenBy(e => e.AtomicNumber)
            : matched.OrderBy(filter.SortKey).ThenBy(e => e.AtomicNumber);

        return ordered.ToList();
    }

    public static ElementStatistics ComputeStatistics(IReadOnlyCollection<ChemicalElement> elements)
    {
        ArgumentNullException.ThrowIfNull(elements);

        if (elements.Count == 0)
        {
            var empty = new Dictionary<string, int>();
            return new ElementStatistics(0, 0m, 0m, null, null, null, null, 0m, empty, empty, empty);
        }

        var prices = elements.Select(e => e.PricePerGram).OrderBy(p => p).ToList();
        var cheapest = elements.MinBy(e => e.PricePerGram)!;
        var dearest = elements.MaxBy(e => e.PricePerGram)!;
        var heaviest = elements.MaxBy(e => e.AtomicMass)!;
        var withMelt = elements.Where(e => e.MeltingPoint.HasValue).ToList();
        var hottest = withMelt.Count > 0 ? withMelt.MaxBy(e => e.MeltingPoint!.Value) : null;

        return new ElementStatistics(
            Count: elements.Count,
            AveragePrice: Math.Round(elements.Average(e => e.PricePerGram), 4),
            MedianPrice: Median(prices),
            Cheapest: new ElementRef(cheapest.Symbol, cheapest.Name, cheapest.PricePerGram),
            MostExpensive: new ElementRef(dearest.Symbol, dearest.Name, dearest.PricePerGram),
            Heaviest: new ElementRef(heaviest.Symbol, heaviest.Name, heaviest.AtomicMass),
            HighestMelting: hottest is null ? null : new ElementRef(hottest.Symbol, hottest.Name, hottest.MeltingPoint!.Value),
            TotalAvailableStock: elements.Sum(e => e.AvailableStock),
            CountByCategory: GroupCount(elements, e => e.Category),
            CountByPhase: GroupCount(elements, e => string.IsNullOrWhiteSpace(e.Phase) ? "unknown" : e.Phase),
            CountByBlock: GroupCount(elements, e => string.IsNullOrWhiteSpace(e.Block) ? "?" : e.Block));
    }

    public static ElementComparison Compare(IReadOnlyList<ChemicalElement> elements)
    {
        ArgumentNullException.ThrowIfNull(elements);

        var symbols = elements.Select(e => e.Symbol).ToList();
        if (elements.Count == 0)
            return new ElementComparison(symbols, null, null, null, null, null, null);

        var withMelt = elements.Where(e => e.MeltingPoint.HasValue).ToList();
        var withDensity = elements.Where(e => e.Density.HasValue).ToList();

        return new ElementComparison(
            Symbols: symbols,
            CheapestSymbol: elements.MinBy(e => e.PricePerGram)!.Symbol,
            MostExpensiveSymbol: elements.MaxBy(e => e.PricePerGram)!.Symbol,
            HeaviestSymbol: elements.MaxBy(e => e.AtomicMass)!.Symbol,
            LightestSymbol: elements.MinBy(e => e.AtomicMass)!.Symbol,
            HighestMeltingSymbol: withMelt.Count > 0 ? withMelt.MaxBy(e => e.MeltingPoint!.Value)!.Symbol : null,
            DensestSymbol: withDensity.Count > 0 ? withDensity.MaxBy(e => e.Density!.Value)!.Symbol : null);
    }

    /// <summary>
    /// Direct periodic-table neighbours of <paramref name="target"/>: the cells
    /// immediately left/right in the same period and up/down in the same group.
    /// </summary>
    public static IReadOnlyList<ChemicalElement> Neighbors(IEnumerable<ChemicalElement> all, ChemicalElement target)
    {
        ArgumentNullException.ThrowIfNull(all);
        ArgumentNullException.ThrowIfNull(target);

        var list = all.ToList();
        var result = new List<ChemicalElement>();

        void Add(ChemicalElement? e)
        {
            if (e is not null && e.Symbol != target.Symbol && !result.Contains(e)) result.Add(e);
        }

        Add(list.FirstOrDefault(e => e.Period == target.Period && e.Group == target.Group - 1));
        Add(list.FirstOrDefault(e => e.Period == target.Period && e.Group == target.Group + 1));
        Add(list.FirstOrDefault(e => e.Group == target.Group && e.Period == target.Period - 1));
        Add(list.FirstOrDefault(e => e.Group == target.Group && e.Period == target.Period + 1));

        return result;
    }

    /// <summary>Same-category elements closest by atomic number, nearest first.</summary>
    public static IReadOnlyList<ChemicalElement> Related(IEnumerable<ChemicalElement> all, ChemicalElement target, int count)
    {
        ArgumentNullException.ThrowIfNull(all);
        ArgumentNullException.ThrowIfNull(target);

        return all
            .Where(e => e.Symbol != target.Symbol &&
                        string.Equals(e.Category, target.Category, StringComparison.OrdinalIgnoreCase))
            .OrderBy(e => Math.Abs(e.AtomicNumber - target.AtomicNumber))
            .ThenBy(e => e.AtomicNumber)
            .Take(Math.Max(0, count))
            .ToList();
    }

    private static decimal Median(IReadOnlyList<decimal> sorted)
    {
        if (sorted.Count == 0) return 0m;
        var mid = sorted.Count / 2;
        return sorted.Count % 2 == 1
            ? sorted[mid]
            : Math.Round((sorted[mid - 1] + sorted[mid]) / 2m, 4);
    }

    private static IReadOnlyDictionary<string, int> GroupCount(
        IEnumerable<ChemicalElement> elements, Func<ChemicalElement, string> key) =>
        elements.GroupBy(key).OrderByDescending(g => g.Count())
            .ToDictionary(g => g.Key, g => g.Count());
}
