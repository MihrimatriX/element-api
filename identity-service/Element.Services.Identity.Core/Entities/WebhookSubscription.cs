using System.Net;

namespace Element.Services.Identity.Core.Entities;

/// <summary>An HTTPS endpoint a user registered to receive events. Deleting it removes the row (and its secret).</summary>
public class WebhookSubscription
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Url { get; set; } = string.Empty;

    /// <summary>Shared secret the notification service uses to sign deliveries.</summary>
    public string Secret { get; set; } = string.Empty;

    /// <summary>Comma-separated event names, e.g. "price.updated,order.updated".</summary>
    public string Events { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; } = true;

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
