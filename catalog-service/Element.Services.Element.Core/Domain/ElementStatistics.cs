using System.Collections.Generic;

namespace Element.Services.Element.Core.Domain;

/// <summary>Lightweight reference to an element that wins/loses on some metric.</summary>
public sealed record ElementRef(string Symbol, string Name, decimal Value);

/// <summary>
/// Aggregate analytics over a set of elements. A value object computed by
/// <see cref="ElementAnalytics.ComputeStatistics"/>; carries no behaviour.
/// </summary>
public sealed record ElementStatistics(
    int Count,
    decimal AveragePrice,
    decimal MedianPrice,
    ElementRef? Cheapest,
    ElementRef? MostExpensive,
    ElementRef? Heaviest,
    ElementRef? HighestMelting,
    decimal TotalAvailableStock,
    IReadOnlyDictionary<string, int> CountByCategory,
    IReadOnlyDictionary<string, int> CountByPhase,
    IReadOnlyDictionary<string, int> CountByBlock);

/// <summary>Per-metric winners across an explicit comparison set.</summary>
public sealed record ElementComparison(
    IReadOnlyList<string> Symbols,
    string? CheapestSymbol,
    string? MostExpensiveSymbol,
    string? HeaviestSymbol,
    string? LightestSymbol,
    string? HighestMeltingSymbol,
    string? DensestSymbol);
