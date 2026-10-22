using System.Threading.RateLimiting;
using Element.Gateway;
using Element.Gateway.Middleware;
using Element.Shared.Extensions;
using Element.Shared.Middleware;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Serilog;
using StackExchange.Redis;

// CORS policy names. "PublicScience" is also referenced by the v2 routes in appsettings.json.
const string PublicScienceCorsPolicy = "PublicScience";
const string ElementCorsPolicy = "ElementCors";
const string DefaultRedisConnection = "localhost:6379";
const long MaxRequestBodyBytes = 1_048_576; // 1 MB

var builder = WebApplication.CreateBuilder(args);

// Same 1MB cap as Caddy, so it also holds when the gateway port is reached directly (base compose).
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = MaxRequestBodyBytes;
    options.AddServerHeader = false;
});

builder.AddConsoleLogging("Element.Gateway");

// Used by ApiKeyValidator to ask identity-service whether an API key is valid.
builder.Services.AddHttpClient();

var redisConnection = builder.Configuration.GetValue<string>("RedisConnection") ?? DefaultRedisConnection;
var redisOptions = ConfigurationOptions.Parse(redisConnection);
redisOptions.AbortOnConnectFail = false;
builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisOptions));

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

builder.Services.AddHealthChecks()
    // Timeout keeps /health answering (Degraded) inside the compose curl timeout (5s) when Redis is slow/unreachable.
    .AddRedis(redisConnection, name: "Redis", failureStatus: HealthStatus.Degraded, timeout: TimeSpan.FromSeconds(3));

// Per-IP edge quotas; the numbers live in RateLimitPolicy (register / auth / public).
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var (partitionKey, permitLimit, window) = RateLimitPolicy.Resolve(context);
        return RateLimitPartition.GetFixedWindowLimiter(partitionKey, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = permitLimit,
            Window = window,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0,
        });
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = WriteRateLimitProblemAsync;
});

var corsOrigins = ResolveCorsOrigins(builder.Configuration);
builder.Services.AddCors(options =>
{
    // Scientific v2 data is public: any site may read it, but only with GET.
    options.AddPolicy(PublicScienceCorsPolicy, policy => policy
        .AllowAnyOrigin()
        .WithMethods("GET", "OPTIONS")
        .AllowAnyHeader()
        .WithExposedHeaders("ETag"));

    options.AddPolicy(ElementCorsPolicy, policy => policy
        .WithOrigins(corsOrigins.ToArray())
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

builder.Services.AddResponseCompression(options => options.EnableForHttps = true);

var app = builder.Build();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseRequestLogging();
app.UseGlobalExceptionHandling();

app.UseRouting();
app.UseCors(ElementCorsPolicy);
app.UseWhen(
    context => context.Request.Path.StartsWithSegments("/api/v2"),
    branch => branch.UseResponseCompression());

app.UseRateLimiter();

// Must run before YARP so protected routes are rejected without reaching a backend.
app.UseMiddleware<ApiKeyValidationMiddleware>();

app.MapReverseProxy();
app.MapStandardOpsEndpoints("Element.Gateway", new Dictionary<string, string>
{
    ["catalog"] = "/api/v1",
    ["auth"] = "/api/v1/auth/login",
    ["orders"] = "/api/v1/orders",
});

try
{
    Log.Information("Starting Element Gateway Proxy...");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Gateway host terminated unexpectedly");
    Environment.ExitCode = 1; // non-zero so the container runtime sees a failure, not a clean exit
}
finally
{
    Log.CloseAndFlush();
}

// Configured origins (or local dev defaults) plus PUBLIC_WEB_ORIGIN when a public host is deployed.
static List<string> ResolveCorsOrigins(IConfiguration configuration)
{
    var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()?.ToList()
        ?? ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"];

    var publicOrigin = configuration["PUBLIC_WEB_ORIGIN"]
        ?? Environment.GetEnvironmentVariable("PUBLIC_WEB_ORIGIN");
    if (string.IsNullOrWhiteSpace(publicOrigin))
        return origins;

    var normalizedOrigin = publicOrigin.Trim().TrimEnd('/');
    if (!origins.Contains(normalizedOrigin, StringComparer.OrdinalIgnoreCase))
        origins.Add(normalizedOrigin);

    return origins;
}

// Writes a JSON problem body for 429 responses; sign-up attempts get a friendlier message.
static async ValueTask WriteRateLimitProblemAsync(OnRejectedContext rejection, CancellationToken cancellationToken)
{
    var httpContext = rejection.HttpContext;
    var detail = RateLimitPolicy.IsSignUpRequest(httpContext.Request)
        ? "Too many sign-up attempts from this address. Wait a minute and try again."
        : "Too many requests. Please try again later.";

    var problemDetails = new
    {
        Type = "https://httpstatuses.com/429",
        Title = "Rate Limit Exceeded",
        Status = StatusCodes.Status429TooManyRequests,
        Detail = detail,
        Instance = httpContext.Request.Path,
    };

    httpContext.Response.ContentType = "application/json";
    await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
}

/// <summary>Makes the generated entry-point class public so the integration tests can host the gateway with WebApplicationFactory.</summary>
public partial class Program { }
