using System.Linq;
using System.Net;
using System.Net.Sockets;
using Microsoft.AspNetCore.Http;

namespace Element.Gateway;

/// <summary>
/// Client IP for rate limiting. Trust X-Forwarded-For only when the peer is a
/// reverse proxy we expect: loopback (host Caddy → 127.0.0.1) or listed /
/// Docker-private peers (in-compose Caddy). Direct public clients cannot spoof past this.
/// </summary>
public static class ClientIp
{
    public static string Resolve(HttpContext context)
    {
        var remote = context.Connection.RemoteIpAddress;
        if (remote is not null && !IsTrustedProxy(remote))
            return remote.ToString();

        var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
        {
            var first = forwarded.Split(',', 2, StringSplitOptions.TrimEntries)[0];
            if (first.Length > 0) return first;
        }

        return remote?.ToString() ?? "unknown";
    }

    /// <summary>
    /// When <c>TRUSTED_PROXY_CIDRS</c> is set (comma-separated CIDRs), only those
    /// peers plus loopback are trusted. When empty/unset, RFC1918 + link-local
    /// (current Docker Compose / localhost default).
    /// </summary>
    public static bool IsTrustedProxy(IPAddress address)
    {
        if (IPAddress.IsLoopback(address)) return true;
        if (address.IsIPv4MappedToIPv6)
            address = address.MapToIPv4();

        var raw = Environment.GetEnvironmentVariable("TRUSTED_PROXY_CIDRS");
        if (!string.IsNullOrWhiteSpace(raw))
        {
            foreach (var part in raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                if (IPNetwork.Parse(part).Contains(address)) return true;
            }
            return false;
        }

        return IsPrivateOrLinkLocal(address);
    }

    static bool IsPrivateOrLinkLocal(IPAddress address)
    {
        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            var bytes = address.GetAddressBytes();
            return bytes[0] switch
            {
                10 => true,
                172 => bytes[1] is >= 16 and <= 31,
                192 => bytes[1] == 168,
                169 => bytes[1] == 254,
                _ => false,
            };
        }

        if (address.AddressFamily == AddressFamily.InterNetworkV6)
            return address.IsIPv6LinkLocal || address.IsIPv6SiteLocal || IsUniqueLocal(address);

        return false;
    }

    static bool IsUniqueLocal(IPAddress address)
    {
        var bytes = address.GetAddressBytes();
        return (bytes[0] & 0xfe) == 0xfc;
    }
}
