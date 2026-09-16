using System.Text.Json.Nodes;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddResponseCompression(options => options.EnableForHttps = true);
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.AllowAnyOrigin().WithMethods("GET", "OPTIONS").AllowAnyHeader().WithExposedHeaders("ETag")));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = 429;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        context.Request.Path.StartsWithSegments("/api") ? RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 300, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }) : RateLimitPartition.GetNoLimiter("static"));
});
// Load before becoming ready; broken or empty snapshots must fail startup.
var elements = JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Data", "scientific-elements.json")))!.AsArray();
var compounds = JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Data", "scientific-compounds.json")))!.AsArray();
if (elements.Count != 118 || compounds.Count == 0) throw new InvalidDataException("Scientific snapshot is incomplete.");
var unavailable = elements[0]!.AsObject().Where(section => !elements.Any(record => Populated(record?[section.Key]))).Select(section => section.Key).ToArray();
var app = builder.Build();
app.UseExceptionHandler(handler => handler.Run(async context =>
{
    context.Response.StatusCode = 500;
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
app.MapGet("/info", () => Results.Json(new { name = "Element.Science", version = "2.0", dependencies = Array.Empty<string>(), api = "/api/v2/elements" }));
app.MapGet("/api/v2/coverage", () =>
{
    return Results.Json(new { schemaVersion = "2.0", elements = elements.Count, compounds = compounds.Count, retrievedAt = elements[0]!["provenance"]!["retrieved_at"]!.ToString(), unavailableElementSections = unavailable, nullMeaning = "Not available in this snapshot; not zero." });
});
// API misses must stay JSON 404s; they must never fall through to the SPA.
app.MapFallback("/api/{**path}", () => Results.Problem(statusCode: 404, title: "Endpoint not available in the scientific profile"));
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");
app.Run();

static bool Populated(JsonNode? node) => node switch
{
    null => false,
    JsonObject obj => obj.Any(pair => Populated(pair.Value)),
    JsonArray array => array.Any(Populated),
    _ => node.ToString().Length > 0
};
public partial class Program { }
