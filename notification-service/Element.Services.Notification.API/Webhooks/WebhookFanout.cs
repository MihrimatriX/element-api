using System.Net.Http.Json;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Element.Services.Notification.API.Webhooks;

public class WebhookFanout
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WebhookFanout> _logger;

    public WebhookFanout(IHttpClientFactory httpFactory, IConfiguration configuration, ILogger<WebhookFanout> logger)
    {
        _httpFactory = httpFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task PublishAsync(string eventName, object payload, CancellationToken ct = default, Guid? customerId = null)
    {
        var identityUrl = _configuration["IdentityServiceInternalUrl"] ?? "http://localhost:5001";
        var secret = _configuration["INTERNAL_API_KEY"] ?? "";
        var client = _httpFactory.CreateClient("webhooks-internal");
        List<Hook> hooks;
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get,
                $"{identityUrl.TrimEnd('/')}/api/v1/internal/webhooks?event={Uri.EscapeDataString(eventName)}&customerId={customerId}");
            req.Headers.TryAddWithoutValidation("INTERNAL_API_KEY", secret);
            using var res = await client.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode) return;
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            hooks = await res.Content.ReadFromJsonAsync<List<Hook>>(opts, ct) ?? [];
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load webhooks for {Event}", eventName);
            return;
        }

        var body = JsonSerializer.Serialize(payload);
        foreach (var hook in hooks)
        {
            if (!await TrySendAsync(hook, eventName, body, ct))
            {
                // Keep the message unacknowledged while its retry is pending.
                await Task.Delay(TimeSpan.FromSeconds(10), ct);
                await TrySendAsync(hook, eventName, body, ct);
            }
        }
    }

    private async Task<bool> TrySendAsync(Hook hook, string eventName, string body, CancellationToken ct)
    {
        if (!Uri.TryCreate(hook.Url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps || !string.IsNullOrEmpty(uri.UserInfo))
            return true;
        if (await IsBlockedHost(uri.Host))
        {
            _logger.LogWarning("SSRF blocked webhook host {Host}", uri.Host);
            return true;
        }

        var sig = Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(hook.Secret), Encoding.UTF8.GetBytes(body)))
            .ToLowerInvariant();
        try
        {
            var client = _httpFactory.CreateClient("webhooks");
            using var req = new HttpRequestMessage(HttpMethod.Post, uri);
            req.Content = new StringContent(body, Encoding.UTF8, "application/json");
            req.Headers.TryAddWithoutValidation("X-Element-Signature", sig);
            req.Headers.TryAddWithoutValidation("X-Element-Event", eventName);
            using var res = await client.SendAsync(req, ct);
            return res.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Webhook POST failed {Url}", hook.Url);
            return false;
        }
    }

    private static async Task<bool> IsBlockedHost(string host)
    {
        try
        {
            var addresses = await Dns.GetHostAddressesAsync(host);
            return addresses.Any(IsPrivate);
        }
        catch
        {
            return true;
        }
    }

    public static async ValueTask<Stream> ConnectPublicAsync(SocketsHttpConnectionContext context, CancellationToken ct)
    {
        var addresses = await Dns.GetHostAddressesAsync(context.DnsEndPoint.Host, ct);
        if (addresses.Length == 0 || addresses.Any(IsPrivate)) throw new HttpRequestException("Webhook destination must be public.");
        foreach (var address in addresses)
        {
            var socket = new Socket(address.AddressFamily, SocketType.Stream, ProtocolType.Tcp);
            try { await socket.ConnectAsync(address, context.DnsEndPoint.Port, ct); return new NetworkStream(socket, ownsSocket: true); }
            catch { socket.Dispose(); }
        }
        throw new HttpRequestException("Webhook connection failed.");
    }

    public static bool IsPrivate(IPAddress ip)
    {
        if (IPAddress.IsLoopback(ip)) return true;
        if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();
        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            var b = ip.GetAddressBytes();
            if (b[0] == 10 || b[0] == 127 || b[0] == 0) return true;
            if (b[0] == 169 && b[1] == 254) return true;
            if (b[0] == 172 && b[1] is >= 16 and <= 31) return true;
            if (b[0] == 192 && b[1] == 168) return true;
            if (b[0] == 100 && b[1] is >= 64 and <= 127) return true;
            if (b[0] >= 224) return true;
        }
        if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.IsIPv6UniqueLocal || ip.IsIPv6Multicast || ip.Equals(IPAddress.IPv6Any)) return true;
        }
        return false;
    }

    private sealed class Hook
    {
        public string Url { get; set; } = "";
        public string Secret { get; set; } = "";
        public string Events { get; set; } = "";
    }
}
