using System;
using System.Text;
using Element.Services.Identity.Core.Entities;
using Element.Services.Identity.Core.Interfaces;
using Element.Services.Identity.Infrastructure.Persistence;
using Element.Services.Identity.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using StackExchange.Redis;
using Element.Shared.Extensions;
using Element.Shared.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Console logging
builder.AddConsoleLogging("Element.Identity");

// Add DbContext
builder.Services.AddDbContext<IdentityAppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
    {
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequiredLength = 6;
    })
    .AddEntityFrameworkStores<IdentityAppDbContext>()
    .AddDefaultTokenProviders();

// Add Redis
var redisConn = builder.Configuration.GetValue<string>("RedisConnection") ?? "localhost:6379";
builder.Services.AddSingleton<IConnectionMultiplexer>(ConnectionMultiplexer.Connect(redisConn));

// Register DI Services
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IApiKeyService, ApiKeyService>();

// Add JWT Auth
var jwtSecret = builder.Configuration["JwtSettings:Secret"] ?? throw new InvalidOperationException("JWT Secret not configured.");
builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"] ?? "ElementGateway",
            ValidAudience = builder.Configuration["JwtSettings:Audience"] ?? "ElementMicroservices",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add Health Checks
var dbConn = builder.Configuration.GetConnectionString("DefaultConnection") ?? "";
builder.Services.AddHealthChecks()
    .AddNpgSql(dbConn, name: "PostgreSQL")
    .AddRedis(redisConn, name: "Redis");

var app = builder.Build();

await app.ApplyDatabaseAsync<IdentityAppDbContext>("element_identity_db");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRequestLogging();
app.UseGlobalExceptionHandling();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapStandardOpsEndpoints("Element.Identity", new Dictionary<string, string>
{
    ["api"] = "/api/v1",
    ["swagger"] = "/swagger",
});

try
{
    Log.Information("Starting Identity Service API...");
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

