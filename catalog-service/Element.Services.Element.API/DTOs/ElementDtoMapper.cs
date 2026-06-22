using System;
using System.Collections.Generic;
using Element.Services.Element.Core.Entities;

namespace Element.Services.Element.API.DTOs;

public static class ElementDtoMapper
{
    public static ElementResponseDto ToDto(ChemicalElement element, string baseUrl)
    {
        var slug = element.Symbol.ToLowerInvariant();
        var catSlug = element.Category.ToLowerInvariant().Replace(" ", "-").Replace(",", "");

        return new ElementResponseDto
        {
            Id = element.Id,
            Symbol = element.Symbol,
            Name = element.Name,
            AtomicNumber = element.AtomicNumber,
            AtomicMass = element.AtomicMass,
            Category = element.Category,
            Phase = element.Phase,
            Color = element.Color,
            Density = element.Density,
            MeltingPoint = element.MeltingPoint,
            BoilingPoint = element.BoilingPoint,
            DiscoveredBy = element.DiscoveredBy,
            YearDiscovered = element.YearDiscovered,
            ElectronConfiguration = element.ElectronConfiguration,
            Period = element.Period,
            Group = element.Group,
            Detail = new ElementDetailInfo
            {
                NameTr = string.IsNullOrWhiteSpace(element.NameTr) ? element.Name : element.NameTr,
                Summary = element.Summary,
                Appearance = element.Appearance,
                Uses = element.Uses,
                Block = element.Block,
                Electronegativity = element.Electronegativity
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
                DeliveryNote = element.Category.Contains("actinide", StringComparison.OrdinalIgnoreCase)
                    ? "Kontrollü teslimat"
                    : "Yarın kapında",
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
                { "category", $"{baseUrl}/api/v1/categories/{catSlug}" }
            }
        };
    }
}
