namespace Element.Services.Compound.Infrastructure.Entities;

public class ChemicalCompound
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
}
