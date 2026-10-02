using Element.Services.Element.Core.Domain;

namespace Element.Services.Element.API.DTOs;

/// <summary>Response for the element comparison endpoint: the elements in request order plus per-metric winners.</summary>
public class ElementComparisonResponseDto
{
    public IReadOnlyList<ElementResponseDto> Elements { get; set; } = [];
    public ElementComparison? Comparison { get; set; }
}
