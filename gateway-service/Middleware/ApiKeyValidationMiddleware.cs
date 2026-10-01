using System.Text.Json;
using Element.Gateway.Middleware.ApiKeyValidation;
using StackExchange.Redis;
using Yarp.ReverseProxy.Model;

namespace Element.Gateway.Middleware;

/// <summary>
/// Guards YARP routes marked with <c>Metadata.RequireApiKey = "true"</c>: validates the X-API-Key header and,
/// on success, forwards the caller's user id and the internal service key to the backend.
/// </summary>
public class ApiKeyValidationMiddleware
{
    private const string RequireApiKeyMetadataKey = "RequireApiKey";
    private const string ApiKeyHeaderName = "X-API-Key";
    private const string UserIdHeaderName = "X-User-Id";
    // Same name is used for the config key and the header the backends check.
    private const string InternalApiKeyName = "INTERNAL_API_KEY";

    private readonly RequestDelegate _next;
    private readonly IConnectionMultiplexer _redisMultiplexer;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public ApiKeyValidationMiddleware(
        RequestDelegate next,
        IConnectionMultiplexer redisMultiplexer,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _next = next;
        _redisMultiplexer = redisMultiplexer;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    /// <summary>
    /// Headers downstream services trust as "set by the gateway". A client must never be able to send them,
    /// on any route — not only the API-key routes that overwrite them below.
    /// </summary>
    internal static readonly string[] TrustedHeaders = [UserIdHeaderName, InternalApiKeyName];

    /// <summary>
    /// Strips client-supplied trusted headers on every route, passes public routes through, and for protected
    /// routes rejects invalid keys with a JSON problem or enriches the request and continues.
    /// </summary>
    public async Task InvokeAsync(HttpContext context)
    {
        foreach (var header in TrustedHeaders)
            context.Request.Headers.Remove(header);

        if (!RouteRequiresApiKey(context))
        {
            await _next(context);
            return;
        }

        // API-key authentication does not populate HttpContext.User. Shared response
        // caches therefore cannot safely infer that wallet/order data is private.
        context.Response.Headers.CacheControl = "private, no-store";

        context.Request.Headers.TryGetValue(ApiKeyHeaderName, out var apiKeyValues);
        var (isValid, validation) = await ApiKeyValidator.ValidateApiKeyAsync(
            context, apiKeyValues.ToString(), _redisMultiplexer, _httpClientFactory, _configuration);

        if (!isValid)
        {
            await WriteAuthenticationProblemAsync(context, validation);
            return;
        }

        context.Request.Headers[UserIdHeaderName] = validation.UserId.ToString();
        context.Request.Headers[InternalApiKeyName] = _configuration[InternalApiKeyName];

        await _next(context);
    }

    private static bool RouteRequiresApiKey(HttpContext context)
    {
        var routeModel = context.GetEndpoint()?.Metadata.GetMetadata<RouteModel>();
        var routeMetadata = routeModel?.Config.Metadata;

        return routeMetadata?.TryGetValue(RequireApiKeyMetadataKey, out var value) == true
            && value == "true";
    }

    private static async Task WriteAuthenticationProblemAsync(HttpContext context, ApiKeyValidationContext validation)
    {
        context.Response.StatusCode = validation.StatusCode;
        context.Response.ContentType = "application/json";

        // Serialized with default (PascalCase) options; clients already depend on this shape.
        var problemDetails = new
        {
            Type = "https://httpstatuses.com/" + validation.StatusCode,
            Title = "Authentication Failed",
            Status = validation.StatusCode,
            Detail = validation.ErrorMessage,
            Instance = context.Request.Path,
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(problemDetails));
    }
}
