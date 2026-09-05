using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using StackExchange.Redis;

namespace Element.Gateway.Middleware.ApiKeyValidation;

public class RateLimitCheckHandler : ApiKeyValidationHandler
{
    private readonly IDatabase _redisDb;
    private const string RateLimitPrefix = "ratelimit:";

    public RateLimitCheckHandler(IConnectionMultiplexer redisMultiplexer)
    {
        _redisDb = redisMultiplexer.GetDatabase();
    }

    public override async Task<bool> HandleAsync(HttpContext context, string apiKey, ApiKeyValidationContext validationContext)
    {
        // Get hashed key (check context or recalculate)
        if (!context.Items.TryGetValue("HashedApiKey", out var hashedKeyObj) || hashedKeyObj == null)
        {
            var hashedKey = HashKey(apiKey);
            context.Items["HashedApiKey"] = hashedKey;
        }

        var hashedApiKey = (string)context.Items["HashedApiKey"]!;
        
        // Define fixed window key: ratelimit:hash:unix_timestamp
        var currentSecondEpoch = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var redisKey = $"{RateLimitPrefix}{hashedApiKey}:{currentSecondEpoch}";

        try
        {
            // Atomically increment the request count for this second
            var currentRequestCount = await _redisDb.StringIncrementAsync(redisKey);

            if (currentRequestCount == 1)
            {
                // Set expiry for 2 seconds so Redis cleans it up automatically
                await _redisDb.KeyExpireAsync(redisKey, TimeSpan.FromSeconds(2));
            }

            // Expose standard rate limit headers
            var limit = validationContext.RateLimitTps;
            var remaining = Math.Max(0, limit - currentRequestCount);
            
            context.Response.Headers["X-RateLimit-Limit"] = limit.ToString();
            context.Response.Headers["X-RateLimit-Remaining"] = remaining.ToString();

            if (currentRequestCount > limit)
            {
                context.Response.Headers["Retry-After"] = "1";
                validationContext.ErrorMessage = "Rate limit exceeded. Too many requests.";
                validationContext.StatusCode = StatusCodes.Status429TooManyRequests;
                return false;
            }
        }
        catch (Exception)
        {
            validationContext.ErrorMessage = "Rate limiter unavailable.";
            validationContext.StatusCode = StatusCodes.Status429TooManyRequests;
            return false;
        }

        if (NextHandler != null)
        {
            return await NextHandler.HandleAsync(context, apiKey, validationContext);
        }

        return true;
    }

    private string HashKey(string rawKey)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawKey));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
