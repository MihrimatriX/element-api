using System.Text.Json;
using Element.Gateway.Middleware.ApiKeyValidation;
using Microsoft.Extensions.Configuration;
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

        context.Request.Headers.TryGetValue("X-API-Key", out var apiKeyValues);
        var (ok, validationContext) = await ApiKeyValidator.ValidateApiKeyAsync(
            context, apiKeyValues.ToString(), _redisMultiplexer, _httpClientFactory, _configuration);

        if (!ok)
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

        context.Request.Headers["X-User-Id"] = validationContext.UserId.ToString();
        context.Request.Headers["INTERNAL_API_KEY"] = _configuration["INTERNAL_API_KEY"];

        await _next(context);
    }
}
