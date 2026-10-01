using Element.Services.Shipment.Infrastructure.Consumers;
using Element.Services.Shipment.Infrastructure.Data;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Element.Shared.Extensions;
using Element.Shared.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Console logging
builder.AddConsoleLogging("Element.Shipment");

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

// Add Health Checks. RabbitMQ: AddMassTransit registers "masstransit-bus" (Unhealthy/503 until the
// receive endpoints are connected, Healthy again after reconnect) — no extra AMQP connection per probe.
var dbConn = connectionString;
builder.Services.AddHealthChecks()
    .AddNpgSql(dbConn, name: "PostgreSQL");

var app = builder.Build();

app.UseRequestLogging();
app.UseGlobalExceptionHandling();
app.MapControllers();
app.MapStandardOpsEndpoints("Element.Shipment", new Dictionary<string, string>
{
    ["shipments"] = "/api/v1/shipments",
});

app.MapGet("/", () => Results.Redirect("/info"));

try
{
    // Inside try: a DB that never comes up logs Fatal and exits 1 (restart policy) instead of aborting (exit 134).
    await app.ApplyDatabaseAsync<ShipmentDbContext>("element_shipment_db");
    app.Run();
}
catch (Exception ex)
{
    Serilog.Log.Fatal(ex, "Host terminated unexpectedly");
    Environment.ExitCode = 1;
}
finally
{
    Serilog.Log.CloseAndFlush();
}

public partial class Program { }

