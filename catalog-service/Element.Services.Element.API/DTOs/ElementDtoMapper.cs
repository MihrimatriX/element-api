using System;
using System.Collections.Generic;
using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Persistence;

namespace Element.Services.Element.API.DTOs;

public static class ElementDtoMapper
{
    public static ElementResponseDto ToDto(ChemicalElement element, string baseUrl)
    {
        var slug = element.Symbol.ToLowerInvariant();
        var reference = ElementPropertyCatalog.Get(element.Symbol);
        var catSlug = element.Category.ToLowerInvariant().Replace(" ", "-").Replace(",", "");

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
                DeliveryNote = "Deneme siparişi; gerçek gönderim yapılmaz.",
                FreeShippingEligible = element.PricePerGram * 10 >= 120
            },
            Market = new ElementMarketInfo
            {
                PricePerGram = element.PricePerGram,
                StockWeightGrams = element.StockWeightGrams,
                AvailableStock = element.AvailableStock
            },
            Links = new Dictionary<string, string>
            {
                { "self", $"{baseUrl}/api/v1/elements/{slug}" },
                { "history", $"{baseUrl}/api/v1/elements/{slug}/history" },
                { "ticker", $"{baseUrl}/api/v1/elements/{slug}/ticker" },
                { "compounds", $"{baseUrl}/api/v1/compounds?element={slug}" },
                { "category", $"{baseUrl}/api/v1/categories/{catSlug}" },
                { "scientificSource", $"https://pubchem.ncbi.nlm.nih.gov/element/{element.AtomicNumber}" }
            }
        };
    }
}
