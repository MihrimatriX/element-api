using Microsoft.AspNetCore.Mvc;

namespace Element.Services.Element.API.Controllers;

/// <summary>
/// Root info endpoint that returns discovery endpoints for all API resources.
/// </summary>
[ApiController]
[Route("api/v1")]
public class ApiInfoController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public ApiInfoController(IConfiguration configuration) => _configuration = configuration;

    /// <summary>
    /// Discovery endpoint listing all available sub-resources.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(Dictionary<string, string>), 200)]
    public IActionResult GetApiInfo()
    {
        var baseUrl = PublicBaseUrl.Resolve(Request, _configuration);
        var resources = new Dictionary<string, string>
        {
            { "scientific_elements", $"{baseUrl}/api/v2/elements" },
            { "scientific_compounds", $"{baseUrl}/api/v2/compounds" },
            { "elements", $"{baseUrl}/api/v1/elements" },
            { "elements_search", $"{baseUrl}/api/v1/elements/search?q=gold" },
            { "elements_random", $"{baseUrl}/api/v1/elements/random" },
            { "elements_compare", $"{baseUrl}/api/v1/elements/compare?symbols=au,ag,cu" },
            { "element_neighbors", $"{baseUrl}/api/v1/elements/au/neighbors" },
            { "element_related", $"{baseUrl}/api/v1/elements/au/related" },
            { "categories", $"{baseUrl}/api/v1/categories" },
            { "statistics", $"{baseUrl}/api/v1/statistics" },
            { "ticker", $"{baseUrl}/api/v1/elements/au/ticker" },
            { "compounds", $"{baseUrl}/api/v1/compounds" },
            { "market_movers", $"{baseUrl}/api/v1/market/movers" },
            { "market_board", $"{baseUrl}/api/v1/market/board" },
            // No health/info links: behind the public proxy those paths belong to the web host, whose static
            // /health answers "Healthy" even when this API is down.
            { "swagger", $"{baseUrl}/swagger" }
        };

        return Ok(resources);
    }
}
