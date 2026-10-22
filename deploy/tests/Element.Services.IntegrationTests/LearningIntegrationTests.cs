using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Element.Services.Identity.API;
using Element.Services.Identity.API.Controllers;
using Element.Services.Identity.Core.DTOs;
using Element.Services.IntegrationTests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace Element.Services.IntegrationTests;

[Trait("Category", "Integration")]
public sealed class LearningIntegrationTests(IntegrationTestContainers containers) : IClassFixture<IntegrationTestContainers>
{
    private const string Password = "Password1!";
    private const string LearningUrl = "/api/v1/auth/learning";
    private const string DeleteConfirmation = "HESABIMI SİL";

    [Fact]
    public async Task Concurrent_devices_merge_progress_and_other_accounts_cannot_read_it()
    {
        await using var app = Factory();
        var first = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await first.GetAsync(LearningUrl)).StatusCode);

        var account = await Register(first);
        first.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", account.Token);
        var second = app.CreateClient();
        second.DefaultRequestHeaders.Authorization = first.DefaultRequestHeaders.Authorization;

        var responses = await Task.WhenAll(
            first.PutAsJsonAsync(LearningUrl, new { discoveries = new[] { "h2o", "co2" }, lessons = Array.Empty<string>() }),
            second.PutAsJsonAsync(LearningUrl, new { discoveries = new[] { "nh3", "h2o" }, lessons = Array.Empty<string>() }));
        foreach (var response in responses)
        {
            response.EnsureSuccessStatusCode();
        }

        var merged = await first.GetFromJsonAsync<JsonElement>(LearningUrl);
        Assert.Equal(3, merged.GetProperty("discoveries").GetArrayLength());

        var lessonUpdate = await first.PutAsJsonAsync(LearningUrl, new { discoveries = Array.Empty<string>(), lessons = new[] { "everyday" } });
        lessonUpdate.EnsureSuccessStatusCode();
        merged = await first.GetFromJsonAsync<JsonElement>(LearningUrl);
        Assert.Equal(1, merged.GetProperty("lessons").GetArrayLength());

        var unknownSlug = await first.PutAsJsonAsync(LearningUrl, new { discoveries = new[] { "fiction" }, lessons = Array.Empty<string>() });
        Assert.Equal(HttpStatusCode.BadRequest, unknownSlug.StatusCode);

        var other = app.CreateClient();
        var otherAccount = await Register(other);
        other.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", otherAccount.Token);
        var otherProgress = await other.GetFromJsonAsync<JsonElement>(LearningUrl);
        Assert.Equal(0, otherProgress.GetProperty("discoveries").GetArrayLength());
    }

    [Fact]
    public async Task Repeated_wrong_passwords_lock_the_account()
    {
        await using var app = Factory();
        var client = app.CreateClient();
        var account = await Register(client);

        for (var attempt = 0; attempt < 4; attempt++)
        {
            var wrongLogin = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(account.Email, "WrongPassword!"));
            Assert.Equal(HttpStatusCode.Unauthorized, wrongLogin.StatusCode);
        }

        // The 5th failure locks the account (SignInManager returns LockedOut on that attempt) → 429.
        var lockingLogin = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(account.Email, "WrongPassword!"));
        Assert.Equal(HttpStatusCode.TooManyRequests, lockingLogin.StatusCode);

        var correctLogin = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(account.Email, Password));
        Assert.Equal(HttpStatusCode.TooManyRequests, correctLogin.StatusCode);
    }

    [Fact]
    public async Task Password_confirmed_actions_share_the_login_lockout()
    {
        await using var app = Factory();
        var client = app.CreateClient();
        var account = await Register(client);
        client.DefaultRequestHeaders.Authorization = new("Bearer", account.Token);

        for (var attempt = 0; attempt < 4; attempt++)
        {
            var wrongDelete = await client.PostAsJsonAsync("/api/v1/auth/delete", new { password = "wrong-guess-" + attempt, confirmation = DeleteConfirmation });
            Assert.Equal(HttpStatusCode.BadRequest, wrongDelete.StatusCode);
        }

        // The 5th wrong password (here through password change) locks the account for every password-confirmed action.
        var lockingChange = await client.PostAsJsonAsync("/api/v1/auth/password/change", new { currentPassword = "wrong-guess-4", password = "Replacement1!" });
        Assert.Equal(HttpStatusCode.TooManyRequests, lockingChange.StatusCode);

        var correctDelete = await client.PostAsJsonAsync("/api/v1/auth/delete", new { password = Password, confirmation = DeleteConfirmation });
        Assert.Equal(HttpStatusCode.TooManyRequests, correctDelete.StatusCode);
    }

    [Fact]
    public async Task Password_change_revokes_old_sessions_and_all_device_keys()
    {
        await using var app = Factory();
        var client = app.CreateClient();
        var account = await Register(client);
        client.DefaultRequestHeaders.Authorization = new("Bearer", account.Token);

        (await client.PostAsJsonAsync("/api/v1/api-keys/generate", new GenerateKeyRequest("browser one"))).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/v1/api-keys/generate", new GenerateKeyRequest("browser two"))).EnsureSuccessStatusCode();

        var wrongCurrentPassword = await client.PostAsJsonAsync("/api/v1/auth/password/change", new { currentPassword = "wrong", password = "Replacement1!" });
        Assert.Equal(HttpStatusCode.BadRequest, wrongCurrentPassword.StatusCode);
        (await client.PostAsJsonAsync("/api/v1/auth/password/change", new { currentPassword = Password, password = "Replacement1!" })).EnsureSuccessStatusCode();

        // The old JWT carries the previous security stamp and must be rejected now.
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/auth/profile")).StatusCode);

        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(account.Email, "Replacement1!"));
        login.EnsureSuccessStatusCode();
        var newToken = (await login.Content.ReadFromJsonAsync<AuthResponse>())!.Token;
        client.DefaultRequestHeaders.Authorization = new("Bearer", newToken);

        var keys = await client.GetFromJsonAsync<JsonElement>("/api/v1/api-keys");
        Assert.Equal(2, keys.GetArrayLength());
        Assert.All(keys.EnumerateArray(), key => Assert.False(key.GetProperty("isActive").GetBoolean()));
    }

    [Fact]
    public async Task Mail_links_verify_email_and_reset_password_only_once()
    {
        var mailer = new CapturingMailer();
        await using var app = Factory(mailer);
        var client = app.CreateClient();
        var account = await Register(client);
        client.DefaultRequestHeaders.Authorization = new("Bearer", account.Token);

        (await client.PostAsJsonAsync("/api/v1/auth/email/send-verification", new { })).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/v1/auth/email/verify", new { email = account.Email, token = mailer.Token })).EnsureSuccessStatusCode();
        var profile = await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/profile");
        Assert.True(profile.GetProperty("emailConfirmed").GetBoolean());

        (await client.PostAsJsonAsync("/api/v1/auth/password/forgot", new { email = account.Email })).EnsureSuccessStatusCode();
        var resetToken = mailer.Token;

        // Same response, but no second mail inside the per-account window (anti mail-bombing).
        var repeatedForgot = await client.PostAsJsonAsync("/api/v1/auth/password/forgot", new { email = account.Email });
        Assert.Equal(HttpStatusCode.Accepted, repeatedForgot.StatusCode);
        Assert.Equal(2, mailer.Count);

        (await client.PostAsJsonAsync("/api/v1/auth/password/reset", new { email = account.Email, token = resetToken, password = "Replacement1!" })).EnsureSuccessStatusCode();

        var secondReset = await client.PostAsJsonAsync("/api/v1/auth/password/reset", new { email = account.Email, token = resetToken, password = "AnotherPassword1!" });
        Assert.Equal(HttpStatusCode.BadRequest, secondReset.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(LearningUrl)).StatusCode);
    }

    [Fact]
    public async Task Export_excludes_secrets_and_deletion_closes_account_and_learning()
    {
        await using var app = Factory();
        var client = app.CreateClient();
        var account = await Register(client);
        client.DefaultRequestHeaders.Authorization = new("Bearer", account.Token);

        (await client.PutAsJsonAsync(LearningUrl, new { discoveries = new[] { "h2o" }, lessons = Array.Empty<string>() })).EnsureSuccessStatusCode();
        var key = await client.PostAsJsonAsync("/api/v1/api-keys/generate", new GenerateKeyRequest("export test"));
        key.EnsureSuccessStatusCode();
        var rawKey = (await key.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("apiKey").GetString()!;

        var export = await client.GetStringAsync("/api/v1/auth/export");
        Assert.Contains(account.Email, export);
        Assert.Contains("discovery:h2o", export);
        Assert.DoesNotContain(rawKey, export);
        Assert.DoesNotContain("securityStamp", export);
        Assert.DoesNotContain("passwordHash", export);

        var wrongPasswordDelete = await client.PostAsJsonAsync("/api/v1/auth/delete", new { password = "wrong", confirmation = DeleteConfirmation });
        Assert.Equal(HttpStatusCode.BadRequest, wrongPasswordDelete.StatusCode);
        (await client.PostAsJsonAsync("/api/v1/auth/delete", new { password = Password, confirmation = DeleteConfirmation })).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(LearningUrl)).StatusCode);
        var loginAfterDelete = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(account.Email, Password));
        Assert.Equal(HttpStatusCode.Unauthorized, loginAfterDelete.StatusCode);
    }

    [Fact]
    public async Task Concurrent_key_issuance_respects_account_limit()
    {
        await using var app = Factory();
        var client = app.CreateClient();
        var account = await Register(client);
        client.DefaultRequestHeaders.Authorization = new("Bearer", account.Token);

        var parallelRequests = Enumerable.Range(0, 21)
            .Select(index => client.PostAsJsonAsync("/api/v1/api-keys/generate", new GenerateKeyRequest("device-" + index)));
        var responses = await Task.WhenAll(parallelRequests);
        Assert.Equal(20, responses.Count(response => response.IsSuccessStatusCode));
        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Conflict);

        var keys = await client.GetFromJsonAsync<JsonElement>("/api/v1/api-keys");
        Assert.Equal(20, keys.GetArrayLength());

        // Revoking one key frees a slot for a new one.
        (await client.DeleteAsync("/api/v1/api-keys/" + keys[0].GetProperty("id").GetString())).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/v1/api-keys/generate", new GenerateKeyRequest("replacement"))).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Revoked_key_history_is_bounded()
    {
        await using var app = Factory();
        var client = app.CreateClient();
        var account = await Register(client);
        client.DefaultRequestHeaders.Authorization = new("Bearer", account.Token);

        for (var index = 0; index < 23; index++)
        {
            var key = await client.PostAsJsonAsync("/api/v1/api-keys/generate", new GenerateKeyRequest("login-" + index));
            key.EnsureSuccessStatusCode();
            var id = (await key.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("details").GetProperty("id").GetString();
            (await client.DeleteAsync("/api/v1/api-keys/" + id)).EnsureSuccessStatusCode();
        }

        // Issuing a key prunes revoked history down to the newest 20 rows.
        (await client.PostAsJsonAsync("/api/v1/api-keys/generate", new GenerateKeyRequest("current"))).EnsureSuccessStatusCode();

        var keys = (await client.GetFromJsonAsync<JsonElement>("/api/v1/api-keys")).EnumerateArray().ToArray();
        Assert.Single(keys, key => key.GetProperty("isActive").GetBoolean());
        Assert.Equal(20, keys.Count(key => !key.GetProperty("isActive").GetBoolean()));
        Assert.DoesNotContain(keys, key => key.GetProperty("description").GetString() == "login-0");
    }

    private WebApplicationFactory<AuthController> Factory(IAccountMailer? mailer = null)
    {
        var connectionString = new NpgsqlConnectionStringBuilder(containers.Postgres.GetConnectionString())
        {
            Database = "element_identity_db",
        }.ConnectionString;

        return new WebApplicationFactory<AuthController>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ConnectionStrings:DefaultConnection", connectionString);
            if (mailer is not null)
            {
                builder.ConfigureServices(services => services.AddSingleton(mailer));
            }

            builder.UseSetting("JwtSettings:Secret", "IntegrationTestSecretKey_Minimum32Chars!");
            builder.UseSetting("INTERNAL_API_KEY", "test-internal-key");
        });
    }

    private static async Task<(string Email, string Token)> Register(HttpClient client)
    {
        var email = $"learning-{Guid.NewGuid():N}@test.local";
        (await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest(email, Password, "Test", "Learner"))).EnsureSuccessStatusCode();

        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, Password));
        response.EnsureSuccessStatusCode();
        var auth = await response.Content.ReadFromJsonAsync<AuthResponse>();
        return (email, auth!.Token);
    }

    /// <summary>Test mailer that counts messages and keeps the last one so the test can read the token from its link.</summary>
    private sealed class CapturingMailer : IAccountMailer
    {
        public bool Enabled => true;

        public string Message { get; private set; } = "";

        /// <summary>Number of mails sent so far.</summary>
        public int Count { get; private set; }

        /// <summary>Token from the link (the URL fragment) in the last captured message.</summary>
        public string Token
        {
            get
            {
                var link = Message.Split('\n').First(line => line.StartsWith("http"));
                var fragment = new Uri(link).Fragment.TrimStart('#');
                return QueryHelpers.ParseQuery(fragment)["token"].ToString();
            }
        }

        public Task SendAsync(string email, string subject, string message, CancellationToken ct)
        {
            Message = message;
            Count++;
            return Task.CompletedTask;
        }
    }
}
