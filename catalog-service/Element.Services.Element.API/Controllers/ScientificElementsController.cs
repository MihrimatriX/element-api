using Element.Shared.Science;
using Microsoft.AspNetCore.Mvc;

namespace Element.Services.Element.API.Controllers;

[ApiController]
[Route("api/v2/elements")]
public sealed class ScientificElementsController : ControllerBase
{
    private static readonly ScientificCatalog Catalog = new("scientific-elements.json", true);

    /// <summary>Public scientific element catalogue. view=summary|full, include=section, fields=dot.paths, q, category, block, group, period, page, pageSize (1–100).</summary>
    [HttpGet]
    public IActionResult List() => Catalog.Read(Request, Response);

    /// <summary>Full scientific record by symbol, atomic number or stable id. Supports view, include and fields.</summary>
    [HttpGet("{identifier}")]
    public IActionResult Get(string identifier) => Catalog.Read(Request, Response, identifier);
}
