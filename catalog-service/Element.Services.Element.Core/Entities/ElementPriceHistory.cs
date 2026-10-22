namespace Element.Services.Element.Core.Entities;

/// <summary>One recorded price point of an element; feeds price history, sparkline and 24h change.</summary>
public class ElementPriceHistory
{
    public Guid Id { get; set; }
    public string ElementSymbol { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTime Timestamp { get; set; }
}
