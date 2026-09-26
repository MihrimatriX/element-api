using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;

namespace Element.Services.Identity.Infrastructure.Services;

public interface ICaptchaVerifier
{
    bool Enabled { get; }
    Task<bool> VerifyAsync(string? token, CancellationToken ct = default);
}

/// <summary>
/// Cloudflare Turnstile siteverify. Empty CAPTCHA_SECRET_KEY → off (local/dev).
/// </summary>
public sealed class TurnstileCaptchaVerifier(HttpClient http, IConfiguration configuration) : ICaptchaVerifier
{
    private const string SiteVerifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    public bool Enabled => !string.IsNullOrWhiteSpace(configuration["CAPTCHA_SECRET_KEY"]);

    public async Task<bool> VerifyAsync(string? token, CancellationToken ct = default)
    {
        if (!Enabled) return true;
        if (string.IsNullOrWhiteSpace(token)) return false;

        using var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["secret"] = configuration["CAPTCHA_SECRET_KEY"]!,
            ["response"] = token,
        });
        using var response = await http.PostAsync(SiteVerifyUrl, content, ct);
        if (!response.IsSuccessStatusCode) return false;

        var body = await response.Content.ReadFromJsonAsync<SiteVerifyBody>(cancellationToken: ct);
        return body?.Success == true;
    }

    private sealed class SiteVerifyBody
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }
    }
}
