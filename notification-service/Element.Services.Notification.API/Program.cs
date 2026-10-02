using Element.Services.Notification.API.Consumers;
using Element.Services.Notification.API.Webhooks;
using Element.Shared.Extensions;
using MassTransit;

// Notification service host: consumes UpdateOrderStatusEvent and fans it out as signed webhooks.
// It exposes no business HTTP API, only the standard /info and /health endpoints.

var webhookTimeout = TimeSpan.FromSeconds(4);

// ~110s total: rides out identity-service still booting after a host reboot before the
// event is parked in notification-order-updates_error.
TimeSpan[] messageRetryIntervals =
[
    TimeSpan.FromSeconds(5),
    TimeSpan.FromSeconds(15),
    TimeSpan.FromSeconds(30),
    TimeSpan.FromSeconds(60),
];

// Bound shutdown under Docker's 10s SIGTERM->SIGKILL window; unacked messages return to the queue.
var busStopTimeout = TimeSpan.FromSeconds(8);

var builder = WebApplication.CreateBuilder(args);

builder.AddConsoleLogging("Element.Notification");
builder.Services.AddSingleton<WebhookFanout>();

// Customer webhooks: no redirects, no proxy, and a connect callback that refuses private addresses.
builder.Services
    .AddHttpClient(WebhookFanout.PublicClientName, client => client.Timeout = webhookTimeout)
    .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
    {
        AllowAutoRedirect = false,
        UseProxy = false,
        ConnectCallback = WebhookFanout.ConnectPublicAsync,
    });
builder.Services.AddHttpClient(WebhookFanout.InternalClientName, client => client.Timeout = webhookTimeout);

// AddMassTransit registers the "masstransit-bus" check: unhealthy until the receive endpoint is
// connected, healthy again after it reconnects. No extra AMQP connection per probe.
builder.Services.AddHealthChecks();

builder.Services.Configure<MassTransitHostOptions>(options => options.StopTimeout = busStopTimeout);
builder.Services.AddMassTransit(bus =>
{
    bus.AddConsumer<UpdateOrderStatusConsumer>();

    bus.UsingRabbitMq((context, rabbit) =>
    {
        rabbit.ConfigureRabbitMqHost(builder.Configuration);
        rabbit.UseMessageRetry(retry => retry.Intervals(messageRetryIntervals));

        rabbit.ReceiveEndpoint("notification-order-updates", endpoint =>
            endpoint.ConfigureConsumer<UpdateOrderStatusConsumer>(context));
    });
});

var app = builder.Build();

app.UseRequestLogging();
app.MapStandardOpsEndpoints("Element.Notification");

try
{
    app.Run();
}
finally
{
    Serilog.Log.CloseAndFlush();
}

/// <summary>Entry point type, kept public so test hosts can reference this assembly.</summary>
public partial class Program { }
