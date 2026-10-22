using Element.Services.Identity.Core.Entities;
using FluentAssertions;

namespace Element.Services.UnitTests.Identity;

public class WebhookUrlTests
{
    [Theory]
    [InlineData("https://hooks.example.com/element")]
    [InlineData("https://hooks.example.com:8443/element?x=1")]
    [InlineData("https://bücher.example/hook")]
    public void Accepts_public_https_dns_names(string url) =>
        WebhookSubscription.IsAcceptableUrl(url).Should().BeTrue();

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not a url")]
    [InlineData("/relative/hook")]
    [InlineData("http://hooks.example.com/element")]
    [InlineData("ftp://hooks.example.com/element")]
    [InlineData("https://user:pass@hooks.example.com/element")]
    [InlineData("https://localhost/hook")]
    [InlineData("https://localhost./hook")]
    [InlineData("https://api.localhost/hook")]
    [InlineData("https://identity-service:8080/api/v1/internal/webhooks")]
    [InlineData("https://127.0.0.1/hook")]
    [InlineData("https://127.0.0.1./hook")]
    [InlineData("https://2130706433/hook")]
    [InlineData("https://0x7f.0.0.1/hook")]
    [InlineData("https://10.0.0.5/hook")]
    [InlineData("https://169.254.169.254/latest/meta-data")]
    [InlineData("https://8.8.8.8/hook")]
    [InlineData("https://[::1]/hook")]
    [InlineData("https://[fd00::1]/hook")]
    public void Rejects_internal_or_malformed_targets(string? url) =>
        WebhookSubscription.IsAcceptableUrl(url).Should().BeFalse();
}
