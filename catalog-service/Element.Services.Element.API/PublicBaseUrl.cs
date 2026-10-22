using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace Element.Services.Element.API.Controllers;

/// <summary>
/// Public origin for HATEOAS links. Prefer PUBLIC_API_BASE when the reverse proxy
/// does not pass X-Forwarded-Host (typical on a subdomain).
/// </summary>
internal static class PublicBaseUrl
{
    /// <summary>Returns the origin (scheme + host, no trailing slash) that clients should see in links.</summary>
    public static string Resolve(HttpRequest request, IConfiguration? config = null)
    {
        var configuredBase = config?["PUBLIC_API_BASE"]
            ?? Environment.GetEnvironmentVariable("PUBLIC_API_BASE");
        if (!string.IsNullOrWhiteSpace(configuredBase))
        {
            return configuredBase.Trim().TrimEnd('/');
        }

        var scheme = request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? request.Scheme;
        var host = request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? request.Host.ToString();
        return $"{scheme}://{host}";
    }
}
