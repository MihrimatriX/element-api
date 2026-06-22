using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Element.Services.Element.API.DTOs;
using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Element.API.Controllers;

/// <summary>
/// Manages chemical element categories and classification groups.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly ElementDbContext _context;

    public CategoriesController(ElementDbContext context)
    {
        _context = context;
    }

    private string GetBaseUrl()
    {
        var proto = Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? Request.Scheme;
        var host = Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? Request.Host.ToString();
        return $"{proto}://{host}";
    }

    private CategoryResponseDto MapToDto(ElementCategory cat)
    {
        var baseUrl = GetBaseUrl();
        return new CategoryResponseDto
        {
            Id = cat.Id,
            Name = cat.Name,
            Slug = cat.Slug,
            Description = cat.Description,
            Links = new Dictionary<string, string>
            {
                { "self", $"{baseUrl}/api/v1/categories/{cat.Slug}" },
                { "elements", $"{baseUrl}/api/v1/categories/{cat.Slug}/elements" }
            }
        };
    }

    private ElementResponseDto MapElementToDto(ChemicalElement element) =>
        ElementDtoMapper.ToDto(element, GetBaseUrl());

    /// <summary>
    /// Retrieves a list of all chemical element categories.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<CategoryResponseDto>), 200)]
    public async Task<IActionResult> GetAll()
    {
        var categories = await _context.Categories
            .OrderBy(c => c.Id)
            .ToListAsync();

        var dtos = categories.Select(MapToDto).ToList();
        return Ok(dtos);
    }

    /// <summary>
    /// Retrieves a specific category by its slug (e.g. 'noble-gas').
    /// </summary>
    [HttpGet("{slug}")]
    [ProducesResponseType(typeof(CategoryResponseDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug)) return BadRequest("Slug is required.");

        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.Slug.ToLower() == slug.ToLower());

        if (category == null)
        {
            return NotFound($"Category '{slug}' was not found.");
        }

        return Ok(MapToDto(category));
    }

    /// <summary>
    /// Retrieves all elements belonging to a specific category.
    /// </summary>
    [HttpGet("{slug}/elements")]
    [ProducesResponseType(typeof(PaginatedResponse<ElementResponseDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetElements(string slug, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (string.IsNullOrWhiteSpace(slug)) return BadRequest("Slug is required.");
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;

        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.Slug.ToLower() == slug.ToLower());

        if (category == null)
        {
            return NotFound($"Category '{slug}' was not found.");
        }

        // Search chemical elements matching category name
        var query = _context.ChemicalElements
            .Where(e => e.Category.ToLower() == category.Name.ToLower())
            .OrderBy(e => e.AtomicNumber);

        var totalCount = await query.CountAsync();
        var elements = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        var baseUrl = GetBaseUrl();
        var dtos = elements.Select(MapElementToDto).ToList();

        var response = new PaginatedResponse<ElementResponseDto>
        {
            Info = new PaginationInfo
            {
                Count = totalCount,
                Pages = totalPages,
                Next = page < totalPages ? $"{baseUrl}/api/v1/categories/{slug}/elements?page={page + 1}&pageSize={pageSize}" : null,
                Prev = page > 1 ? $"{baseUrl}/api/v1/categories/{slug}/elements?page={page - 1}&pageSize={pageSize}" : null
            },
            Results = dtos
        };

        return Ok(response);
    }
}
