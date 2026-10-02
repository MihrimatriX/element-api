using Element.Services.Element.API.DTOs;
using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Element.API.Controllers;

/// <summary>
/// Manages chemical element categories and classification groups.
/// Category rows are migration seed data (change only on deploy); element pages carry live prices.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[ResponseCache(Duration = 300)]
public class CategoriesController : ControllerBase
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    private readonly ElementDbContext _context;

    public CategoriesController(ElementDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Retrieves a list of all chemical element categories.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<CategoryResponseDto>), 200)]
    public async Task<IActionResult> GetAll()
    {
        var categories = await _context.Categories.AsNoTracking()
            .OrderBy(category => category.Id)
            .ToListAsync();

        var categoryDtos = categories.Select(MapToDto).ToList();
        return Ok(categoryDtos);
    }

    /// <summary>
    /// Retrieves a specific category by its slug (e.g. 'noble-gas').
    /// </summary>
    [HttpGet("{slug}")]
    [ProducesResponseType(typeof(CategoryResponseDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return BadRequest("Slug is required.");
        }

        var category = await FindCategoryAsync(slug);
        if (category is null)
        {
            return CategoryNotFound(slug);
        }

        return Ok(MapToDto(category));
    }

    /// <summary>
    /// Retrieves all elements belonging to a specific category.
    /// </summary>
    [HttpGet("{slug}/elements")]
    [ResponseCache(Duration = 5)]
    [ProducesResponseType(typeof(PaginatedResponse<ElementResponseDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetElements(string slug, [FromQuery] int page = 1, [FromQuery] int pageSize = DefaultPageSize)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return BadRequest("Slug is required.");
        }

        if (page < 1)
        {
            page = 1;
        }

        if (pageSize < 1)
        {
            pageSize = DefaultPageSize;
        }
        else if (pageSize > MaxPageSize)
        {
            pageSize = MaxPageSize;
        }

        var category = await FindCategoryAsync(slug);
        if (category is null)
        {
            return CategoryNotFound(slug);
        }

        // Elements store the category name as text, so the match is by name, not by id.
        var elementsInCategory = _context.ChemicalElements.AsNoTracking()
            .Where(element => element.Category.ToLower() == category.Name.ToLower())
            .OrderBy(element => element.AtomicNumber);

        var totalCount = await elementsInCategory.CountAsync();
        var pageElements = await elementsInCategory
            // long math: an int overflow here became a negative OFFSET, i.e. a Postgres error and a 500.
            .Skip((int)Math.Min((long)(page - 1) * pageSize, int.MaxValue))
            .Take(pageSize)
            .ToListAsync();

        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        var baseUrl = GetBaseUrl();
        string PageLink(int targetPage) =>
            $"{baseUrl}/api/v1/categories/{slug}/elements?page={targetPage}&pageSize={pageSize}";

        var response = new PaginatedResponse<ElementResponseDto>
        {
            Info = new PaginationInfo
            {
                Count = totalCount,
                Pages = totalPages,
                Next = page < totalPages ? PageLink(page + 1) : null,
                Prev = page > 1 ? PageLink(page - 1) : null
            },
            Results = pageElements.Select(element => ElementDtoMapper.ToDto(element, baseUrl)).ToList()
        };

        return Ok(response);
    }

    private string GetBaseUrl() => PublicBaseUrl.Resolve(Request);

    /// <summary>Case-insensitive, untracked slug lookup; null when no category has this slug.</summary>
    private Task<ElementCategory?> FindCategoryAsync(string slug)
    {
        return _context.Categories.AsNoTracking()
            .FirstOrDefaultAsync(category => category.Slug.ToLower() == slug.ToLower());
    }

    private NotFoundObjectResult CategoryNotFound(string slug) =>
        NotFound($"Category '{slug}' was not found.");

    private CategoryResponseDto MapToDto(ElementCategory category)
    {
        var baseUrl = GetBaseUrl();
        return new CategoryResponseDto
        {
            Id = category.Id,
            Name = category.Name,
            Slug = category.Slug,
            Description = category.Description,
            Links = new Dictionary<string, string>
            {
                { "self", $"{baseUrl}/api/v1/categories/{category.Slug}" },
                { "elements", $"{baseUrl}/api/v1/categories/{category.Slug}/elements" }
            }
        };
    }
}
