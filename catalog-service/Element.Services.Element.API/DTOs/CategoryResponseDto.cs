namespace Element.Services.Element.API.DTOs;

/// <summary>Public shape of a category, with links to itself and to its elements.</summary>
public class CategoryResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Dictionary<string, string> Links { get; set; } = [];
}
