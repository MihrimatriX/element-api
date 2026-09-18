using System.Linq;
using System.Net;
using Microsoft.AspNetCore.Http;

namespace Element.Gateway;

/// <summary>
/// Client IP for rate limiting. Host Caddy → loopback makes RemoteIp always 127.0.0.1;
/// only then trust the first X-Forwarded-For hop (spoofing ignored when clients hit the gateway directly).
/// </summary>
public static class ClientIp
{
    public static string Resolve(HttpContext context)
    {
        var remote = context.Connection.RemoteIpAddress;
        if (remote is not null && !IPAddress.IsLoopback(remote))
            return remote.ToString();

        var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
        {
            var first = forwarded.Split(',', 2, StringSplitOptions.TrimEntries)[0];
            if (first.Length > 0) return first;
        }

        return remote?.ToString() ?? "unknown";
    }
}
