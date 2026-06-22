using System;
using Element.Services.Element.Core.Abstractions;
using Element.Services.Element.Infrastructure.Messaging.Consumers;
using Element.Services.Element.Infrastructure.Persistence;
using Element.Services.Element.Infrastructure.Services;
using MassTransit;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Serilog;
using StackExchange.Redis;
using Element.Shared.Extensions;
using Element.Shared.Middleware;
using Element.Shared.Health;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

// Add Enterprise Logging (Serilog + Seq)
builder.AddEnterpriseLogging("Element.Service");
builder.AddEnterpriseTracing("Element.Service");

// Add DbContext
builder.Services.AddDbContext<ElementDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
        .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

// Add Redis
var redisConn = builder.Configuration.GetValue<string>("RedisConnection") ?? "localhost:6379";
builder.Services.AddSingleton<IConnectionMultiplexer>(ConnectionMultiplexer.Connect(redisConn));

// Domain ports
builder.Services.AddScoped<IElementRepository, EfElementRepository>();

// Configure MassTransit with RabbitMQ
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<OrderSubmittedConsumer>();
    x.AddConsumer<OrderStockReleaseConsumer>();
    x.AddConsumer<OrderCompletedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.ConfigureRabbitMqHost(builder.Configuration);

        // Add Resilience: Message Retry Policy
        cfg.UseMessageRetry(r => r.Interval(3, TimeSpan.FromSeconds(5)));

        cfg.ConfigureEndpoints(context);
    });
});

if (builder.Configuration.GetValue("PriceSimulator:Enabled", true))
    builder.Services.AddHostedService<PriceSimulator>();

builder.Services.AddHostedService<ElementDetailSeeder>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c => 
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Element API",
        Version = "v1",
        Description = "Free, open API for chemical elements data, market prices, and periodic table categories. Like SWAPI/Rick & Morty API, but for Chemistry!",
        Contact = new Microsoft.OpenApi.Models.OpenApiContact { Name = "Element Market Developer Team", Url = new Uri("http://localhost:3000") }
    });

    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = System.IO.Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (System.IO.File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }
});
builder.Services.AddGrpc(); // Add gRPC

// Add Health Checks
var dbConn = builder.Configuration.GetConnectionString("DefaultConnection") ?? "";
builder.Services.AddHealthChecks()
    .AddNpgSql(dbConn, name: "PostgreSQL")
    .AddRedis(redisConn, name: "Redis");

var app = builder.Build();

await app.ApplyDatabaseAsync<ElementDbContext>("element_market_db");

var gatewayGraphql = app.Configuration["GatewayPublicUrl"] ?? "http://localhost:5000/graphql";

// Swagger is always available for this open public API
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Element API v1");
    c.DocumentTitle = "Element API Documentation";
});

app.UseEnterpriseLogging();
app.UseGlobalExceptionHandling();
app.UseAuthorization();
app.MapControllers();
app.MapGrpcService<Element.Services.Element.API.Grpc.ElementGrpcService>();
app.MapPrometheusScrapingEndpoint();
app.MapStandardOpsEndpoints("Element.Catalog", new Dictionary<string, string>
{
    ["api"] = "/api/v1",
    ["swagger"] = "/swagger",
    ["metrics"] = "/metrics",
    ["graphql"] = gatewayGraphql
});

try
{
    Log.Information("Starting Element Service API...");
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
