using Element.Services.Identity.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;

namespace Element.Services.UnitTests.Identity;

public class CaptchaVerifierTests
{
    [Fact]
    public async Task Disabled_AllowsMissingToken()
    {
        var sut = new TurnstileCaptchaVerifier(new HttpClient(), EmptyConfig());
        sut.Enabled.Should().BeFalse();
        (await sut.VerifyAsync(null)).Should().BeTrue();
        (await sut.VerifyAsync("")).Should().BeTrue();
    }

    [Fact]
    public async Task Enabled_RejectsMissingToken()
    {
        var sut = new TurnstileCaptchaVerifier(new HttpClient(), SecretConfig("test-secret"));
        sut.Enabled.Should().BeTrue();
        (await sut.VerifyAsync(null)).Should().BeFalse();
        (await sut.VerifyAsync("  ")).Should().BeFalse();
    }

    [Fact]
    public async Task Enabled_AcceptsCloudflareSuccess()
    {
        var handler = new FixedJsonHandler("""{"success":true}""");
        var sut = new TurnstileCaptchaVerifier(new HttpClient(handler), SecretConfig("test-secret"));
        (await sut.VerifyAsync("token-ok")).Should().BeTrue();
        handler.LastPath.Should().Be("/turnstile/v0/siteverify");
    }

    [Fact]
    public async Task Enabled_RejectsCloudflareFailure()
    {
        var handler = new FixedJsonHandler("""{"success":false,"error-codes":["invalid-input-response"]}""");
        var sut = new TurnstileCaptchaVerifier(new HttpClient(handler), SecretConfig("test-secret"));
        (await sut.VerifyAsync("bad")).Should().BeFalse();
    }

    private static IConfiguration EmptyConfig() =>
        new ConfigurationBuilder().AddInMemoryCollection().Build();

    private static IConfiguration SecretConfig(string secret) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["CAPTCHA_SECRET_KEY"] = secret })
            .Build();

    private sealed class FixedJsonHandler(string json) : HttpMessageHandler
    {
        public string? LastPath { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastPath = request.RequestUri?.AbsolutePath;
            return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK)
            {
                Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json"),
            });
        }
    }
}
