using System.Net.Http.Json;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Element.Services.Notification.API.Webhooks;

public class WebhookFanout
{
    public const int MaxHooksPerEvent = 10;

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
        // Lookup failures throw (nothing has been sent yet): MassTransit retries, then parks the
        // event in notification-order-updates_error instead of it being silently dropped.
        using (var req = new HttpRequestMessage(HttpMethod.Get,
            $"{identityUrl.TrimEnd('/')}/api/v1/internal/webhooks?event={Uri.EscapeDataString(eventName)}&customerId={customerId}"))
        {
            req.Headers.TryAddWithoutValidation("INTERNAL_API_KEY", secret);
            using var res = await client.SendAsync(req, ct);
            res.EnsureSuccessStatusCode();
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            hooks = await res.Content.ReadFromJsonAsync<List<Hook>>(opts, ct) ?? [];
        }

        if (hooks.Count > MaxHooksPerEvent)
            _logger.LogWarning("Customer {CustomerId} has {Count} hooks for {Event}; delivering to {Max}",
                customerId, hooks.Count, eventName, MaxHooksPerEvent);

        var body = JsonSerializer.Serialize(payload);
        // Capped and parallel: one event costs at most one hook's worst case (4s + 10s + 4s), so a
        // customer with many slow hooks cannot pin a consumer slot (and everyone's deliveries) for minutes.
        await Task.WhenAll(hooks.Take(MaxHooksPerEvent).Select(async hook =>
        {
            if (!await TrySendAsync(hook, eventName, body, ct))
            {
                // Keep the message unacknowledged while its retry is pending.
                await Task.Delay(TimeSpan.FromSeconds(10), ct);
                await TrySendAsync(hook, eventName, body, ct);
            }
        }));
    }

    private async Task<bool> TrySendAsync(Hook hook, string eventName, string body, CancellationToken ct)
    {
        if (!Uri.TryCreate(hook.Url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps || !string.IsNullOrEmpty(uri.UserInfo))
            return true;

        var sig = Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(hook.Secret), Encoding.UTF8.GetBytes(body)))
            .ToLowerInvariant();
        try
        {
            var client = _httpFactory.CreateClient("webhooks");
            using var req = new HttpRequestMessage(HttpMethod.Post, uri);
            req.Content = new StringContent(body, Encoding.UTF8, "application/json");
            req.Headers.TryAddWithoutValidation("X-Element-Signature", sig);
            req.Headers.TryAddWithoutValidation("X-Element-Event", eventName);
            // Headers only: the body is never read, so a receiver cannot make us buffer an unbounded response.
            using var res = await client.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
            return res.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            // Host only: the path/query of a webhook URL is often itself a credential.
            _logger.LogWarning(ex, "Webhook POST to {Host} failed", uri.Host);
            return false;
        }
    }

    // The private-address check lives only here, at connect time, on the exact addresses we dial:
    // no TOCTOU window for DNS rebinding.
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
        if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();
        var b = ip.GetAddressBytes();
        // IPv6: allow only global unicast 2000::/3. Loopback, unspecified, ULA (incl. AWS IMDS fd00:ec2::254),
        // link-local, multicast, IPv4-compatible ::a.b.c.d and NAT64 64:ff9b::/96 (→ 10.x / 169.254.x) are all outside it.
        if (ip.AddressFamily == AddressFamily.InterNetworkV6) return (b[0] & 0xE0) != 0x20;
        if (b[0] == 10 || b[0] == 127 || b[0] == 0) return true;
        if (b[0] == 169 && b[1] == 254) return true;
        if (b[0] == 172 && b[1] is >= 16 and <= 31) return true;
        if (b[0] == 192 && b[1] == 168) return true;
        if (b[0] == 192 && b[1] == 0 && b[2] == 0) return true;
        if (b[0] == 198 && b[1] is 18 or 19) return true;
        if (b[0] == 100 && b[1] is >= 64 and <= 127) return true;
        return b[0] >= 224;
    }

    private sealed class Hook
    {
        public string Url { get; set; } = "";
        public string Secret { get; set; } = "";
        public string Events { get; set; } = "";
    }
}
