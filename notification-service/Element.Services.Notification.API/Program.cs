using Element.Services.Notification.API.Consumers;
using Element.Services.Notification.API.Hubs;
using Element.Shared.Extensions;
using Element.Shared.Health;
using MassTransit;

var builder = WebApplication.CreateBuilder(args);

builder.AddEnterpriseLogging("Element.Notification");
builder.AddEnterpriseTracing("Element.Notification");
builder.Services.AddSignalR();
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

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
    ?? ["http://localhost:5173", "http://localhost:5000", "http://localhost:3000", "http://localhost:3001"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseEnterpriseLogging();
app.UseCors("CorsPolicy");
app.MapPrometheusScrapingEndpoint();
app.MapStandardOpsEndpoints("Element.Notification", new Dictionary<string, string>
{
    ["hub"] = "/hub/notifications",
    ["metrics"] = "/metrics"
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
