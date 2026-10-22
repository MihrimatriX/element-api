using System.Text.Json;

namespace Element.Services.Compound.API.DTOs;

/// <summary>Sourced molecular identity of a compound (formula, weight, IUPAC name, InChIKey, PubChem id).</summary>
public sealed record CompoundProperties(
    string MolecularFormula,
    decimal MolecularWeight,
    string MolecularWeightUnit,
    string IupacName,
    string InchiKey,
    int PubChemId,
    string SourceUrl,
    string RetrievedAt);

/// <summary>Loads Data/compound-properties.json once and looks up the sourced properties by compound slug.</summary>
public static class CompoundPropertyCatalog
{
    private static readonly IReadOnlyDictionary<string, CompoundProperties> PropertiesBySlug = Load();

    /// <summary>Returns the sourced properties of a compound, or null when the file has none for this slug.</summary>
    public static CompoundProperties? Get(string slug) => PropertiesBySlug.GetValueOrDefault(slug);

    private static IReadOnlyDictionary<string, CompoundProperties> Load()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Data", "compound-properties.json");
        var json = File.ReadAllText(path);
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

        return JsonSerializer.Deserialize<Dictionary<string, CompoundProperties>>(json, options) ?? [];
    }
}
