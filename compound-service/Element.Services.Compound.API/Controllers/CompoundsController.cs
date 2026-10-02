using Element.Services.Compound.API.DTOs;
using Element.Services.Compound.Infrastructure.Entities;
using Element.Services.Compound.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;

namespace Element.Services.Compound.API.Controllers;

/// <summary>
/// Educational compound catalogue (v1): compounds, allotropes and gram preparations that
/// belong to a parent element. Prices are not stored here; clients multiply the element price
/// by <c>priceMult</c> and <c>gramsPerUnit</c>.
/// </summary>
[ApiController]
[Route("api/v1/compounds")]
[ResponseCache(Duration = 300)] // rows are seeded from compounds.json at startup; no live prices here
public class CompoundsController : ControllerBase
{
    private const int DefaultPageSize = 40;
    private const int MaxPageSize = 100;
    private const int MaxSearchLength = 120;

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
        [FromQuery] int pageSize = DefaultPageSize,
        CancellationToken ct = default)
    {
        if (q?.Length > MaxSearchLength)
        {
            return BadRequest("q must not exceed 120 characters.");
        }

        page = Math.Max(page, 1);
        pageSize = NormalizePageSize(pageSize);

        var matchingCompounds = await _repository.QueryAsync(element, kind, q, ct);
        var totalCount = matchingCompounds.Count;
        var totalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)pageSize));
        var pageItems = matchingCompounds
            // long math: (page - 1) * pageSize overflows for huge page values.
            .Skip((int)Math.Min((long)(page - 1) * pageSize, int.MaxValue))
            .Take(pageSize)
            .Select(Map)
            .ToList();

        var baseUrl = PublicBaseUrl.Resolve(Request, _configuration);
        var linkQueryPrefix = BuildFilterQueryPrefix(element, kind, q);
        string PageLink(int targetPage) =>
            $"{baseUrl}/api/v1/compounds{linkQueryPrefix}page={targetPage}&pageSize={pageSize}";

        return Ok(new PaginatedResponse<CompoundResponseDto>
        {
            Info = new PaginationInfo
            {
                Count = totalCount,
                Pages = totalPages,
                Next = page < totalPages ? PageLink(page + 1) : null,
                Prev = page > 1 ? PageLink(page - 1) : null
            },
            Results = pageItems
        });
    }

    /// <summary>Single compound by slug (e.g. aucl3, elemental-au).</summary>
    [HttpGet("{slug}")]
    [ProducesResponseType(typeof(CompoundResponseDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Get(string slug, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return BadRequest("Slug is required.");
        }

        var compound = await _repository.GetBySlugAsync(slug, ct);
        if (compound is null)
        {
            return NotFound($"Compound '{slug}' was not found.");
        }

        return Ok(Map(compound));
    }

    /// <summary>Convenience: compounds whose parent is this element symbol.</summary>
    [HttpGet("/api/v1/elements/{symbol}/compounds")]
    [ProducesResponseType(typeof(IEnumerable<CompoundResponseDto>), 200)]
    public async Task<IActionResult> ForElement(string symbol, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            return BadRequest("Symbol is required.");
        }

        var compounds = await _repository.QueryAsync(symbol, null, null, ct);
        return Ok(compounds.Select(Map));
    }

    /// <summary>Non-positive sizes fall back to the default; sizes above the maximum are capped.</summary>
    private static int NormalizePageSize(int pageSize)
    {
        if (pageSize < 1)
        {
            return DefaultPageSize;
        }

        return Math.Min(pageSize, MaxPageSize);
    }

    /// <summary>
    /// Repeats the active filters in paging links: returns "?" with no filters,
    /// otherwise "?element=..&amp;kind=..&amp;q=..&amp;" ready for the page parameters.
    /// </summary>
    private static string BuildFilterQueryPrefix(string? element, string? kind, string? search)
    {
        var filters = new List<string>();
        if (!string.IsNullOrWhiteSpace(element))
        {
            filters.Add($"element={Uri.EscapeDataString(element)}");
        }

        if (!string.IsNullOrWhiteSpace(kind))
        {
            filters.Add($"kind={Uri.EscapeDataString(kind)}");
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            filters.Add($"q={Uri.EscapeDataString(search)}");
        }

        if (filters.Count == 0)
        {
            return "?";
        }

        return "?" + string.Join("&", filters) + "&";
    }

    private static CompoundResponseDto Map(ChemicalCompound compound) => new()
    {
        Id = compound.Id,
        Slug = compound.Slug,
        Formula = compound.Formula,
        Name = compound.Name,
        NameTr = compound.NameTr,
        Kind = compound.Kind,
        ElementSymbol = compound.ElementSymbol,
        GramsPerUnit = compound.GramsPerUnit,
        PriceMult = compound.PriceMult,
        Summary = compound.Summary,
        ImageUrl = compound.ImageUrl,
        Properties = CompoundPropertyCatalog.Get(compound.Slug)
    };
}
