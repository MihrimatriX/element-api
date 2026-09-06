using Element.Services.Compound.Core.Abstractions;
using Element.Services.Compound.Infrastructure.Persistence;
using Element.Shared.Extensions;
using Element.Shared.Middleware;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.AddConsoleLogging("Element.Compound");

builder.Services.AddDbContext<CompoundDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
        .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

builder.Services.AddScoped<ICompoundRepository, EfCompoundRepository>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Element Compound API",
        Version = "v1",
        Description = "Allotropes, compounds, and preparations hanging off a parent element."
    });
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
        c.IncludeXmlComments(xmlPath);
});

var dbConn = builder.Configuration.GetConnectionString("DefaultConnection") ?? "";
builder.Services.AddHealthChecks()
    .AddNpgSql(dbConn, name: "PostgreSQL");

var app = builder.Build();

await app.ApplyDatabaseAsync<CompoundDbContext>("element_compound_db");
await CompoundSeeder.EnsureSeededAsync(app.Services, app.Environment);

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Compound API v1");
    c.DocumentTitle = "Element Compound API";
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
    Log.Information("Starting Compound Service API...");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Host terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

public partial class Program { }
