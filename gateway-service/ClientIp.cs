using System.Net;
using System.Net.Sockets;

namespace Element.Gateway;

/// <summary>
/// Client IP for rate limiting. Trust X-Forwarded-For only when the peer is a
/// reverse proxy we expect: loopback (host Caddy → 127.0.0.1) or listed /
/// Docker-private peers (in-compose Caddy). Direct public clients cannot spoof past this.
/// </summary>
public static class ClientIp
{
    private const string ForwardedForHeader = "X-Forwarded-For";
    private const string TrustedProxyCidrsVariable = "TRUSTED_PROXY_CIDRS";

    /// <summary>Returns the real client IP: the first X-Forwarded-For hop when a trusted proxy sent the request, otherwise the TCP peer.</summary>
    public static string Resolve(HttpContext context)
    {
        var peerAddress = context.Connection.RemoteIpAddress;
        if (peerAddress is not null && !IsTrustedProxy(peerAddress))
            return peerAddress.ToString();

        var forwardedFor = context.Request.Headers[ForwardedForHeader].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwardedFor))
        {
            // The left-most hop is the original client; later hops are proxies.
            var originalClient = forwardedFor.Split(',', 2, StringSplitOptions.TrimEntries)[0];
            if (originalClient.Length > 0)
                return originalClient;
        }

        return peerAddress?.ToString() ?? "unknown";
    }

    /// <summary>
    /// When <c>TRUSTED_PROXY_CIDRS</c> is set (comma-separated CIDRs), only those
    /// peers plus loopback are trusted. When empty/unset, RFC1918 + link-local
    /// (current Docker Compose / localhost default).
    /// </summary>
    public static bool IsTrustedProxy(IPAddress address)
    {
        if (IPAddress.IsLoopback(address))
            return true;

        if (address.IsIPv4MappedToIPv6)
            address = address.MapToIPv4();

        var configuredCidrs = Environment.GetEnvironmentVariable(TrustedProxyCidrsVariable);
        if (string.IsNullOrWhiteSpace(configuredCidrs))
            return IsPrivateOrLinkLocal(address);

        var cidrs = configuredCidrs.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var cidr in cidrs)
        {
            if (IPNetwork.Parse(cidr).Contains(address))
                return true;
        }

        return false;
    }

    private static bool IsPrivateOrLinkLocal(IPAddress address)
    {
        if (address.AddressFamily == AddressFamily.InterNetwork)
        {
            var octets = address.GetAddressBytes();
            return octets[0] switch
            {
                10 => true,                            // 10.0.0.0/8
                172 => octets[1] is >= 16 and <= 31,   // 172.16.0.0/12
                192 => octets[1] == 168,               // 192.168.0.0/16
                169 => octets[1] == 254,               // 169.254.0.0/16 link-local
                _ => false,
            };
        }

        if (address.AddressFamily == AddressFamily.InterNetworkV6)
            return address.IsIPv6LinkLocal || address.IsIPv6SiteLocal || IsUniqueLocal(address);

        return false;
    }

    // fc00::/7 (IPv6 unique local addresses, the IPv6 counterpart of RFC1918).
    private static bool IsUniqueLocal(IPAddress address)
    {
        var bytes = address.GetAddressBytes();
        return (bytes[0] & 0xfe) == 0xfc;
    }
}
