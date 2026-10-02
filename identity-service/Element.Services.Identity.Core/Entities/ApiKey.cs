namespace Element.Services.Identity.Core.Entities;

/// <summary>An API key issued to a user. Only the SHA-256 hash of the raw key is stored.</summary>
public class ApiKey
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string KeyHash { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    /// <summary>Display form of the key, e.g. "ele_live_abcd...1234".</summary>
    public string MaskedKey { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }

    /// <summary>Requests per second the gateway allows for this key (default 10).</summary>
    public int RateLimitTps { get; set; } = 10;
}
