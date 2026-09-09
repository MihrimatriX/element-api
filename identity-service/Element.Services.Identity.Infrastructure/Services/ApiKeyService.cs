using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Element.Services.Identity.Core.Entities;
using Element.Services.Identity.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace Element.Services.Identity.Infrastructure.Services;

public class ApiKeyService
{
    private readonly IdentityAppDbContext _context;
    private readonly IDatabase _redisDb;
    private const string RedisKeyPrefix = "apikey:";

    public ApiKeyService(IdentityAppDbContext context, IConnectionMultiplexer redisMultiplexer)
    {
        _context = context;
        _redisDb = redisMultiplexer.GetDatabase();
    }

    public async Task<(string RawKey, ApiKey ApiKeyRecord)> GenerateKeyAsync(Guid userId, string description, int rateLimitTps = 10)
    {
        rateLimitTps = Math.Clamp(rateLimitTps, 1, 10);
        // 1. Generate unique raw key: ele_live_ + 32 random characters
        var randomBytes = new byte[24];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }
        var suffix = Convert.ToHexString(randomBytes).ToLowerInvariant();
        if (suffix.Length < 32)
            suffix = suffix.PadRight(32, '0');
        var rawKey = $"ele_live_{suffix[..32]}";

        // 2. Hash raw key
        var hashedKey = HashKey(rawKey);

        // 3. Create Masked Key for display (e.g. ele_live_abcd...1234)
        var maskedKey = $"{rawKey.Substring(0, 13)}...{rawKey.Substring(rawKey.Length - 4)}";

        var apiKey = new ApiKey
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            KeyHash = hashedKey,
            MaskedKey = maskedKey,
            Description = description,
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
            RateLimitTps = rateLimitTps
        };

        // 4. Save to Database
        _context.ApiKeys.Add(apiKey);
        await _context.SaveChangesAsync();

        // 5. Save to Redis Cache (Serialize model)
        await CacheKeyInRedisAsync(hashedKey, apiKey);

        return (rawKey, apiKey);
    }

    public async Task<bool> RevokeKeyAsync(Guid userId, Guid keyId)
    {
        var apiKey = await _context.ApiKeys.FirstOrDefaultAsync(k => k.Id == keyId && k.UserId == userId);
        if (apiKey == null) return false;

        apiKey.IsActive = false;
        await _context.SaveChangesAsync();

        // Remove or update in Redis
        var redisKey = RedisKeyPrefix + apiKey.KeyHash;
        await _redisDb.KeyDeleteAsync(redisKey);

        return true;
    }

    public async Task<ApiKey?> ValidateKeyAsync(string rawKey)
    {
        if (string.IsNullOrWhiteSpace(rawKey)) return null;

        var hashedKey = HashKey(rawKey);
        var redisKey = RedisKeyPrefix + hashedKey;

        // 1. Check Redis Cache
        var cachedValue = await _redisDb.StringGetAsync(redisKey);
        if (cachedValue.HasValue)
        {
            var cachedKey = JsonSerializer.Deserialize<ApiKey>(cachedValue!);
            if (cachedKey != null && cachedKey.IsActive)
            {
                return cachedKey;
            }
            return null;
        }

        // 2. Check Database
        var apiKey = await _context.ApiKeys.FirstOrDefaultAsync(k => k.KeyHash == hashedKey);
        if (apiKey != null)
        {
            // Sync with Redis for next requests
            if (apiKey.IsActive)
            {
                await CacheKeyInRedisAsync(hashedKey, apiKey);
                return apiKey;
            }
        }

        return null;
    }

    private async Task CacheKeyInRedisAsync(string hashedKey, ApiKey apiKey)
    {
        var redisKey = RedisKeyPrefix + hashedKey;
        var jsonValue = JsonSerializer.Serialize(apiKey);
        // Cache API key configuration for 24 hours
        await _redisDb.StringSetAsync(redisKey, jsonValue, TimeSpan.FromHours(24));
    }

    private string HashKey(string rawKey)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawKey));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
