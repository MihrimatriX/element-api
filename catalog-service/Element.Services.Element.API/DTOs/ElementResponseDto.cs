using Element.Services.Element.Core.Domain;
using Element.Services.Element.Infrastructure.Persistence;

namespace Element.Services.Element.API.DTOs;

// Property order in these classes is the JSON field order clients see; keep it stable.

/// <summary>Simulated market block of an element: price per gram and stock in grams.</summary>
public class ElementMarketInfo
{
    public decimal PricePerGram { get; set; }
    public decimal StockWeightGrams { get; set; }
    public decimal AvailableStock { get; set; }
    public string Currency { get; set; } = MarketMaker.Currency;
    public string PriceSource { get; set; } = MarketMaker.SimulatedPriceSource;
}

/// <summary>Image links of an element.</summary>
public class ElementMediaInfo
{
    public string ImageUrl { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
}

/// <summary>Simulated shop metadata (seller, rating, badge); nothing here is a real offer.</summary>
public class ElementCommerceInfo
{
    public string SellerName { get; set; } = string.Empty;
    public decimal Rating { get; set; }
    public int ReviewCount { get; set; }
    public string? Badge { get; set; }
    public string DeliveryNote { get; set; } = "Deneme siparişi; gerçek gönderim yapılmaz.";
    public bool IsSimulated { get; set; } = true;
    public bool FreeShippingEligible { get; set; }
}

/// <summary>Turkish display texts and derived details (block, electronegativity).</summary>
public class ElementDetailInfo
{
    public string NameTr { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string? Appearance { get; set; }
    public string? Uses { get; set; }
    public string Block { get; set; } = "s";
    public decimal? Electronegativity { get; set; }
}

/// <summary>Public v1 shape of one element: reference data, units, detail, media, commerce, market and links.</summary>
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

    public Dictionary<string, string> Units { get; set; } = new()
    {
        ["atomicMass"] = "u",
        ["density"] = "g/cm3",
        ["meltingPoint"] = "K",
        ["boilingPoint"] = "K",
        ["quantity"] = "g",
        ["electronegativity"] = "Pauling"
    };

    public string DataNote { get; set; } = "Reference data; some superheavy-element values are predictions. Market prices and stock are simulated.";
    public string SourceUrl { get; set; } = ElementPropertyCatalog.Reference.SourceUrl;
    public string RetrievedAt { get; set; } = ElementPropertyCatalog.Reference.RetrievedAt;
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
