using System;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace Element.Services.Compound.API;

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
