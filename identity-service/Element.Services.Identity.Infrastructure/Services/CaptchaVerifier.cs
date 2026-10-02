using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;

namespace Element.Services.Identity.Infrastructure.Services;

/// <summary>Checks the human-verification (captcha) token sent with sign-up and sign-in.</summary>
public interface ICaptchaVerifier
{
    /// <summary>True when a captcha secret is configured, i.e. tokens are really checked.</summary>
    bool Enabled { get; }

    /// <summary>Returns true when the token is accepted, and always true while the check is disabled.</summary>
    Task<bool> VerifyAsync(string? token, CancellationToken ct = default);
}

/// <summary>Cloudflare Turnstile client. An empty CAPTCHA_SECRET_KEY turns the check off (local/dev).</summary>
public sealed class TurnstileCaptchaVerifier(HttpClient http, IConfiguration configuration) : ICaptchaVerifier
{
    private const string SecretKeySetting = "CAPTCHA_SECRET_KEY";
    private const string SiteVerifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    /// <inheritdoc />
    public bool Enabled => !string.IsNullOrWhiteSpace(configuration[SecretKeySetting]);

    /// <inheritdoc />
    public async Task<bool> VerifyAsync(string? token, CancellationToken ct = default)
    {
        if (!Enabled)
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        using var form = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["secret"] = configuration[SecretKeySetting]!,
            ["response"] = token,
        });
        using var response = await http.PostAsync(SiteVerifyUrl, form, ct);
        if (!response.IsSuccessStatusCode)
        {
            return false;
        }

        var body = await response.Content.ReadFromJsonAsync<SiteVerifyBody>(cancellationToken: ct);
        return body?.Success == true;
    }

    // Only the "success" field of Cloudflare's answer matters here.
    private sealed class SiteVerifyBody
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }
    }
}
