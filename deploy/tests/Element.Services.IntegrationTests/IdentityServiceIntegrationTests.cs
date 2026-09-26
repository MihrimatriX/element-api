using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Element.Services.Identity.API.Controllers;
using Element.Services.Identity.Core.DTOs;
using Element.Services.IntegrationTests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Npgsql;

namespace Element.Services.IntegrationTests;

[Trait("Category", "Integration")]
public class IdentityServiceIntegrationTests : IClassFixture<IntegrationTestContainers>
{
    private readonly IntegrationTestContainers _containers;

    public IdentityServiceIntegrationTests(IntegrationTestContainers containers)
    {
        _containers = containers;
    }

    private WebApplicationFactory<AuthController> CreateFactory() =>
        new WebApplicationFactory<AuthController>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseSetting("ConnectionStrings:DefaultConnection", BuildConnectionString("element_identity_db"));
                builder.UseSetting("RedisConnection", _containers.RedisConnection);
                builder.UseSetting("JwtSettings:Secret", "IntegrationTestSecretKey_Minimum32Chars!");
                builder.UseSetting("INTERNAL_API_KEY", "test-internal-key");
            });

    [Fact]
    public async Task Register_Login_GenerateKey_ValidateKey_Succeeds()
    {
        await using var app = CreateFactory();
        var client = app.CreateClient();
        var email = $"user-{Guid.NewGuid():N}@test.local";

        var register = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest(
            email, "Password1!", "Test", "User"));
        register.EnsureSuccessStatusCode();

        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, "Password1!"));
        login.EnsureSuccessStatusCode();
        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);

        var keyRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/api-keys/generate");
        keyRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", auth!.Token);
        keyRequest.Content = JsonContent.Create(new GenerateKeyRequest("integration", 50));
        var keyResponse = await client.SendAsync(keyRequest);
        keyResponse.EnsureSuccessStatusCode();

        var keyDoc = await keyResponse.Content.ReadFromJsonAsync<JsonElement>();
        var rawKey = keyDoc.GetProperty("apiKey").GetString();
        Assert.StartsWith("ele_live_", rawKey);
        Assert.Equal(41, rawKey!.Length);

        var validate = new HttpRequestMessage(HttpMethod.Post, "/api/v1/internal/api-keys/validate");
        validate.Headers.TryAddWithoutValidation("INTERNAL_API_KEY", "test-internal-key");
        validate.Content = JsonContent.Create(new ValidateKeyRequest(rawKey));
        var validateResponse = await client.SendAsync(validate);
        validateResponse.EnsureSuccessStatusCode();
        var dto = await validateResponse.Content.ReadFromJsonAsync<ApiKeyResponseDto>();
        Assert.NotNull(dto);
        Assert.True(dto!.IsActive);
        Assert.NotEqual(Guid.Empty, dto.UserId);
        Assert.Equal(10, dto.RateLimitTps);

        // Run CRUD against the migrated PostgreSQL schema, not an in-memory model.
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Token);
        var emptyHooks = await client.GetAsync("/api/v1/webhooks");
        emptyHooks.EnsureSuccessStatusCode();
        Assert.Empty((await emptyHooks.Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray());
        var createHook = await client.PostAsJsonAsync("/api/v1/webhooks", new
        {
            url = "https://example.test/element-webhook",
            events = new[] { "price.updated", "order.updated" },
            secret = "integration-webhook-secret"
        });
        createHook.EnsureSuccessStatusCode();
        var hook = await createHook.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(hook.TryGetProperty("secret", out _));
        var hookId = hook.GetProperty("id").GetGuid();
        var hooks = await client.GetFromJsonAsync<JsonElement>("/api/v1/webhooks");
        Assert.Single(hooks.EnumerateArray());
        (await client.DeleteAsync($"/api/v1/webhooks/{hookId}")).EnsureSuccessStatusCode();
        hooks = await client.GetFromJsonAsync<JsonElement>("/api/v1/webhooks");
        Assert.Empty(hooks.EnumerateArray());
    }

    private string BuildConnectionString(string database)
    {
        var builder = new NpgsqlConnectionStringBuilder(_containers.Postgres.GetConnectionString())
        {
            Database = database
        };
        return builder.ConnectionString;
    }
}
