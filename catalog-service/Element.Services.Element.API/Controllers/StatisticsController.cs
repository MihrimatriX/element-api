using Element.Services.Element.Core.Domain;
using Element.Services.Element.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;

namespace Element.Services.Element.API.Controllers;

/// <summary>
/// Aggregate analytics over the element catalogue: counts by category/phase/block,
/// price distribution and per-metric leaders.
/// </summary>
[ApiController]
[Route("api/v1/statistics")]
[ResponseCache(Duration = 5)]
public class StatisticsController : ControllerBase
{
    private readonly EfElementRepository _repository;

    public StatisticsController(EfElementRepository repository) => _repository = repository;

    /// <summary>Catalogue-wide statistics.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ElementStatistics), 200)]
    public async Task<IActionResult> GetOverview(CancellationToken ct = default)
    {
        var allElements = await _repository.GetAllAsync(ct);
        return Ok(ElementAnalytics.ComputeStatistics(allElements));
    }

    /// <summary>Statistics restricted to a single category (partial, case-insensitive match on the category name).</summary>
    [HttpGet("category/{name}")]
    [ProducesResponseType(typeof(ElementStatistics), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetByCategory(string name, CancellationToken ct = default)
    {
        var allElements = await _repository.GetAllAsync(ct);
        var categoryElements = ElementAnalytics.Query(allElements, new ElementFilter { Category = name });
        if (categoryElements.Count == 0)
        {
            return NotFound($"No elements found for category '{name}'.");
        }

        return Ok(ElementAnalytics.ComputeStatistics(categoryElements));
    }
}
