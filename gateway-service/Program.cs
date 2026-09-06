using System;
using System.Threading.RateLimiting;
using Element.Gateway.Middleware;
using Element.Shared.Extensions;
using Element.Shared.Middleware;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Serilog;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

// Console logging
builder.AddConsoleLogging("Element.Gateway");

// Add HttpClient for DatabaseCheckHandler and GraphQL BFF
builder.Services.AddHttpClient();
var elementServiceUrl = builder.Configuration["ElementServiceInternalUrl"]
    ?? builder.Configuration["ReverseProxy:Clusters:element-cluster:Destinations:destination1:Address"]
    ?? "http://localhost:5002";
builder.Services.AddHttpClient("ElementService", client =>
{
    client.BaseAddress = new Uri(elementServiceUrl);
});

// Add Redis
var redisConn = builder.Configuration.GetValue<string>("RedisConnection") ?? "localhost:6379";
var redisOptions = ConfigurationOptions.Parse(redisConn);
redisOptions.AbortOnConnectFail = false;
builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisOptions));

// Add YARP
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

builder.Services.AddHealthChecks()
    .AddRedis(redisConn, name: "Redis", failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Degraded);

// Add Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var apiKey = context.Request.Headers["X-API-Key"].ToString();
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var key = string.IsNullOrEmpty(apiKey) ? ip : apiKey;
        
        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100,
            Window = TimeSpan.FromSeconds(10),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 5
        });
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.HttpContext.Response.ContentType = "application/json";
        
        var problemDetails = new
        {
            Type = "https://httpstatuses.com/429",
            Title = "Rate Limit Exceeded",
            Status = StatusCodes.Status429TooManyRequests,
            Detail = "Too many requests. Please try again later.",
            Instance = context.HttpContext.Request.Path
        };
        
        await context.HttpContext.Response.WriteAsJsonAsync(problemDetails, token);
    };
});

// Add CORS
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()?.ToList()
    ?? ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"];
var publicOrigin = builder.Configuration["PUBLIC_WEB_ORIGIN"]
    ?? Environment.GetEnvironmentVariable("PUBLIC_WEB_ORIGIN");
if (!string.IsNullOrWhiteSpace(publicOrigin))
{
    var origin = publicOrigin.Trim().TrimEnd('/');
    if (!corsOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
        corsOrigins.Add(origin);
}
builder.Services.AddCors(options =>
{
    options.AddPolicy("PublicScience", policy => policy.AllowAnyOrigin().WithMethods("GET", "OPTIONS").AllowAnyHeader().WithExposedHeaders("ETag"));
    options.AddPolicy("ElementCors",
        policy =>
        {
            policy.WithOrigins(corsOrigins.ToArray())
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});


// Add GraphQL
builder.Services
    .AddGraphQLServer()
    .AddQueryType<Element.Gateway.GraphQL.Query>();

builder.Services.AddResponseCompression(options => { options.EnableForHttps = true; });
var app = builder.Build();

app.UseRequestLogging();
app.UseGlobalExceptionHandling();

app.UseRouting();
app.UseCors("ElementCors");
app.UseWhen(context => context.Request.Path.StartsWithSegments("/api/v2"), branch => branch.UseResponseCompression());

app.UseRateLimiter();

// Add API Key validation before YARP proxies requests
app.UseMiddleware<ApiKeyValidationMiddleware>();

app.MapReverseProxy();
app.MapGraphQL("/graphql");
app.MapStandardOpsEndpoints("Element.Gateway", new Dictionary<string, string>
{
    ["graphql"] = "/graphql",
    ["catalog"] = "/api/v1",
    ["auth"] = "/api/v1/auth/login",
    ["orders"] = "/api/v1/orders",
    ["notifications_hub"] = "/hub/notifications",
});

try
{
    Log.Information("Starting Element Gateway Proxy...");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Gateway host terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

