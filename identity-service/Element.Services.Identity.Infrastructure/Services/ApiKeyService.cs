using System.Security.Cryptography;
using System.Text;
using Element.Services.Identity.Core.Entities;
using Element.Services.Identity.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Identity.Infrastructure.Services;

/// <summary>
/// Issues, revokes and validates API keys. Only a SHA-256 hash of each key is stored, so the database alone cannot be used to call the API.
/// </summary>
public class ApiKeyService
{
    private const string RawKeyPrefix = "ele_live_";
    private const int RandomPartLength = 32;
    private const int MinRateLimitTps = 1;
    private const int MaxRateLimitTps = 10;

    // The masked form keeps the prefix plus 4 random characters and the last 4 characters: "ele_live_abcd...1234".
    private const int MaskedLeadingLength = 13;
    private const int MaskedTrailingLength = 4;

    private readonly IdentityAppDbContext _context;

    /// <summary>Creates the service on top of the identity database.</summary>
    public ApiKeyService(IdentityAppDbContext context)
    {
        _context = context;
    }

    /// <summary>Creates and stores a new active key; returns the raw key (shown to the user once) and the stored record.</summary>
    public async Task<(string RawKey, ApiKey ApiKeyRecord)> GenerateKeyAsync(Guid userId, string description, int rateLimitTps = MaxRateLimitTps)
    {
        var rawKey = RawKeyPrefix + RandomNumberGenerator.GetHexString(RandomPartLength, lowercase: true);

        var apiKey = new ApiKey
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            KeyHash = HashKey(rawKey),
            MaskedKey = MaskKey(rawKey),
            Description = description,
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
            // Callers may ask for less, never for more than the platform limit.
            RateLimitTps = Math.Clamp(rateLimitTps, MinRateLimitTps, MaxRateLimitTps),
        };

        _context.ApiKeys.Add(apiKey);
        await _context.SaveChangesAsync();

        return (rawKey, apiKey);
    }

    /// <summary>Deactivates a key owned by the user; returns false when the user has no key with that id.</summary>
    public async Task<bool> RevokeKeyAsync(Guid userId, Guid keyId)
    {
        var apiKey = await _context.ApiKeys.FirstOrDefaultAsync(key => key.Id == keyId && key.UserId == userId);
        if (apiKey is null)
        {
            return false;
        }

        apiKey.IsActive = false;
        await _context.SaveChangesAsync();
        // No cache to evict: gateway validates every call against the database via /internal/api-keys/validate.
        return true;
    }

    /// <summary>Returns the active key matching the raw value, or null. Reads the database every time so revocation is immediate.</summary>
    public async Task<ApiKey?> ValidateKeyAsync(string rawKey)
    {
        if (string.IsNullOrWhiteSpace(rawKey))
        {
            return null;
        }

        var keyHash = HashKey(rawKey);
        return await _context.ApiKeys
            .AsNoTracking()
            .FirstOrDefaultAsync(key => key.KeyHash == keyHash && key.IsActive);
    }

    private static string HashKey(string rawKey)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawKey));
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    private static string MaskKey(string rawKey)
    {
        return $"{rawKey[..MaskedLeadingLength]}...{rawKey[^MaskedTrailingLength..]}";
    }
}
