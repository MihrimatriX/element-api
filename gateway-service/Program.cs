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

// Add Enterprise Logging (Serilog + Seq)
builder.AddEnterpriseLogging("Element.Gateway");
builder.AddEnterpriseTracing("Element.Gateway");

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
try
{
    builder.Services.AddSingleton<IConnectionMultiplexer>(ConnectionMultiplexer.Connect(redisConn));
    Log.Information("Connected to Redis successfully.");
}
catch (Exception ex)
{
    Log.Error(ex, "Failed to connect to Redis.");
}

// Add YARP
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

builder.Services.AddHealthChecks()
    .AddRedis(redisConn, name: "Redis", failureStatus: Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Degraded);

// Add Health Checks UI
builder.Services.AddHealthChecksUI(setup =>
{
    setup.SetEvaluationTimeInSeconds(15);
    setup.MaximumHistoryEntriesPerEndpoint(60);
    setup.AddHealthCheckEndpoint("Identity API", "http://identity-service:8080/health");
    setup.AddHealthCheckEndpoint("Element Market API", "http://catalog-service:8080/health");
    setup.AddHealthCheckEndpoint("Order API", "http://order-service:8080/health");
    setup.AddHealthCheckEndpoint("Payment API", "http://payment-service:8080/health");
    setup.AddHealthCheckEndpoint("Shipment API", "http://shipment-service:8080/health");
    setup.AddHealthCheckEndpoint("Notification API", "http://notification-service:8080/health");
}).AddInMemoryStorage();

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

// Add Output Caching
builder.Services.AddOutputCache(options =>
{
    options.AddBasePolicy(builder => builder.Expire(TimeSpan.FromSeconds(5)));
    options.AddPolicy("ElementsCache", builder => builder.Expire(TimeSpan.FromSeconds(15)));
});

// Add CORS
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"];
builder.Services.AddCors(options =>
{
    options.AddPolicy("ElementCors",
        policy =>
        {
            policy.WithOrigins(corsOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});


// Add GraphQL
builder.Services
    .AddGraphQLServer()
    .AddQueryType<Element.Gateway.GraphQL.Query>();

var app = builder.Build();

app.UseEnterpriseLogging();
app.UseGlobalExceptionHandling();

app.UseCors("ElementCors");

app.UseRateLimiter();

app.UseRouting();

// Add API Key validation before YARP proxies requests
app.UseMiddleware<ApiKeyValidationMiddleware>();

app.UseOutputCache();

app.MapReverseProxy();
app.MapGraphQL("/graphql");
app.MapPrometheusScrapingEndpoint();
app.MapStandardOpsEndpoints("Element.Gateway", new Dictionary<string, string>
{
    ["health_ui"] = "/health-ui",
    ["graphql"] = "/graphql",
    ["catalog"] = "/api/v1",
    ["auth"] = "/api/v1/auth/login",
    ["orders"] = "/api/v1/orders",
    ["notifications_hub"] = "/hub/notifications",
    ["metrics"] = "/metrics",
    ["observability_hub"] = "http://localhost:8888"
});
app.MapHealthChecksUI(setup => setup.UIPath = "/health-ui");

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

