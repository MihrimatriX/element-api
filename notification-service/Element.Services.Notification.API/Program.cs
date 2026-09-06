using Element.Services.Notification.API.Consumers;
using Element.Services.Notification.API.Hubs;
using Element.Services.Notification.API.Webhooks;
using Element.Shared.Extensions;
using Element.Shared.Health;
using MassTransit;

var builder = WebApplication.CreateBuilder(args);

builder.AddConsoleLogging("Element.Notification");
builder.Services.AddSignalR();
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
builder.Services.AddHealthChecks()
    .AddElementRabbitMqHealthCheck(builder.Configuration);

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<ElementPriceChangedConsumer>();
    x.AddConsumer<UpdateOrderStatusConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.ConfigureRabbitMqHost(builder.Configuration);
        cfg.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));

        cfg.ReceiveEndpoint("notification-price-updates", e =>
            e.ConfigureConsumer<ElementPriceChangedConsumer>(context));

        cfg.ReceiveEndpoint("notification-order-updates", e =>
            e.ConfigureConsumer<UpdateOrderStatusConsumer>(context));
    });
});

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()?.ToList()
    ?? ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5000", "http://localhost:3000", "http://localhost:3001"];
var publicOrigin = builder.Configuration["PUBLIC_WEB_ORIGIN"]
    ?? Environment.GetEnvironmentVariable("PUBLIC_WEB_ORIGIN");
if (!string.IsNullOrWhiteSpace(publicOrigin))
{
    var origin = publicOrigin.Trim().TrimEnd('/');
    if (!corsOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
        corsOrigins.Add(origin);
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.WithOrigins(corsOrigins.ToArray())
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseRequestLogging();
app.UseCors("CorsPolicy");
app.MapStandardOpsEndpoints("Element.Notification", new Dictionary<string, string>
{
    ["hub"] = "/hub/notifications",
});
app.MapHub<NotificationHub>("/hub/notifications");

try
{
    app.Run();
}
finally
{
    Serilog.Log.CloseAndFlush();
}

public partial class Program { }
