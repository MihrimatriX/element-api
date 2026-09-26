using System;

namespace Element.Services.Element.Core.Entities;

public class ElementCategory
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;       // e.g. "Noble Gas"
    public string Slug { get; set; } = string.Empty;       // e.g. "noble-gas"
    public string Description { get; set; } = string.Empty;
}
