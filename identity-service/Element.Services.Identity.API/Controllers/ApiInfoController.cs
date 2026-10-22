using Microsoft.AspNetCore.Mvc;

namespace Element.Services.Identity.API.Controllers;

/// <summary>Discovery document that lists the absolute URLs of this service's main endpoints.</summary>
[ApiController]
[Route("api/v1")]
public class ApiInfoController : ControllerBase
{
    /// <summary>Returns a name-to-URL map of the main identity endpoints.</summary>
    [HttpGet]
    public IActionResult Get()
    {
        var baseUrl = GetPublicBaseUrl();
        return Ok(new Dictionary<string, string>
        {
            ["auth_register"] = $"{baseUrl}/api/v1/auth/register",
            ["auth_login"] = $"{baseUrl}/api/v1/auth/login",
            ["api_keys"] = $"{baseUrl}/api/v1/api-keys",
            ["webhooks"] = $"{baseUrl}/api/v1/webhooks",
            ["swagger"] = $"{baseUrl}/swagger",
            ["health"] = $"{baseUrl}/health",
            ["info"] = $"{baseUrl}/info",
        });
    }

    // Behind a reverse proxy the caller's original scheme and host arrive in X-Forwarded-* headers.
    private string GetPublicBaseUrl()
    {
        var scheme = Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? Request.Scheme;
        var host = Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? Request.Host.ToString();
        return $"{scheme}://{host}";
    }
}
