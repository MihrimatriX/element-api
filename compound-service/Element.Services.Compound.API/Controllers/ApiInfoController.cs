using Microsoft.AspNetCore.Mvc;

namespace Element.Services.Compound.API.Controllers;

/// <summary>Root discovery endpoint of the compound service.</summary>
[ApiController]
[Route("api/v1")]
public class ApiInfoController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public ApiInfoController(IConfiguration configuration) => _configuration = configuration;

    /// <summary>Lists the compound endpoints with example links, so a client can explore the API from one URL.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(Dictionary<string, string>), 200)]
    public IActionResult GetApiInfo()
    {
        var baseUrl = PublicBaseUrl.Resolve(Request, _configuration);
        var resources = new Dictionary<string, string>
        {
            { "scientific_compounds", $"{baseUrl}/api/v2/compounds" },
            { "compounds", $"{baseUrl}/api/v1/compounds" },
            { "compound", $"{baseUrl}/api/v1/compounds/aucl3" },
            { "by_element", $"{baseUrl}/api/v1/elements/au/compounds" },
            { "health", $"{baseUrl}/health" },
            { "info", $"{baseUrl}/info" },
            { "swagger", $"{baseUrl}/swagger" }
        };

        return Ok(resources);
    }
}
