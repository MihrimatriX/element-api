using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using StackExchange.Redis;

namespace Element.Gateway.Middleware.ApiKeyValidation;

public sealed class ApiKeyValidationContext
{
    public Guid UserId { get; set; }
    public int RateLimitTps { get; set; } = 10;
    public bool IsActive { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;
    public int StatusCode { get; set; } = 200;
}

/// <summary>
/// Sequential API-key checks formerly split across CoR handlers.
/// </summary>
public static class ApiKeyValidator
{
    private const string RedisKeyPrefix = "apikey:";
    private const string RateLimitPrefix = "ratelimit:";

    public static async Task<(bool Ok, ApiKeyValidationContext Context)> ValidateApiKeyAsync(
        HttpContext context,
        string apiKey,
        IConnectionMultiplexer redisMultiplexer,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        var vc = new ApiKeyValidationContext();

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            vc.ErrorMessage = "API Key is missing. Please provide it in the 'X-API-Key' header.";
            vc.StatusCode = StatusCodes.Status401Unauthorized;
            return (false, vc);
        }

        if (!apiKey.StartsWith("ele_live_") || apiKey.Length != 41)
        {
            vc.ErrorMessage = "API Key format is invalid. It should start with 'ele_live_' followed by 32 characters.";
            vc.StatusCode = StatusCodes.Status400BadRequest;
            return (false, vc);
        }

        var redisDb = redisMultiplexer.GetDatabase();
        var hashedKey = HashKey(apiKey);
        context.Items["HashedApiKey"] = hashedKey;

        try
        {
            var cachedValue = await redisDb.StringGetAsync(RedisKeyPrefix + hashedKey);
            if (cachedValue.HasValue)
            {
                var cachedKey = JsonSerializer.Deserialize<CachedApiKey>(cachedValue!);
                if (cachedKey is { IsActive: true })
                {
                    vc.IsActive = true;
                    vc.UserId = cachedKey.UserId;
                    vc.RateLimitTps = cachedKey.RateLimitTps;
                }
            }
        }
        catch (Exception)
        {
            // Redis miss/error: fall through to identity.
        }

        if (!vc.IsActive)
        {
            try
            {
                var identityUrl = configuration["IdentityServiceInternalUrl"] ?? "http://localhost:5001";
                var client = httpClientFactory.CreateClient();
                using var req = new HttpRequestMessage(HttpMethod.Post, $"{identityUrl}/api/v1/internal/api-keys/validate");
                req.Content = JsonContent.Create(new { RawKey = apiKey });
                var internalKey = configuration["INTERNAL_API_KEY"];
                if (!string.IsNullOrEmpty(internalKey))
                    req.Headers.TryAddWithoutValidation("INTERNAL_API_KEY", internalKey);

                var response = await client.SendAsync(req);
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<IdentityValidationResponse>(content, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    if (result is { IsActive: true })
                    {
                        vc.IsActive = true;
                        vc.UserId = result.UserId == Guid.Empty ? result.Id : result.UserId;
                        vc.RateLimitTps = result.RateLimitTps;
                    }
                }
            }
            catch (Exception ex)
            {
                vc.ErrorMessage = $"Identity Service is temporarily unavailable. Error: {ex.Message}";
                vc.StatusCode = StatusCodes.Status503ServiceUnavailable;
                return (false, vc);
            }

            if (!vc.IsActive)
            {
                vc.ErrorMessage = "API Key is invalid or inactive.";
                vc.StatusCode = StatusCodes.Status401Unauthorized;
                return (false, vc);
            }
        }

        var currentSecondEpoch = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var rateKey = $"{RateLimitPrefix}{hashedKey}:{currentSecondEpoch}";

        try
        {
            var currentRequestCount = await redisDb.StringIncrementAsync(rateKey);
            if (currentRequestCount == 1)
                await redisDb.KeyExpireAsync(rateKey, TimeSpan.FromSeconds(2));

            var limit = vc.RateLimitTps;
            var remaining = Math.Max(0, limit - currentRequestCount);
            context.Response.Headers["X-RateLimit-Limit"] = limit.ToString();
            context.Response.Headers["X-RateLimit-Remaining"] = remaining.ToString();

            if (currentRequestCount > limit)
            {
                context.Response.Headers["Retry-After"] = "1";
                vc.ErrorMessage = "Rate limit exceeded. Too many requests.";
                vc.StatusCode = StatusCodes.Status429TooManyRequests;
                return (false, vc);
            }
        }
        catch (Exception)
        {
            vc.ErrorMessage = "Rate limiter unavailable.";
            vc.StatusCode = StatusCodes.Status429TooManyRequests;
            return (false, vc);
        }

        return (true, vc);
    }

    private static string HashKey(string rawKey)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawKey));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private sealed class CachedApiKey
    {
        public Guid UserId { get; set; }
        public bool IsActive { get; set; }
        public int RateLimitTps { get; set; }
    }

    private sealed class IdentityValidationResponse
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public bool IsActive { get; set; }
        public int RateLimitTps { get; set; }
    }
}
