namespace Element.Services.Compound.Infrastructure.Entities;

/// <summary>
/// A sellable learning product tied to one parent element: a compound (e.g. AuCl3),
/// an allotrope, or a plain gram preparation of the element itself.
/// </summary>
public class ChemicalCompound
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = "";
    public string Formula { get; set; } = "";
    public string Name { get; set; } = "";
    public string NameTr { get; set; } = "";

    /// <summary>"allotrope", "compound" or "preparation".</summary>
    public string Kind { get; set; } = "compound";

    /// <summary>Symbol of the parent element whose market price drives this product's price.</summary>
    public string ElementSymbol { get; set; } = "";

    /// <summary>Grams of the parent element in one unit of this product.</summary>
    public decimal GramsPerUnit { get; set; } = 1;

    /// <summary>Price multiplier applied on top of the parent element's price.</summary>
    public decimal PriceMult { get; set; } = 1;

    public string Summary { get; set; } = "";
    public string? ImageUrl { get; set; }
}
