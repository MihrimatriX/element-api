using System.Diagnostics.CodeAnalysis;
using System.Net;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Element.Services.Notification.API.Webhooks;

/// <summary>
/// Delivers one event to the matching webhooks registered in the identity service:
/// loads the subscriptions, signs the JSON body with each hook's secret and POSTs it in parallel
/// (at most <see cref="MaxHooksPerEvent"/> hooks), refusing any destination that is not public HTTPS (SSRF protection).
/// </summary>
public class WebhookFanout
{
    /// <summary>Upper bound on hooks one event is delivered to; extra subscriptions are skipped with a warning.</summary>
    public const int MaxHooksPerEvent = 10;

    /// <summary>Named HttpClient for customer webhooks; its handler only connects to public addresses.</summary>
    public const string PublicClientName = "webhooks";

    /// <summary>Named HttpClient for the identity service's internal webhook listing.</summary>
    public const string InternalClientName = "webhooks-internal";

    private const string InternalApiKeyHeader = "INTERNAL_API_KEY";
    private const string SignatureHeader = "X-Element-Signature";
    private const string EventHeader = "X-Element-Event";
    private const string DefaultIdentityUrl = "http://localhost:5001";

    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(10);

    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WebhookFanout> _logger;

    /// <summary>Creates the fan-out with the HTTP client factory, configuration and logger.</summary>
    public WebhookFanout(IHttpClientFactory httpFactory, IConfiguration configuration, ILogger<WebhookFanout> logger)
    {
        _httpFactory = httpFactory;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Sends <paramref name="payload"/> as event <paramref name="eventName"/> to the subscribed webhooks,
    /// retrying each failed delivery once. Throws when the subscription list cannot be loaded, so the
    /// broker retries the event (nothing has been sent at that point).
    /// </summary>
    public async Task PublishAsync(string eventName, object payload, CancellationToken ct = default, Guid? customerId = null)
    {
        var hooks = await LoadHooksAsync(eventName, customerId, ct);
        if (hooks.Count > MaxHooksPerEvent)
        {
            _logger.LogWarning("Customer {CustomerId} has {Count} hooks for {Event}; delivering to {Max}",
                customerId, hooks.Count, eventName, MaxHooksPerEvent);
        }

        var body = JsonSerializer.Serialize(payload);

        // Capped and parallel: one event costs at most one hook's worst case (4s + 10s + 4s), so a
        // customer with many slow hooks cannot pin a consumer slot (and everyone's deliveries) for minutes.
        await Task.WhenAll(hooks.Take(MaxHooksPerEvent).Select(hook => DeliverWithRetryAsync(hook, eventName, body, ct)));
    }

    /// <summary>
    /// Connect callback for the public webhook client: resolves the host itself and refuses to connect
    /// when any address is private. The private-address check lives only here, at connect time, on the
    /// exact addresses we dial: no TOCTOU window for DNS rebinding.
    /// </summary>
    public static async ValueTask<Stream> ConnectPublicAsync(SocketsHttpConnectionContext context, CancellationToken ct)
    {
        var addresses = await Dns.GetHostAddressesAsync(context.DnsEndPoint.Host, ct);
        if (addresses.Length == 0 || addresses.Any(IsPrivate))
        {
            throw new HttpRequestException("Webhook destination must be public.");
        }

        foreach (var address in addresses)
        {
            var socket = new Socket(address.AddressFamily, SocketType.Stream, ProtocolType.Tcp);
            try
            {
                await socket.ConnectAsync(address, context.DnsEndPoint.Port, ct);
                return new NetworkStream(socket, ownsSocket: true);
            }
            catch
            {
                // Try the next resolved address.
                socket.Dispose();
            }
        }

        throw new HttpRequestException("Webhook connection failed.");
    }

    /// <summary>
    /// True for every address a webhook must not reach: all IPv6 outside global unicast 2000::/3, and IPv4
    /// private, loopback, link-local, carrier-grade NAT, benchmark, IETF-reserved, multicast and broadcast ranges.
    /// </summary>
    public static bool IsPrivate(IPAddress ip)
    {
        if (ip.IsIPv4MappedToIPv6)
        {
            ip = ip.MapToIPv4();
        }

        var octets = ip.GetAddressBytes();
        return ip.AddressFamily == AddressFamily.InterNetworkV6
            ? IsNonGlobalIPv6(octets)
            : IsPrivateIPv4(octets);
    }

    /// <summary>
    /// IPv6: allow only global unicast 2000::/3. Loopback, unspecified, ULA (incl. AWS IMDS fd00:ec2::254),
    /// link-local, multicast, IPv4-compatible ::a.b.c.d and NAT64 64:ff9b::/96 (→ 10.x / 169.254.x) are all outside it.
    /// </summary>
    private static bool IsNonGlobalIPv6(byte[] octets) => (octets[0] & 0xE0) != 0x20;

    private static bool IsPrivateIPv4(byte[] octets)
    {
        var first = octets[0];
        var second = octets[1];

        if (first == 10 || first == 127 || first == 0)
        {
            return true; // 10.0.0.0/8 private, 127.0.0.0/8 loopback, 0.0.0.0/8 "this network"
        }

        if (first == 169 && second == 254)
        {
            return true; // 169.254.0.0/16 link-local (includes cloud metadata endpoints)
        }

        if (first == 172 && second is >= 16 and <= 31)
        {
            return true; // 172.16.0.0/12 private
        }

        if (first == 192 && second == 168)
        {
            return true; // 192.168.0.0/16 private
        }

        if (first == 192 && second == 0 && octets[2] == 0)
        {
            return true; // 192.0.0.0/24 IETF protocol assignments
        }

        if (first == 198 && second is 18 or 19)
        {
            return true; // 198.18.0.0/15 benchmarking
        }

        if (first == 100 && second is >= 64 and <= 127)
        {
            return true; // 100.64.0.0/10 carrier-grade NAT
        }

        return first >= 224; // 224.0.0.0 and above: multicast, reserved and broadcast
    }

    /// <summary>
    /// Asks the identity service for the active hooks of this event (and customer).
    /// Any failure throws: MassTransit retries, then parks the event in notification-order-updates_error
    /// instead of it being silently dropped.
    /// </summary>
    private async Task<List<Hook>> LoadHooksAsync(string eventName, Guid? customerId, CancellationToken ct)
    {
        var identityUrl = _configuration["IdentityServiceInternalUrl"] ?? DefaultIdentityUrl;
        var internalApiKey = _configuration["INTERNAL_API_KEY"] ?? "";
        var requestUrl =
            $"{identityUrl.TrimEnd('/')}/api/v1/internal/webhooks?event={Uri.EscapeDataString(eventName)}&customerId={customerId}";

        var client = _httpFactory.CreateClient(InternalClientName);
        using var request = new HttpRequestMessage(HttpMethod.Get, requestUrl);
        request.Headers.TryAddWithoutValidation(InternalApiKeyHeader, internalApiKey);

        using var response = await client.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        return await response.Content.ReadFromJsonAsync<List<Hook>>(jsonOptions, ct) ?? [];
    }

    /// <summary>Delivers to one hook; a failed attempt is retried once after <see cref="RetryDelay"/>.</summary>
    private async Task DeliverWithRetryAsync(Hook hook, string eventName, string body, CancellationToken ct)
    {
        if (await TrySendAsync(hook, eventName, body, ct))
        {
            return;
        }

        // Waiting here keeps the broker message unacknowledged while its retry is pending.
        await Task.Delay(RetryDelay, ct);
        await TrySendAsync(hook, eventName, body, ct);
    }

    /// <summary>
    /// POSTs the signed body to one hook. Returns false only when a delivery to an allowed URL failed
    /// and is worth retrying; invalid URLs are skipped and count as handled (true).
    /// Private destinations are refused by <see cref="ConnectPublicAsync"/> and surface here as a failed POST.
    /// </summary>
    private async Task<bool> TrySendAsync(Hook hook, string eventName, string body, CancellationToken ct)
    {
        if (!IsAllowedWebhookUrl(hook.Url, out var destination))
        {
            return true;
        }

        var signature = ComputeSignature(hook.Secret, body);
        try
        {
            var client = _httpFactory.CreateClient(PublicClientName);
            using var request = new HttpRequestMessage(HttpMethod.Post, destination);
            request.Content = new StringContent(body, Encoding.UTF8, "application/json");
            request.Headers.TryAddWithoutValidation(SignatureHeader, signature);
            request.Headers.TryAddWithoutValidation(EventHeader, eventName);

            // Headers only: the body is never read, so a receiver cannot make us buffer an unbounded response.
            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            // Host only: the path/query of a webhook URL is often itself a credential.
            _logger.LogWarning(ex, "Webhook POST to {Host} failed", destination.Host);
            return false;
        }
    }

    /// <summary>Only absolute https:// URLs without embedded credentials (user:pass@) may receive webhooks.</summary>
    private static bool IsAllowedWebhookUrl(string url, [NotNullWhen(true)] out Uri? destination)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out destination))
        {
            return false;
        }

        var isHttps = destination.Scheme == Uri.UriSchemeHttps;
        var hasCredentials = !string.IsNullOrEmpty(destination.UserInfo);
        return isHttps && !hasCredentials;
    }

    /// <summary>Lowercase hex HMAC-SHA256 of the exact body bytes, keyed with the hook's secret.</summary>
    private static string ComputeSignature(string secret, string body)
    {
        var hash = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(body));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    /// <summary>One webhook subscription as returned by the identity service.</summary>
    private sealed class Hook
    {
        public string Url { get; set; } = "";

        public string Secret { get; set; } = "";

        public string Events { get; set; } = "";
    }
}
