using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Element.Gateway.Middleware;
using Element.Services.Identity.API.Controllers;
using Element.Services.Identity.Core.DTOs;
using Element.Services.IntegrationTests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Element.Services.IntegrationTests;

/// <summary>
/// Gateway + real identity service: public routes stay anonymous, protected routes need a valid
/// X-API-Key that the gateway validates against identity.
/// </summary>
[Trait("Category", "Integration")]
public class GatewayApiKeyIntegrationTests : IClassFixture<IntegrationTestContainers>
{
    /// <summary>Nothing listens here: proxied calls fail fast, which is fine because only auth is tested.</summary>
    private const string UnreachableCatalogUrl = "http://127.0.0.1:59999";

    private readonly IntegrationTestContainers _containers;

    public GatewayApiKeyIntegrationTests(IntegrationTestContainers containers)
    {
        _containers = containers;
    }

    [Fact]
    public async Task ElementsRoute_AllowsAnonymousGet()
    {
        await using var identity = CreateIdentityFactory();
        var identityBase = identity.CreateClient().BaseAddress!.ToString().TrimEnd('/');

        await using var gateway = CreateGatewayFactory(identityBase);
        var response = await gateway.CreateClient().GetAsync("/api/v1/elements/Au");

        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task HistoryRoute_Returns401_WithoutApiKey()
    {
        await using var identity = CreateIdentityFactory();
        var identityBase = identity.CreateClient().BaseAddress!.ToString().TrimEnd('/');

        await using var gateway = CreateGatewayFactory(identityBase);
        var response = await gateway.CreateClient().GetAsync("/api/v1/elements/Au/history");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ElementsRoute_PassesApiKeyValidation_WithValidKey()
    {
        var rawKey = await CreateApiKeyAsync();

        await using var identity = CreateIdentityFactory();
        var identityBase = identity.CreateClient().BaseAddress!.ToString().TrimEnd('/');

        await using var gateway = CreateGatewayFactory(identityBase);
        var client = gateway.CreateClient();
        client.DefaultRequestHeaders.Add("X-API-Key", rawKey);

        var response = await client.GetAsync("/api/v1/elements/Au");

        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>Registers a user, logs in and returns a freshly generated raw API key.</summary>
    private async Task<string> CreateApiKeyAsync()
    {
        await using var identity = CreateIdentityFactory();
        var client = identity.CreateClient();
        var email = $"gw-{Guid.NewGuid():N}@test.local";

        await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest(email, "Password1!", "Gw", "User"));
        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, "Password1!"));
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();

        var keyRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/api-keys/generate");
        keyRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        keyRequest.Content = JsonContent.Create(new GenerateKeyRequest("gateway-e2e", 100));
        var keyResponse = await client.SendAsync(keyRequest);
        keyResponse.EnsureSuccessStatusCode();
        var keyDocument = await keyResponse.Content.ReadFromJsonAsync<JsonElement>();
        return keyDocument.GetProperty("apiKey").GetString()!;
    }

    private WebApplicationFactory<AuthController> CreateIdentityFactory() =>
        new WebApplicationFactory<AuthController>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseSetting("ConnectionStrings:DefaultConnection",
                    IntegrationTestSettings.BuildPostgresConnection(_containers, "element_identity_gw"));
                builder.UseSetting("RedisConnection", _containers.RedisConnection);
                builder.UseSetting("JwtSettings:Secret", "IntegrationTestSecretKey_Minimum32Chars!");
            });

    private WebApplicationFactory<ApiKeyValidationMiddleware> CreateGatewayFactory(string identityBase) =>
        new WebApplicationFactory<ApiKeyValidationMiddleware>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseSetting("RedisConnection", _containers.RedisConnection);
                builder.UseSetting("IdentityServiceInternalUrl", identityBase);
                builder.UseSetting("ElementServiceInternalUrl", UnreachableCatalogUrl);
                builder.UseSetting("ReverseProxy:Clusters:element-cluster:Destinations:destination1:Address", UnreachableCatalogUrl);
            });
}
