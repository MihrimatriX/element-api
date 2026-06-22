using Element.Services.Shipment.Infrastructure.Consumers;
using Element.Services.Shipment.Infrastructure.Data;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Element.Shared.Extensions;
using Element.Shared.Health;
using Element.Shared.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add Enterprise Logging (Serilog + Seq)
builder.AddEnterpriseLogging("Element.Shipment");
builder.AddEnterpriseTracing("Element.Shipment");

// Add DbContext
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Port=5432;Database=element_shipment_db;Username=postgres;Password=mysecretpassword";
builder.Services.AddDbContext<ShipmentDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add MassTransit
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<ShipmentRequestedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.ConfigureRabbitMqHost(builder.Configuration);

        // Add Resilience: Message Retry Policy
        cfg.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));

        cfg.ReceiveEndpoint("shipment-requested-queue", e =>
        {
            e.ConfigureConsumer<ShipmentRequestedConsumer>(context);
        });
    });
});

builder.Services.AddControllers();

// Add Health Checks
var dbConn = connectionString;
builder.Services.AddHealthChecks()
    .AddNpgSql(dbConn, name: "PostgreSQL")
    .AddElementRabbitMqHealthCheck(builder.Configuration);

var app = builder.Build();

await app.ApplyDatabaseAsync<ShipmentDbContext>("element_shipment_db");

app.UseEnterpriseLogging();
app.UseGlobalExceptionHandling();
app.MapControllers();
app.MapPrometheusScrapingEndpoint();
app.MapStandardOpsEndpoints("Element.Shipment", new Dictionary<string, string>
{
    ["shipments"] = "/api/v1/shipments",
    ["metrics"] = "/metrics"
});

app.MapGet("/", () => Results.Redirect("/info"));

try
{
    app.Run();
}
finally
{
    Serilog.Log.CloseAndFlush();
}

public partial class Program { }

