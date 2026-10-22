using System.Text.Json;

namespace Element.Services.Element.Infrastructure.Persistence;

/// <summary>Reference physical values of one element, read from Data/element-properties.json.</summary>
public sealed record ElementProperties(
    decimal? AtomicMass,
    decimal? Electronegativity,
    decimal? Density,
    decimal? MeltingPoint,
    decimal? BoilingPoint,
    string? ElectronConfiguration,
    int? YearDiscovered);

/// <summary>Whole reference file: where the values came from, when, and the values per symbol.</summary>
public sealed record ElementReference(
    string SourceUrl,
    string RetrievedAt,
    Dictionary<string, ElementProperties> Elements);

/// <summary>
/// Loads the sourced reference values once at startup. The API prefers these values over
/// the older numbers in the database seed when it builds element responses.
/// </summary>
public static class ElementPropertyCatalog
{
    private static readonly string ReferenceFilePath =
        Path.Combine(AppContext.BaseDirectory, "Data", "element-properties.json");

    /// <summary>The parsed reference file; startup fails fast when the file is missing or empty.</summary>
    public static readonly ElementReference Reference = LoadReference();

    /// <summary>Returns the reference values for a symbol, or null when the file has none.</summary>
    public static ElementProperties? Get(string symbol) => Reference.Elements.GetValueOrDefault(symbol);

    private static ElementReference LoadReference()
    {
        var json = File.ReadAllText(ReferenceFilePath);
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

        return JsonSerializer.Deserialize<ElementReference>(json, options)
            ?? throw new InvalidDataException("Element reference data is missing.");
    }
}
