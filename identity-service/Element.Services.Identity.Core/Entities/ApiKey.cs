using System.Security.Cryptography;
using System.Text;

namespace Element.Services.Identity.Core.Entities;

/// <summary>
/// An API key issued to a user. Only the SHA-256 hash of the raw key is stored.
/// State changes go through <see cref="Issue"/> and <see cref="Revoke"/>; a revoked key cannot be switched back on.
/// </summary>
public class ApiKey
{
    /// <summary>Every raw key starts with this prefix, followed by 32 random lowercase hex characters.</summary>
    public const string RawKeyPrefix = "ele_live_";

    /// <summary>An account may hold at most this many active keys at once.</summary>
    public const int MaxActivePerAccount = 20;

    /// <summary>Only the newest revoked keys of an account are kept; older ones are deleted when a new key is issued.</summary>
    public const int MaxRevokedKept = 20;

    /// <summary>Lowest and highest requests per second the gateway may allow for one key.</summary>
    public const int MinRateLimitTps = 1;
    public const int MaxRateLimitTps = 10;

    private const int RandomPartLength = 32;

    // The masked form keeps the prefix plus 4 random characters and the last 4 characters: "ele_live_abcd...1234".
    private const int MaskedLeadingLength = 13;
    private const int MaskedTrailingLength = 4;

    // EF Core materialises rows through this constructor.
    private ApiKey()
    {
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string KeyHash { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;

    /// <summary>Display form of the key, e.g. "ele_live_abcd...1234".</summary>
    public string MaskedKey { get; private set; } = string.Empty;

    public DateTime CreatedAt { get; private set; }
    public bool IsActive { get; private set; }

    /// <summary>Requests per second the gateway allows for this key (1-10).</summary>
    public int RateLimitTps { get; private set; } = MaxRateLimitTps;

    /// <summary>True while the account is below <see cref="MaxActivePerAccount"/> active keys.</summary>
    public static bool CanIssueAnother(int activeKeyCount) => activeKeyCount < MaxActivePerAccount;

    /// <summary>
    /// Creates a new active key. Returns the raw key (shown to the user once, never stored) and the entity to store.
    /// Callers may ask for a lower rate limit, never for more than the platform limit.
    /// </summary>
    public static (string RawKey, ApiKey Key) Issue(Guid userId, string description, int rateLimitTps, DateTime createdAt)
    {
        var rawKey = RawKeyPrefix + RandomNumberGenerator.GetHexString(RandomPartLength, lowercase: true);
        var key = new ApiKey
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            KeyHash = Hash(rawKey),
            MaskedKey = $"{rawKey[..MaskedLeadingLength]}...{rawKey[^MaskedTrailingLength..]}",
            Description = description,
            CreatedAt = createdAt,
            IsActive = true,
            RateLimitTps = Math.Clamp(rateLimitTps, MinRateLimitTps, MaxRateLimitTps),
        };
        return (rawKey, key);
    }

    /// <summary>Lowercase hex SHA-256 of a raw key; the only form of the key that is stored or looked up.</summary>
    public static string Hash(string rawKey) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawKey))).ToLowerInvariant();

    /// <summary>Deactivates the key for good; revoking twice is harmless.</summary>
    public void Revoke() => IsActive = false;
}
