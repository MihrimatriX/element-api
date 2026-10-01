using Element.Services.Notification.API.Consumers;
using Element.Services.Notification.API.Webhooks;
using Element.Shared.Extensions;
using MassTransit;

var builder = WebApplication.CreateBuilder(args);

builder.AddConsoleLogging("Element.Notification");
builder.Services.AddSingleton<WebhookFanout>();
builder.Services.AddHttpClient("webhooks", c =>
{
    c.Timeout = TimeSpan.FromSeconds(4);
}).ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler {
    AllowAutoRedirect = false,
    UseProxy = false,
    ConnectCallback = WebhookFanout.ConnectPublicAsync
});
builder.Services.AddHttpClient("webhooks-internal", c => c.Timeout = TimeSpan.FromSeconds(4));
// AddMassTransit registers the "masstransit-bus" check: unhealthy until the receive endpoint is
// connected, healthy again after it reconnects. No extra AMQP connection per probe.
builder.Services.AddHealthChecks();

// Bound shutdown under Docker's 10s SIGTERM->SIGKILL window; unacked messages return to the queue.
builder.Services.Configure<MassTransitHostOptions>(o => o.StopTimeout = TimeSpan.FromSeconds(8));
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<UpdateOrderStatusConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.ConfigureRabbitMqHost(builder.Configuration);
        // ~110s total: rides out identity-service still booting after a host reboot before the
        // event is parked in notification-order-updates_error.
        cfg.UseMessageRetry(r => r.Intervals(
            TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(15), TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(60)));

        cfg.ReceiveEndpoint("notification-order-updates", e =>
            e.ConfigureConsumer<UpdateOrderStatusConsumer>(context));
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

public partial class Program { }
