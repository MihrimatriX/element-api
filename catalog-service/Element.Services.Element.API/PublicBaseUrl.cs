using System;
using System.Linq;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace Element.Services.Element.API.Controllers;

/// <summary>
/// Public origin for HATEOAS links. Prefer PUBLIC_API_BASE when the reverse proxy
/// does not pass X-Forwarded-Host (typical on a subdomain).
/// </summary>
internal static class PublicBaseUrl
{
    public static string Resolve(HttpRequest request, IConfiguration? config = null)
    {
        var configured = config?["PUBLIC_API_BASE"]
            ?? Environment.GetEnvironmentVariable("PUBLIC_API_BASE");
        if (!string.IsNullOrWhiteSpace(configured))
            return configured.Trim().TrimEnd('/');

        var proto = request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? request.Scheme;
        var host = request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? request.Host.ToString();
        return $"{proto}://{host}";
    }
}
