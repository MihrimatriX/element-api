namespace Element.Services.Compound.API.DTOs;

public class PaginationInfo
{
    public int Count { get; set; }
    public int Pages { get; set; }
    public string? Next { get; set; }
    public string? Prev { get; set; }
}

public class PaginatedResponse<T>
{
    public PaginationInfo Info { get; set; } = new();
    public IEnumerable<T> Results { get; set; } = [];
}

public sealed class CompoundResponseDto
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = "";
    public string Formula { get; set; } = "";
    public string Name { get; set; } = "";
    public string NameTr { get; set; } = "";
    public string Kind { get; set; } = "compound";
    public string ElementSymbol { get; set; } = "";
    public decimal GramsPerUnit { get; set; } = 1;
    public decimal PriceMult { get; set; } = 1;
    public string Summary { get; set; } = "";
    public string? ImageUrl { get; set; }
    public CompoundProperties? Properties { get; set; }
    public string PriceSource { get; set; } = "simulation";
    public string Currency { get; set; } = "KREDI";
}
