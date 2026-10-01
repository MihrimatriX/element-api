namespace Element.Services.Element.Core.Entities;

/// <summary>A periodic-table category (e.g. "noble gas") used to group elements and build category links.</summary>
public class ElementCategory
{
    public int Id { get; set; }

    /// <summary>Category name exactly as stored on elements, e.g. "noble gas".</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>URL-safe key, e.g. "noble-gas".</summary>
    public string Slug { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;
}
