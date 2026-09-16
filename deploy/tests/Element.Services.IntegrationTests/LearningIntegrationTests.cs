using Element.Services.Identity.API;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.WebUtilities;
using System.Net;
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
public sealed class LearningIntegrationTests(IntegrationTestContainers containers) : IClassFixture<IntegrationTestContainers>
{
    private WebApplicationFactory<AuthController> Factory(IAccountMailer? mailer = null) => new WebApplicationFactory<AuthController>().WithWebHostBuilder(builder =>
    {
        builder.UseSetting("ConnectionStrings:DefaultConnection", new NpgsqlConnectionStringBuilder(containers.Postgres.GetConnectionString()) { Database = "element_identity_db" }.ConnectionString);
        if (mailer is not null) builder.ConfigureServices(services => services.AddSingleton(mailer));
        builder.UseSetting("RedisConnection", containers.RedisConnection);
        builder.UseSetting("JwtSettings:Secret", "IntegrationTestSecretKey_Minimum32Chars!");
        builder.UseSetting("INTERNAL_API_KEY", "test-internal-key");
    });
    private static async Task<(string Email, string Token)> Register(HttpClient client)
    {
        var email = $"learning-{Guid.NewGuid():N}@test.local";
        (await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest(email, "Password1!", "Test", "Learner"))).EnsureSuccessStatusCode();
        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, "Password1!"));
        response.EnsureSuccessStatusCode();
        return (email, (await response.Content.ReadFromJsonAsync<AuthResponse>())!.Token);
    }
    [Fact]
    public async Task Concurrent_devices_merge_progress_and_other_accounts_cannot_read_it()
    {
        await using var app = Factory();
        var first = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await first.GetAsync("/api/v1/auth/learning")).StatusCode);
        var account = await Register(first);
        first.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", account.Token);
        var second = app.CreateClient(); second.DefaultRequestHeaders.Authorization = first.DefaultRequestHeaders.Authorization;
        var responses = await Task.WhenAll(
            first.PutAsJsonAsync("/api/v1/auth/learning", new { discoveries = new[] { "h2o", "co2" }, lessons = Array.Empty<string>() }),
            second.PutAsJsonAsync("/api/v1/auth/learning", new { discoveries = new[] { "nh3", "h2o" }, lessons = Array.Empty<string>() }));
        foreach (var response in responses) response.EnsureSuccessStatusCode();
        var merged = await first.GetFromJsonAsync<JsonElement>("/api/v1/auth/learning");
        Assert.Equal(3, merged.GetProperty("discoveries").GetArrayLength());
        (await first.PutAsJsonAsync("/api/v1/auth/learning", new { discoveries = Array.Empty<string>(), lessons = new[] { "everyday" } })).EnsureSuccessStatusCode();
        merged = await first.GetFromJsonAsync<JsonElement>("/api/v1/auth/learning");
        Assert.Equal(1, merged.GetProperty("lessons").GetArrayLength());
        Assert.Equal(HttpStatusCode.BadRequest, (await first.PutAsJsonAsync("/api/v1/auth/learning", new { discoveries = new[] { "fiction" }, lessons = Array.Empty<string>() })).StatusCode);
        var other = app.CreateClient(); var otherAccount = await Register(other);
        other.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", otherAccount.Token);
        Assert.Equal(0, (await other.GetFromJsonAsync<JsonElement>("/api/v1/auth/learning")).GetProperty("discoveries").GetArrayLength());
    }
    [Fact]
    public async Task Repeated_wrong_passwords_lock_the_account()
    {
        await using var app = Factory(); var client = app.CreateClient(); var account = await Register(client);
        for (var i = 0; i < 5; i++) Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(account.Email, "WrongPassword!"))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(account.Email, "Password1!"))).StatusCode);
    }

    private sealed class CapturingMailer : IAccountMailer
    {
        public bool Enabled => true;
        public string Message { get; private set; } = "";
        public Task SendAsync(string email, string subject, string message, CancellationToken ct) { Message = message; return Task.CompletedTask; }
        public string Token => QueryHelpers.ParseQuery(new Uri(Message.Split('\n').First(line => line.StartsWith("http"))).Fragment.TrimStart('#'))["token"].ToString();
    }
    [Fact]
    public async Task Password_change_revokes_old_sessions_and_all_device_keys()
    {
        await using var app = Factory(); var client = app.CreateClient(); var account = await Register(client);
        client.DefaultRequestHeaders.Authorization = new("Bearer", account.Token);
        (await client.PostAsJsonAsync("/api/v1/api-keys/generate", new GenerateKeyRequest("browser one"))).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/v1/api-keys/generate", new GenerateKeyRequest("browser two"))).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/auth/password/change", new { currentPassword = "wrong", password = "Replacement1!" })).StatusCode);
        (await client.PostAsJsonAsync("/api/v1/auth/password/change", new { currentPassword = "Password1!", password = "Replacement1!" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/auth/profile")).StatusCode);
        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(account.Email, "Replacement1!")); login.EnsureSuccessStatusCode();
        client.DefaultRequestHeaders.Authorization = new("Bearer", (await login.Content.ReadFromJsonAsync<AuthResponse>())!.Token);
        var keys = await client.GetFromJsonAsync<JsonElement>("/api/v1/api-keys");
        Assert.Equal(2, keys.GetArrayLength()); Assert.All(keys.EnumerateArray(), key => Assert.False(key.GetProperty("isActive").GetBoolean()));
    }
    [Fact]
    public async Task Mail_links_verify_email_and_reset_password_only_once()
    {
        var mailer = new CapturingMailer(); await using var app = Factory(mailer); var client = app.CreateClient(); var account = await Register(client);
        client.DefaultRequestHeaders.Authorization = new("Bearer", account.Token);
        (await client.PostAsJsonAsync("/api/v1/auth/email/send-verification", new { })).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/v1/auth/email/verify", new { email = account.Email, token = mailer.Token })).EnsureSuccessStatusCode();
        Assert.True((await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/profile")).GetProperty("emailConfirmed").GetBoolean());
        (await client.PostAsJsonAsync("/api/v1/auth/password/forgot", new { email = account.Email })).EnsureSuccessStatusCode();
        var token = mailer.Token;
        (await client.PostAsJsonAsync("/api/v1/auth/password/reset", new { email = account.Email, token, password = "Replacement1!" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/auth/password/reset", new { email = account.Email, token, password = "AnotherPassword1!" })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/auth/learning")).StatusCode);
    }
    [Fact]
    public async Task Export_excludes_secrets_and_deletion_closes_account_and_learning()
    {
        await using var app = Factory(); var client = app.CreateClient(); var account = await Register(client);
        client.DefaultRequestHeaders.Authorization = new("Bearer", account.Token);
        (await client.PutAsJsonAsync("/api/v1/auth/learning", new { discoveries = new[] { "h2o" }, lessons = Array.Empty<string>() })).EnsureSuccessStatusCode();
        var key = await client.PostAsJsonAsync("/api/v1/api-keys/generate", new GenerateKeyRequest("export test")); key.EnsureSuccessStatusCode();
        var rawKey = (await key.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("apiKey").GetString()!;
        var export = await client.GetStringAsync("/api/v1/auth/export");
        Assert.Contains(account.Email, export); Assert.Contains("discovery:h2o", export); Assert.DoesNotContain(rawKey, export); Assert.DoesNotContain("securityStamp", export); Assert.DoesNotContain("passwordHash", export);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/auth/delete", new { password = "wrong", confirmation = "HESABIMI SİL" })).StatusCode);
        (await client.PostAsJsonAsync("/api/v1/auth/delete", new { password = "Password1!", confirmation = "HESABIMI SİL" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/auth/learning")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(account.Email, "Password1!"))).StatusCode);
    }

    [Fact]
    public async Task Concurrent_key_issuance_respects_account_limit()
    {
        await using var app = Factory(); var client = app.CreateClient(); var account = await Register(client);
        client.DefaultRequestHeaders.Authorization = new("Bearer", account.Token);
        var responses = await Task.WhenAll(Enumerable.Range(0, 21).Select(i => client.PostAsJsonAsync("/api/v1/api-keys/generate", new GenerateKeyRequest("device-" + i))));
        Assert.Equal(20, responses.Count(response => response.IsSuccessStatusCode));
        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Conflict);
        var keys = await client.GetFromJsonAsync<JsonElement>("/api/v1/api-keys");
        Assert.Equal(20, keys.GetArrayLength());
        (await client.DeleteAsync("/api/v1/api-keys/" + keys[0].GetProperty("id").GetString())).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/v1/api-keys/generate", new GenerateKeyRequest("replacement"))).EnsureSuccessStatusCode();
    }
}
