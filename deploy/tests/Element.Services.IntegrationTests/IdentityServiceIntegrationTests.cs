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

        var validate = await client.PostAsJsonAsync("/api/v1/internal/api-keys/validate",
            new ValidateKeyRequest(rawKey));
        validate.EnsureSuccessStatusCode();
        var dto = await validate.Content.ReadFromJsonAsync<ApiKeyResponseDto>();
        Assert.NotNull(dto);
        Assert.True(dto!.IsActive);
        Assert.NotEqual(Guid.Empty, dto.UserId);
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
