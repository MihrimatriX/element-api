using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using StackExchange.Redis;

namespace Element.Gateway.Middleware.ApiKeyValidation;

public class RedisCacheCheckHandler : ApiKeyValidationHandler
{
    private readonly IDatabase _redisDb;
    private const string RedisKeyPrefix = "apikey:";

    public RedisCacheCheckHandler(IConnectionMultiplexer redisMultiplexer)
    {
        _redisDb = redisMultiplexer.GetDatabase();
    }

    public override async Task<bool> HandleAsync(HttpContext context, string apiKey, ApiKeyValidationContext validationContext)
    {
        var hashedKey = HashKey(apiKey);
        var redisKey = RedisKeyPrefix + hashedKey;

        try
        {
            var cachedValue = await _redisDb.StringGetAsync(redisKey);
            if (cachedValue.HasValue)
            {
                var cachedKey = JsonSerializer.Deserialize<CachedApiKey>(cachedValue!);
                if (cachedKey != null && cachedKey.IsActive)
                {
                    validationContext.IsActive = true;
                    validationContext.UserId = cachedKey.UserId;
                    validationContext.RateLimitTps = cachedKey.RateLimitTps;
                    
                    context.Items["HashedApiKey"] = hashedKey; // Save for Rate Limiter
                }
            }
        }
        catch (Exception)
        {
            // Redis error should not bring down the gateway, fall back to DB/Identity Service
        }

        if (NextHandler != null)
        {
            return await NextHandler.HandleAsync(context, apiKey, validationContext);
        }

        return validationContext.IsActive;
    }

    private string HashKey(string rawKey)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawKey));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    // Matching the DTO structure of Identity Service ApiKey
    private class CachedApiKey
    {
        public Guid UserId { get; set; }
        public bool IsActive { get; set; }
        public int RateLimitTps { get; set; }
    }
}
