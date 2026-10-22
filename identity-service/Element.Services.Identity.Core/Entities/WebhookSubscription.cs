using System.Net;

namespace Element.Services.Identity.Core.Entities;

/// <summary>
/// An HTTPS endpoint a user registered to receive events. Deleting it removes the row (and its secret).
/// Built only through <see cref="Create"/>, so a stored subscription always has an acceptable URL, a secret and at least one supported event.
/// </summary>
public class WebhookSubscription
{
    /// <summary>Every hook costs a delivery attempt per event; an account may hold at most this many active ones.</summary>
    public const int MaxActivePerUser = 10;

    private static readonly string[] SupportedEvents = ["price.updated", "order.updated"];

    // EF Core materialises rows through this constructor.
    private WebhookSubscription()
    {
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string Url { get; private set; } = string.Empty;

    /// <summary>Shared secret the notification service uses to sign deliveries.</summary>
    public string Secret { get; private set; } = string.Empty;

    /// <summary>Comma-separated event names, e.g. "price.updated,order.updated".</summary>
    public string Events { get; private set; } = string.Empty;

    public DateTime CreatedAt { get; private set; }
    public bool IsActive { get; private set; } = true;

    /// <summary>True while the account is below <see cref="MaxActivePerUser"/> active subscriptions.</summary>
    public static bool CanAddAnother(int activeCount) => activeCount < MaxActivePerUser;

    /// <summary>Trimmed, lowercased, de-duplicated supported event names from the request; unknown names are dropped.</summary>
    public static string[] SupportedEventsIn(IEnumerable<string?>? requested) =>
        (requested ?? [])
            .OfType<string>()
            .Select(eventName => eventName.Trim().ToLowerInvariant())
            .Where(SupportedEvents.Contains)
            .Distinct()
            .ToArray();

    /// <summary>Creates an active subscription; throws <see cref="ArgumentException"/> when the URL, secret or events are not acceptable.</summary>
    public static WebhookSubscription Create(Guid userId, string url, string secret, IEnumerable<string?> events, DateTime createdAt)
    {
        var trimmedUrl = url.Trim();
        if (!IsAcceptableUrl(trimmedUrl))
            throw new ArgumentException("Webhook URL is not a public https address.", nameof(url));
        if (string.IsNullOrWhiteSpace(secret))
            throw new ArgumentException("Webhook secret is required.", nameof(secret));

        var supportedEvents = SupportedEventsIn(events);
        if (supportedEvents.Length == 0)
            throw new ArgumentException("At least one supported event is required.", nameof(events));

        return new WebhookSubscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Url = trimmedUrl,
            Secret = secret,
            Events = string.Join(',', supportedEvents),
            CreatedAt = createdAt,
            IsActive = true,
        };
    }

    /// <summary>
    /// https + public-looking DNS name. notification-service re-checks the resolved IPs at connect time;
    /// this rejects the obvious internal targets up front (IP literals, localhost, Docker service names, credentials).
    /// </summary>
    public static bool IsAcceptableUrl(string? url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps || uri.UserInfo.Length > 0)
            return false;
        var host = uri.IdnHost.TrimEnd('.');
        return uri.HostNameType == UriHostNameType.Dns && host.Contains('.') && !IPAddress.TryParse(host, out _)
            && !host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase);
    }
}
