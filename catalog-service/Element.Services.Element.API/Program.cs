using System.Reflection;
using Element.Services.Element.API;
using Element.Services.Element.Infrastructure.Messaging.Consumers;
using Element.Services.Element.Infrastructure.Persistence;
using Element.Services.Element.Infrastructure.Services;
using Element.Shared.Extensions;
using Element.Shared.Middleware;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.OpenApi.Models;
using Serilog;

// Catalogue service: element reference data (v1 + scientific v2), simulated KREDI prices,
// categories and statistics. Stock itself is owned by inventory-service.

const int MessageRetryCount = 3;
var messageRetryInterval = TimeSpan.FromSeconds(5);

var builder = WebApplication.CreateBuilder(args);

builder.AddConsoleLogging("Element.Service");

builder.Services.AddDbContext<ElementDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
        .ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning)));

// ponytail: in-process only (no Redis): a 5 s catalogue snapshot + market board shared by all anonymous readers
// (see EfElementRepository.SnapshotTtl). Per replica; move to a distributed cache only if replicas multiply.
builder.Services.AddMemoryCache();

builder.Services.Configure<MarketOptions>(builder.Configuration.GetSection(MarketOptions.SectionName));
builder.Services.AddScoped<EfElementRepository>();

builder.Services.AddMassTransit(bus =>
{
    // Stock reserve/release/fulfill owned by inventory-service. Catalog keeps price nudges.
    bus.AddConsumer<OrderCompletedConsumer>();
    bus.AddConsumer<ElementSoldConsumer>();

    bus.UsingRabbitMq((context, rabbit) =>
    {
        rabbit.ConfigureRabbitMqHost(builder.Configuration);
        rabbit.UseMessageRetry(retry => retry.Interval(MessageRetryCount, messageRetryInterval));
        rabbit.ConfigureEndpoints(context);
    });
});

if (builder.Configuration.GetValue("PriceSimulator:Enabled", true))
{
    builder.Services.AddHostedService<PriceSimulator>();
}

builder.Services.AddHostedService<ElementDetailSeeder>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(swagger =>
{
    swagger.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Element API",
        Version = "v1",
        Description = "Free, open API for chemical elements data, market prices, and periodic table categories. Like SWAPI/Rick & Morty API, but for Chemistry!",
        Contact = new OpenApiContact { Name = "Element Market Developer Team", Url = new Uri("http://localhost:3000") }
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

// Swagger is always available for this open public API
app.UseSwagger();
app.UseSwaggerUI(swaggerUi =>
{
    swaggerUi.SwaggerEndpoint("/swagger/v1/swagger.json", "Element API v1");
    swaggerUi.DocumentTitle = "Element API Documentation";
});

app.UseRequestLogging();
app.UseGlobalExceptionHandling();
app.UseAuthorization();
app.MapControllers();
app.MapStandardOpsEndpoints("Element.Catalog", new Dictionary<string, string>
{
    ["api"] = "/api/v1",
    ["swagger"] = "/swagger"
});

try
{
    await app.ApplyDatabaseAsync<ElementDbContext>("element_market_db");
    Log.Information("Starting Element Service API...");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Host terminated unexpectedly");
    Environment.ExitCode = 1; // swallowed exception would otherwise exit 0
}
finally
{
    Log.CloseAndFlush();
}

/// <summary>Entry point type; public so integration tests can host the API with WebApplicationFactory.</summary>
public partial class Program { }
