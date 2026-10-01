using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Persistence;

namespace Element.Services.Element.API.DTOs;

/// <summary>
/// Turns a stored element into its public v1 response. Sourced reference values from
/// element-properties.json win over the older seed numbers in the database.
/// </summary>
public static class ElementDtoMapper
{
    // Free shipping is shown when 10 g of the element costs at least 120 KREDI.
    private const decimal FreeShippingSampleGrams = 10;
    private const decimal FreeShippingMinimumKredi = 120;

    /// <summary>Builds the response DTO; <paramref name="baseUrl"/> is the public origin used for every link.</summary>
    public static ElementResponseDto ToDto(ChemicalElement element, string baseUrl)
    {
        var reference = ElementPropertyCatalog.Get(element.Symbol);

        return new ElementResponseDto
        {
            Id = element.Id,
            Symbol = element.Symbol,
            Name = element.Name,
            AtomicNumber = element.AtomicNumber,
            AtomicMass = reference?.AtomicMass ?? element.AtomicMass,
            Category = element.Category,
            Phase = element.Phase,
            Color = element.Color,
            Density = reference?.Density,
            MeltingPoint = reference?.MeltingPoint,
            BoilingPoint = reference?.BoilingPoint,
            DiscoveredBy = element.DiscoveredBy,
            YearDiscovered = reference?.YearDiscovered,
            ElectronConfiguration = reference?.ElectronConfiguration,
            Period = element.Period,
            Group = element.Group,
            Detail = new ElementDetailInfo
            {
                NameTr = string.IsNullOrWhiteSpace(element.NameTr) ? element.Name : element.NameTr,
                Summary = element.Summary,
                Appearance = element.Appearance,
                Uses = element.Uses,
                Block = ElementDetailSeeder.ResolveBlock(element),
                Electronegativity = reference?.Electronegativity
            },
            Media = new ElementMediaInfo
            {
                ImageUrl = element.ImageUrl,
                ThumbnailUrl = element.ImageUrl
            },
            Commerce = new ElementCommerceInfo
            {
                SellerName = element.SellerName,
                Rating = element.Rating,
                ReviewCount = element.ReviewCount,
                Badge = element.Badge,
                FreeShippingEligible = element.PricePerGram * FreeShippingSampleGrams >= FreeShippingMinimumKredi
            },
            Market = new ElementMarketInfo
            {
                PricePerGram = element.PricePerGram,
                StockWeightGrams = element.StockWeightGrams,
                AvailableStock = element.AvailableStock
            },
            Links = BuildLinks(element, baseUrl)
        };
    }

    private static Dictionary<string, string> BuildLinks(ChemicalElement element, string baseUrl)
    {
        var symbolSlug = element.Symbol.ToLowerInvariant();
        var categorySlug = element.Category
            .ToLowerInvariant()
            .Replace(" ", "-")
            .Replace(",", "");

        return new Dictionary<string, string>
        {
            { "self", $"{baseUrl}/api/v1/elements/{symbolSlug}" },
            { "history", $"{baseUrl}/api/v1/elements/{symbolSlug}/history" },
            { "ticker", $"{baseUrl}/api/v1/elements/{symbolSlug}/ticker" },
            { "compounds", $"{baseUrl}/api/v1/compounds?element={symbolSlug}" },
            { "category", $"{baseUrl}/api/v1/categories/{categorySlug}" },
            { "scientificSource", $"https://pubchem.ncbi.nlm.nih.gov/element/{element.AtomicNumber}" }
        };
    }
}
