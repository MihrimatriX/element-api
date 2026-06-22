using System.Collections.Generic;

namespace Element.Services.Element.API.DTOs;

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
