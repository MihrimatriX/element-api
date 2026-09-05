using System.Text.Json;

namespace Element.Services.Compound.API.DTOs;

public sealed record CompoundProperties(
    string MolecularFormula, decimal MolecularWeight, string MolecularWeightUnit,
    string IupacName, string InchiKey, int PubChemId, string SourceUrl, string RetrievedAt);

public static class CompoundPropertyCatalog
{
    private static readonly IReadOnlyDictionary<string, CompoundProperties> Items = Load();
    private static IReadOnlyDictionary<string, CompoundProperties> Load()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Data", "compound-properties.json");
        return JsonSerializer.Deserialize<Dictionary<string, CompoundProperties>>(File.ReadAllText(path),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
    }
    public static CompoundProperties? Get(string slug) => Items.GetValueOrDefault(slug);
}
