using Microsoft.AspNetCore.Mvc;

namespace Element.Services.Identity.API.Controllers;

[ApiController]
[Route("api/v1")]
public class ApiInfoController : ControllerBase
{
    private string BaseUrl()
    {
        var proto = Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? Request.Scheme;
        var host = Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? Request.Host.ToString();
        return $"{proto}://{host}";
    }

    [HttpGet]
    public IActionResult Get() => Ok(new Dictionary<string, string>
    {
        ["auth_register"] = $"{BaseUrl()}/api/v1/auth/register",
        ["auth_login"] = $"{BaseUrl()}/api/v1/auth/login",
        ["api_keys"] = $"{BaseUrl()}/api/v1/api-keys",
        ["swagger"] = $"{BaseUrl()}/swagger",
        ["health"] = $"{BaseUrl()}/health",
        ["info"] = $"{BaseUrl()}/info"
    });
}
