using Element.Shared.Science;
using Microsoft.AspNetCore.Mvc;

namespace Element.Services.Compound.API.Controllers;

[ApiController]
[Route("api/v2/compounds")]
public sealed class ScientificCompoundsController : ControllerBase
{
    private static readonly ScientificCatalog Catalog = new("scientific-compounds.json", false);

    /// <summary>Public scientific compounds (excludes preparations/allotropes). Supports q, view=summary|full, include, fields, page and pageSize (1–100).</summary>
    [HttpGet]
    public IActionResult List() => Catalog.Read(Request, Response);

    /// <summary>Full compound by slug or PubChem CID, with sourced measurements and safety reports.</summary>
    [HttpGet("{identifier}")]
    public IActionResult Get(string identifier) => Catalog.Read(Request, Response, identifier);
}
