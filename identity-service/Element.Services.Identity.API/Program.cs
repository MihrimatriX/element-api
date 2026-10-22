using System.Security.Claims;
using System.Text;
using Element.Services.Identity.API;
using Element.Services.Identity.Core.Entities;
using Element.Services.Identity.Infrastructure.Persistence;
using Element.Services.Identity.Infrastructure.Services;
using Element.Shared.Extensions;
using Element.Shared.Middleware;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Also refuses to start in Production with development secrets (shared-lib ProductionConfiguration).
builder.AddConsoleLogging("Element.Identity");

builder.Services.AddDbContext<IdentityAppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Persisted Data Protection keys keep reset and verification links valid across container restarts.
var dataProtection = builder.Services.AddDataProtection().SetApplicationName("Element.Identity");
var dataProtectionKeyPath = builder.Configuration["DataProtection:KeyPath"];
if (!string.IsNullOrWhiteSpace(dataProtectionKeyPath))
{
    dataProtection.PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeyPath));
}

// Password-reset and e-mail verification links expire after one hour.
builder.Services.Configure<DataProtectionTokenProviderOptions>(options => options.TokenLifespan = TimeSpan.FromHours(1));

builder.Services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
    {
        // Length over complexity: at least 10 characters, no forced character classes.
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequiredLength = 10;
        options.User.RequireUniqueEmail = true;

        // Five wrong passwords lock the account for 15 minutes.
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.AllowedForNewUsers = true;
    })
    .AddEntityFrameworkStores<IdentityAppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<ApiKeyService>();
builder.Services.AddSingleton<IAccountMailer, AccountMailer>();

// An empty CAPTCHA_SECRET_KEY turns the Turnstile check off (local/dev).
builder.Services.AddHttpClient<ICaptchaVerifier, TurnstileCaptchaVerifier>(client => client.Timeout = TimeSpan.FromSeconds(10));

var jwtSecret = builder.Configuration["JwtSettings:Secret"]
    ?? throw new InvalidOperationException("JWT Secret not configured.");
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = RejectTokenWithStaleSecurityStampAsync,
        };
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"] ?? TokenService.DefaultIssuer,
            ValidAudience = builder.Configuration["JwtSettings:Audience"] ?? TokenService.DefaultAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        };
    });

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var healthCheckDatabaseConnectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "";
builder.Services.AddHealthChecks()
    .AddNpgSql(healthCheckDatabaseConnectionString, name: "PostgreSQL");

var app = builder.Build();

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
    // Inside try: a DB that never comes up logs Fatal and exits 1 (restart policy) instead of aborting (exit 134).
    await app.ApplyDatabaseAsync<IdentityAppDbContext>("element_identity_db");
    Log.Information("Starting Identity Service API...");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Host terminated unexpectedly");
    Environment.ExitCode = 1;
}
finally
{
    Log.CloseAndFlush();
}

// Changing or resetting the password rotates the security stamp, so every JWT issued before
// that moment is rejected here. A deleted account is rejected the same way.
static async Task RejectTokenWithStaleSecurityStampAsync(TokenValidatedContext context)
{
    var userManager = context.HttpContext.RequestServices.GetRequiredService<UserManager<ApplicationUser>>();
    var userId = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    var user = userId is null ? null : await userManager.FindByIdAsync(userId);
    var tokenSecurityStamp = context.Principal?.FindFirst(TokenService.SecurityStampClaimType)?.Value;

    if (user is null || tokenSecurityStamp != user.SecurityStamp)
    {
        context.Fail("Session expired. Sign in again.");
    }
}
