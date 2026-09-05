using System.Text.Json;

namespace Element.Services.Element.Infrastructure.Persistence;

public sealed record ElementProperties(decimal? AtomicMass, decimal? Electronegativity, decimal? Density,
    decimal? MeltingPoint, decimal? BoilingPoint, string? ElectronConfiguration, int? YearDiscovered);

public sealed record ElementReference(string SourceUrl, string RetrievedAt, Dictionary<string, ElementProperties> Elements);

public static class ElementPropertyCatalog
{
    public static readonly ElementReference Reference = JsonSerializer.Deserialize<ElementReference>(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Data", "element-properties.json")),
        new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
        ?? throw new InvalidDataException("Element reference data is missing.");

    public static ElementProperties? Get(string symbol) => Reference.Elements.GetValueOrDefault(symbol);
}
