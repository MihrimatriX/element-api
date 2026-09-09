using Element.Services.Compound.API.DTOs;
using Element.Services.Compound.Infrastructure.Entities;
using Element.Services.Compound.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;

namespace Element.Services.Compound.API.Controllers;

[ApiController]
[Route("api/v1/compounds")]
public class CompoundsController : ControllerBase
{
    private readonly EfCompoundRepository _repository;
    private readonly IConfiguration _configuration;

    public CompoundsController(EfCompoundRepository repository, IConfiguration configuration)
    {
        _repository = repository;
        _configuration = configuration;
    }

    /// <summary>List compounds. Filter by parent element, kind, or free-text q.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PaginatedResponse<CompoundResponseDto>), 200)]
    public async Task<IActionResult> List(
        [FromQuery] string? element,
        [FromQuery] string? kind,
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 40,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize is < 1 or > 100) pageSize = pageSize < 1 ? 40 : 100;

        var all = await _repository.QueryAsync(element, kind, q, ct);
        var total = all.Count;
        var pages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var slice = all.Skip((page - 1) * pageSize).Take(pageSize).Select(Map).ToList();
        var baseUrl = PublicBaseUrl.Resolve(Request, _configuration);
        var qs = new List<string>();
        if (!string.IsNullOrWhiteSpace(element)) qs.Add($"element={Uri.EscapeDataString(element)}");
        if (!string.IsNullOrWhiteSpace(kind)) qs.Add($"kind={Uri.EscapeDataString(kind)}");
        if (!string.IsNullOrWhiteSpace(q)) qs.Add($"q={Uri.EscapeDataString(q)}");
        var prefix = qs.Count == 0 ? "?" : "?" + string.Join("&", qs) + "&";

        return Ok(new PaginatedResponse<CompoundResponseDto>
        {
            Info = new PaginationInfo
            {
                Count = total,
                Pages = pages,
                Next = page < pages ? $"{baseUrl}/api/v1/compounds{prefix}page={page + 1}&pageSize={pageSize}" : null,
                Prev = page > 1 ? $"{baseUrl}/api/v1/compounds{prefix}page={page - 1}&pageSize={pageSize}" : null
            },
            Results = slice
        });
    }

    /// <summary>Single compound by slug (e.g. aucl3, elemental-au).</summary>
    [HttpGet("{slug}")]
    [ProducesResponseType(typeof(CompoundResponseDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Get(string slug, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(slug)) return BadRequest("Slug is required.");
        var row = await _repository.GetBySlugAsync(slug, ct);
        if (row == null) return NotFound($"Compound '{slug}' was not found.");
        return Ok(Map(row));
    }

    /// <summary>Convenience: compounds whose parent is this element symbol.</summary>
    [HttpGet("/api/v1/elements/{symbol}/compounds")]
    [ProducesResponseType(typeof(IEnumerable<CompoundResponseDto>), 200)]
    public async Task<IActionResult> ForElement(string symbol, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(symbol)) return BadRequest("Symbol is required.");
        var rows = await _repository.QueryAsync(symbol, null, null, ct);
        return Ok(rows.Select(Map));
    }

    private static CompoundResponseDto Map(ChemicalCompound c) => new()
    {
        Id = c.Id,
        Slug = c.Slug,
        Formula = c.Formula,
        Name = c.Name,
        NameTr = c.NameTr,
        Kind = c.Kind,
        ElementSymbol = c.ElementSymbol,
        GramsPerUnit = c.GramsPerUnit,
        PriceMult = c.PriceMult,
        Summary = c.Summary,
        ImageUrl = c.ImageUrl,
        Properties = CompoundPropertyCatalog.Get(c.Slug)
    };
}
