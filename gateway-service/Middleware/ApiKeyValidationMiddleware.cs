using System.Text.Json;
using System.Threading.Tasks;
using Element.Gateway.Middleware.ApiKeyValidation;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using System.Net.Http;
using StackExchange.Redis;
using Yarp.ReverseProxy.Model;

namespace Element.Gateway.Middleware;

public class ApiKeyValidationMiddleware
{
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

    public async Task InvokeAsync(HttpContext context)
    {
        var endpoint = context.GetEndpoint();
        var routeModel = endpoint?.Metadata.GetMetadata<RouteModel>();

        // Check if route has "RequireApiKey" metadata set to "true"
        var requireApiKey = routeModel?.Config.Metadata?.TryGetValue("RequireApiKey", out var value) == true 
                            && value == "true";

        if (!requireApiKey)
        {
            await _next(context);
            return;
        }

        // API-key authentication does not populate HttpContext.User. Shared response
        // caches therefore cannot safely infer that wallet/order data is private.
        context.Response.Headers.CacheControl = "private, no-store";

        // Get API Key from header
        context.Request.Headers.TryGetValue("X-API-Key", out var apiKeyValues);
        var apiKey = apiKeyValues.ToString();

        // Construct Chain of Responsibility
        var headerCheck = new HeaderCheckHandler();
        var formatCheck = new FormatCheckHandler();
        var redisCheck = new RedisCacheCheckHandler(_redisMultiplexer);
        var dbCheck = new DatabaseCheckHandler(_httpClientFactory, _configuration);
        var rateLimitCheck = new RateLimitCheckHandler(_redisMultiplexer);

        headerCheck.SetNext(formatCheck)
                   .SetNext(redisCheck)
                   .SetNext(dbCheck)
                   .SetNext(rateLimitCheck);

        var validationContext = new ApiKeyValidationContext();

        // Execute chain
        var isAuthorized = await headerCheck.HandleAsync(context, apiKey, validationContext);

        if (!isAuthorized)
        {
            context.Response.StatusCode = validationContext.StatusCode;
            context.Response.ContentType = "application/json";

            var problemDetails = new
            {
                Type = "https://httpstatuses.com/" + validationContext.StatusCode,
                Title = "Authentication Failed",
                Status = validationContext.StatusCode,
                Detail = validationContext.ErrorMessage,
                Instance = context.Request.Path
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(problemDetails));
            return;
        }

        // Forward authenticated User ID to downstream services
        context.Request.Headers["X-User-Id"] = validationContext.UserId.ToString();
        context.Request.Headers["INTERNAL_API_KEY"] = _configuration["INTERNAL_API_KEY"];

        await _next(context);
    }
}
