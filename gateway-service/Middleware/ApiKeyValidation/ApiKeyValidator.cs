using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using StackExchange.Redis;

namespace Element.Gateway.Middleware.ApiKeyValidation;

/// <summary>Outcome of an API-key check: who the caller is, their per-second quota, and the error to return when it failed.</summary>
public sealed class ApiKeyValidationContext
{
    public Guid UserId { get; set; }
    public int RateLimitTps { get; set; } = 10;
    public bool IsActive { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;
    public int StatusCode { get; set; } = 200;
}

/// <summary>
/// Validates an X-API-Key in three steps: format check, identity-service lookup
/// (always live, so revocation takes effect immediately) and a per-key requests-per-second limit in Redis.
/// </summary>
public static class ApiKeyValidator
{
    private const string LiveKeyPrefix = "ele_live_";
    // "ele_live_" (9 characters) followed by 32 random characters.
    private const int LiveKeyLength = 41;
    private const string RateLimitPrefix = "ratelimit:";
    private const string DefaultIdentityUrl = "http://localhost:5001";
    private const string InternalApiKeyName = "INTERNAL_API_KEY";

    private static readonly TimeSpan IdentityTimeout = TimeSpan.FromSeconds(5);
    // Each counter covers one second; Redis drops it shortly after that second is over.
    private static readonly TimeSpan RateCounterLifetime = TimeSpan.FromSeconds(2);
    private static readonly JsonSerializerOptions IdentityJsonOptions = new() { PropertyNameCaseInsensitive = true };

    /// <summary>
    /// Runs every check in order and stops at the first failure. Also stores the SHA-256 of the key in
    /// <c>HttpContext.Items["HashedApiKey"]</c> and sets the X-RateLimit-* response headers.
    /// </summary>
    public static async Task<(bool Ok, ApiKeyValidationContext Context)> ValidateApiKeyAsync(
        HttpContext context,
        string apiKey,
        IConnectionMultiplexer redisMultiplexer,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        var validation = new ApiKeyValidationContext();

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return Reject(validation, StatusCodes.Status401Unauthorized,
                "API Key is missing. Please provide it in the 'X-API-Key' header.");
        }

        if (!apiKey.StartsWith(LiveKeyPrefix) || apiKey.Length != LiveKeyLength)
        {
            return Reject(validation, StatusCodes.Status400BadRequest,
                "API Key format is invalid. It should start with 'ele_live_' followed by 32 characters.");
        }

        var redisDb = redisMultiplexer.GetDatabase();
        var hashedKey = HashKey(apiKey);
        context.Items["HashedApiKey"] = hashedKey;

        // Always consult identity so revocation and password changes take effect immediately.
        IdentityValidationResponse? identityAnswer;
        try
        {
            identityAnswer = await AskIdentityAsync(context, apiKey, httpClientFactory, configuration);
        }
        catch (Exception)
        {
            return Reject(validation, StatusCodes.Status503ServiceUnavailable,
                "Identity Service is temporarily unavailable.");
        }

        if (identityAnswer is not { IsActive: true })
        {
            return Reject(validation, StatusCodes.Status401Unauthorized,
                "API Key is invalid or inactive.");
        }

        validation.IsActive = true;
        validation.UserId = identityAnswer.UserId == Guid.Empty ? identityAnswer.Id : identityAnswer.UserId;
        validation.RateLimitTps = identityAnswer.RateLimitTps;

        bool isWithinQuota;
        try
        {
            isWithinQuota = await CountRequestAndCheckQuotaAsync(context, redisDb, hashedKey, validation.RateLimitTps);
        }
        catch (Exception)
        {
            // Fail closed: without Redis we cannot enforce the quota.
            return Reject(validation, StatusCodes.Status429TooManyRequests, "Rate limiter unavailable.");
        }

        if (!isWithinQuota)
        {
            context.Response.Headers["Retry-After"] = "1";
            return Reject(validation, StatusCodes.Status429TooManyRequests, "Rate limit exceeded. Too many requests.");
        }

        return (true, validation);
    }

    /// <summary>
    /// Posts the raw key to identity-service's internal validate endpoint.
    /// Returns null when identity answers with a non-success status (unknown key); throws when identity is down (5xx, timeout, network).
    /// </summary>
    private static async Task<IdentityValidationResponse?> AskIdentityAsync(
        HttpContext context,
        string apiKey,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        var identityUrl = configuration["IdentityServiceInternalUrl"] ?? DefaultIdentityUrl;
        var client = httpClientFactory.CreateClient();

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{identityUrl}/api/v1/internal/api-keys/validate");
        request.Content = JsonContent.Create(new { RawKey = apiKey });

        var internalKey = configuration[InternalApiKeyName];
        if (!string.IsNullOrEmpty(internalKey))
            request.Headers.TryAddWithoutValidation(InternalApiKeyName, internalKey);

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted);
        timeout.CancelAfter(IdentityTimeout);

        using var response = await client.SendAsync(request, timeout.Token);
        if ((int)response.StatusCode >= 500)
            throw new HttpRequestException("Identity unavailable");

        if (!response.IsSuccessStatusCode)
            return null;

        var content = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<IdentityValidationResponse>(content, IdentityJsonOptions);
    }

    /// <summary>
    /// Increments the Redis counter for this key and the current second, writes the X-RateLimit-* headers,
    /// and returns false once the count goes over <paramref name="limitPerSecond"/>.
    /// </summary>
    private static async Task<bool> CountRequestAndCheckQuotaAsync(
        HttpContext context,
        IDatabase redisDb,
        string hashedKey,
        int limitPerSecond)
    {
        var currentSecond = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var counterKey = $"{RateLimitPrefix}{hashedKey}:{currentSecond}";

        var requestCountThisSecond = await redisDb.StringIncrementAsync(counterKey);
        if (requestCountThisSecond == 1)
            await redisDb.KeyExpireAsync(counterKey, RateCounterLifetime);

        var remaining = Math.Max(0, limitPerSecond - requestCountThisSecond);
        context.Response.Headers["X-RateLimit-Limit"] = limitPerSecond.ToString();
        context.Response.Headers["X-RateLimit-Remaining"] = remaining.ToString();

        return requestCountThisSecond <= limitPerSecond;
    }

    private static (bool Ok, ApiKeyValidationContext Context) Reject(
        ApiKeyValidationContext validation,
        int statusCode,
        string errorMessage)
    {
        validation.StatusCode = statusCode;
        validation.ErrorMessage = errorMessage;
        return (false, validation);
    }

    // Only the hash is used as a Redis key, so raw keys never land in Redis.
    private static string HashKey(string rawKey)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawKey));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private sealed class IdentityValidationResponse
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public bool IsActive { get; set; }
        public int RateLimitTps { get; set; }
    }
}
