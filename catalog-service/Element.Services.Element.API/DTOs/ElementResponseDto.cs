using System;
using System.Collections.Generic;

namespace Element.Services.Element.API.DTOs;

public class ElementMarketInfo
{
    public decimal PricePerGram { get; set; }
    public decimal StockWeightGrams { get; set; }
    public decimal AvailableStock { get; set; }
    public string Currency { get; set; } = "ELX";
}

public class ElementMediaInfo
{
    public string ImageUrl { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
}

public class ElementCommerceInfo
{
    public string SellerName { get; set; } = string.Empty;
    public decimal Rating { get; set; }
    public int ReviewCount { get; set; }
    public string? Badge { get; set; }
    public string DeliveryNote { get; set; } = "Yarın kapında";
    public bool FreeShippingEligible { get; set; }
}

public class ElementDetailInfo
{
    public string NameTr { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string? Appearance { get; set; }
    public string? Uses { get; set; }
    public string Block { get; set; } = "s";
    public decimal? Electronegativity { get; set; }
}

public class ElementResponseDto
{
    public Guid Id { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int AtomicNumber { get; set; }
    public decimal AtomicMass { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Phase { get; set; } = string.Empty;
    public string? Color { get; set; }
    public decimal? Density { get; set; }
    public decimal? MeltingPoint { get; set; }
    public decimal? BoilingPoint { get; set; }
    public string? DiscoveredBy { get; set; }
    public int? YearDiscovered { get; set; }
    public string? ElectronConfiguration { get; set; }
    public int Period { get; set; }
    public int Group { get; set; }

    public ElementDetailInfo Detail { get; set; } = new();
    public ElementMediaInfo Media { get; set; } = new();
    public ElementCommerceInfo Commerce { get; set; } = new();
    public ElementMarketInfo Market { get; set; } = new();
    public Dictionary<string, string> Links { get; set; } = [];
}
