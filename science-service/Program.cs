using System.Text.Json.Nodes;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;

// Standalone atlas: serves the static web app plus the read-only scientific v2 API.
// No database, broker or accounts; the two JSON snapshots are the only data.

const int ExpectedElementCount = 118;
const int ApiRequestsPerMinutePerIp = 300;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddResponseCompression(options => options.EnableForHttps = true);
// Same policy as web-app/nginx.conf. Without it index.html gets heuristic caching and can point at deleted /assets after a redeploy.
builder.Services.Configure<StaticFileOptions>(options => options.OnPrepareResponse = file =>
    file.Context.Response.Headers.CacheControl = StaticFileCacheControl(file.Context.Request.Path));
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .AllowAnyOrigin()
    .WithMethods("GET", "OPTIONS")
    .AllowAnyHeader()
    .WithExposedHeaders("ETag")));
// Behind a reverse proxy (host Caddy, a platform ingress) the TCP peer is the proxy, so the per-IP limiter
// would put every visitor in one bucket. Take the client from X-Forwarded-For, but only when the peer is
// loopback or on a private network: a caller that reaches this port directly cannot spoof its way past the limit.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor;
    foreach (var privateNetwork in new[] { "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "169.254.0.0/16", "fc00::/7" })
        options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(privateNetwork));
});
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ChooseRateLimitPartition);
    options.OnRejected = (rejection, _) =>
    {
        if (rejection.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            rejection.HttpContext.Response.Headers.RetryAfter = Math.Ceiling(retryAfter.TotalSeconds).ToString("0");
        return ValueTask.CompletedTask;
    };
});

// Load before becoming ready; broken or empty snapshots must fail startup.
var elements = LoadSnapshot("scientific-elements.json");
var compounds = LoadSnapshot("scientific-compounds.json");
if (elements.Count != ExpectedElementCount || compounds.Count == 0)
    throw new InvalidDataException("Scientific snapshot is incomplete.");

var unavailableElementSections = FindSectionsEmptyInEveryRecord(elements);

var app = builder.Build();

app.UseForwardedHeaders();
app.UseExceptionHandler(handler => handler.Run(async context =>
{
    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await context.Response.WriteAsJsonAsync(new { title = "Scientific catalog unavailable", status = 500 });
}));
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    await next();
});
app.UseResponseCompression();
app.UseCors();
app.UseRateLimiter();

app.MapControllers();
app.MapGet("/health", () => Results.Json(new { status = "Healthy", service = "Element.Science" }));
app.MapGet("/health/live", () => Results.Json(new { status = "Healthy" }));
app.MapGet("/health/ready", () => Results.Json(new { status = "Healthy" }));
app.MapGet("/info", () => Results.Json(new
{
    name = "Element.Science",
    version = "2.0",
    dependencies = Array.Empty<string>(),
    api = "/api/v2/elements",
}));
app.MapGet("/api/v2/coverage", (HttpResponse response) =>
{
    response.Headers.CacheControl = "public, max-age=3600"; // snapshot-derived, same policy as the v2 catalog
    return Results.Json(new
    {
        schemaVersion = "2.0",
        elements = elements.Count,
        compounds = compounds.Count,
        retrievedAt = elements[0]!["provenance"]!["retrieved_at"]!.ToString(),
        unavailableElementSections,
        nullMeaning = "Not available in this snapshot; not zero.",
    });
});

// API misses must stay JSON 404s; they must never fall through to the SPA.
app.MapFallback("/api/{**path}", () => Results.Problem(statusCode: 404, title: "Endpoint not available in the scientific profile"));

app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

app.Run();

// Only /api is throttled (per client IP); the static site is never limited.
static RateLimitPartition<string> ChooseRateLimitPartition(HttpContext context)
{
    if (!context.Request.Path.StartsWithSegments("/api"))
        return RateLimitPartition.GetNoLimiter("static");

    var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    return RateLimitPartition.GetFixedWindowLimiter(clientIp, _ => new FixedWindowRateLimiterOptions
    {
        PermitLimit = ApiRequestsPerMinutePerIp,
        Window = TimeSpan.FromMinutes(1),
        QueueLimit = 0,
    });
}

// Hashed build assets are immutable, media/brand images change rarely, everything else (index.html) must revalidate.
static string StaticFileCacheControl(PathString path)
{
    if (path.StartsWithSegments("/assets"))
        return "public, max-age=31536000, immutable";
    if (path.StartsWithSegments("/media") || path.StartsWithSegments("/brand"))
        return "public, max-age=604800";
    return "no-cache";
}

// Reads Data/<fileName> next to the binary as a JSON array.
static JsonArray LoadSnapshot(string fileName)
{
    var snapshotPath = Path.Combine(AppContext.BaseDirectory, "Data", fileName);
    return JsonNode.Parse(File.ReadAllText(snapshotPath))!.AsArray();
}

// Top-level sections (taken from the first element) that no element has any data for.
static string[] FindSectionsEmptyInEveryRecord(JsonArray records)
{
    var sectionNames = records[0]!.AsObject().Select(section => section.Key);
    return sectionNames
        .Where(sectionName => !records.Any(record => IsPopulated(record?[sectionName])))
        .ToArray();
}

// A value counts as populated when it holds at least one non-empty scalar somewhere inside it.
static bool IsPopulated(JsonNode? node) => node switch
{
    null => false,
    JsonObject jsonObject => jsonObject.Any(property => IsPopulated(property.Value)),
    JsonArray jsonArray => jsonArray.Any(IsPopulated),
    _ => node.ToString().Length > 0,
};

/// <summary>Makes the generated entry-point class public so test hosts (WebApplicationFactory) can reference it.</summary>
public partial class Program { }
