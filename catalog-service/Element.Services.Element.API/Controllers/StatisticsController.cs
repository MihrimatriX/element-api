using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Element.Services.Element.Core.Abstractions;
using Element.Services.Element.Core.Domain;
using Microsoft.AspNetCore.Mvc;

namespace Element.Services.Element.API.Controllers;

/// <summary>
/// Aggregate analytics over the element catalogue: counts by category/phase/block,
/// price distribution and per-metric leaders.
/// </summary>
[ApiController]
[Route("api/v1/statistics")]
public class StatisticsController : ControllerBase
{
    private readonly IElementRepository _repository;

    public StatisticsController(IElementRepository repository) => _repository = repository;

    /// <summary>Catalogue-wide statistics.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ElementStatistics), 200)]
    public async Task<IActionResult> GetOverview(CancellationToken ct = default)
    {
        var all = await _repository.GetAllAsync(ct);
        return Ok(ElementAnalytics.ComputeStatistics(all));
    }

    /// <summary>Statistics restricted to a single category (matched by DB category name).</summary>
    [HttpGet("category/{name}")]
    [ProducesResponseType(typeof(ElementStatistics), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetByCategory(string name, CancellationToken ct = default)
    {
        var all = await _repository.GetAllAsync(ct);
        var filter = new ElementFilter { Category = name };
        var subset = ElementAnalytics.Query(all, filter);
        if (subset.Count == 0) return NotFound($"No elements found for category '{name}'.");
        return Ok(ElementAnalytics.ComputeStatistics(subset));
    }
}
