using Element.Services.Shipment.Infrastructure.Consumers;
using Element.Services.Shipment.Infrastructure.Data;
using Element.Shared.Extensions;
using Element.Shared.Middleware;
using MassTransit;
using Microsoft.EntityFrameworkCore;

// Shipment service host: consumes ShipmentRequestedEvent from the order saga and serves the shipment REST API.

const string DatabaseName = "element_shipment_db";
const string DevelopmentConnectionString =
    "Host=localhost;Port=5432;Database=element_shipment_db;Username=postgres;Password=mysecretpassword";
const int MessageRetryCount = 3;
var messageRetryInterval = TimeSpan.FromSeconds(5);

var builder = WebApplication.CreateBuilder(args);

builder.AddConsoleLogging("Element.Shipment");

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? DevelopmentConnectionString;
builder.Services.AddDbContext<ShipmentDbContext>(options => options.UseNpgsql(connectionString));

builder.Services.AddMassTransit(bus =>
{
    bus.AddConsumer<ShipmentRequestedConsumer>();

    bus.UsingRabbitMq((context, rabbit) =>
    {
        rabbit.ConfigureRabbitMqHost(builder.Configuration);
        rabbit.UseMessageRetry(retry => retry.Interval(MessageRetryCount, messageRetryInterval));

        rabbit.ReceiveEndpoint("shipment-requested-queue", endpoint =>
        {
            endpoint.ConfigureConsumer<ShipmentRequestedConsumer>(context);
        });
    });
});

builder.Services.AddControllers();

// RabbitMQ: AddMassTransit registers "masstransit-bus" (Unhealthy/503 until the receive endpoints
// are connected, Healthy again after reconnect) — no extra AMQP connection per probe.
builder.Services.AddHealthChecks()
    .AddNpgSql(connectionString, name: "PostgreSQL");

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
    await app.ApplyDatabaseAsync<ShipmentDbContext>(DatabaseName);
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

/// <summary>Entry point type, kept public so test hosts can reference this assembly.</summary>
public partial class Program { }
