namespace Element.Services.Element.API.DTOs;

/// <summary>Paging block of a list response: total count, page count and ready-to-follow next/prev links.</summary>
public class PaginationInfo
{
    public int Count { get; set; }
    public int Pages { get; set; }
    public string? Next { get; set; }
    public string? Prev { get; set; }
}

/// <summary>SWAPI-style list envelope: <c>info</c> for paging plus the <c>results</c> of the current page.</summary>
public class PaginatedResponse<T>
{
    public PaginationInfo Info { get; set; } = new();
    public IEnumerable<T> Results { get; set; } = [];
}
