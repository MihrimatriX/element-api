using System.Reflection;
using Element.Services.Compound.Infrastructure.Persistence;
using Element.Shared.Extensions;
using Element.Shared.Middleware;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.OpenApi.Models;
using Serilog;

// Compound service: educational compounds, allotropes and preparations (v1) plus the
// scientific compound records (v2). Read-only API; no messaging.

var builder = WebApplication.CreateBuilder(args);

builder.AddConsoleLogging("Element.Compound");

builder.Services.AddDbContext<CompoundDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
        .ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning)));

builder.Services.AddScoped<EfCompoundRepository>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(swagger =>
{
    swagger.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Element Compound API",
        Version = "v1",
        Description = "Allotropes, compounds, and preparations hanging off a parent element."
    });

    var xmlDocFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlDocPath = Path.Combine(AppContext.BaseDirectory, xmlDocFile);
    if (File.Exists(xmlDocPath))
    {
        swagger.IncludeXmlComments(xmlDocPath);
    }
});

var healthCheckConnectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "";
builder.Services.AddHealthChecks()
    .AddNpgSql(healthCheckConnectionString, name: "PostgreSQL");

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(swaggerUi =>
{
    swaggerUi.SwaggerEndpoint("/swagger/v1/swagger.json", "Compound API v1");
    swaggerUi.DocumentTitle = "Element Compound API";
});

app.UseRequestLogging();
app.UseGlobalExceptionHandling();
app.UseAuthorization();
app.MapControllers();
app.MapStandardOpsEndpoints("Element.Compound", new Dictionary<string, string>
{
    ["api"] = "/api/v1",
    ["compounds"] = "/api/v1/compounds",
    ["swagger"] = "/swagger",
});

try
{
    // Inside try: a DB that never comes up logs Fatal and exits 1 (restart policy) instead of aborting (exit 134).
    await app.ApplyDatabaseAsync<CompoundDbContext>("element_compound_db");
    await CompoundSeeder.EnsureSeededAsync(app.Services, app.Environment);
    Log.Information("Starting Compound Service API...");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Host terminated unexpectedly");
    Environment.ExitCode = 1;
}
finally
{
    Log.CloseAndFlush();
}

/// <summary>Entry point type; public so integration tests can host the API with WebApplicationFactory.</summary>
public partial class Program { }
