using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using Element.Services.Notification.API.Webhooks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Element.Services.UnitTests.Notification;

public class WebhookFanoutTests
{
    [Theory]
    [InlineData("127.0.0.1")]
    [InlineData("10.1.2.3")]
    [InlineData("172.16.0.1")]
    [InlineData("192.168.1.1")]
    [InlineData("169.254.169.254")]
    [InlineData("100.64.0.1")]
    [InlineData("::1")]
    [InlineData("::ffff:127.0.0.1")]
    [InlineData("fc00::1")]
    [InlineData("0.0.0.0")]
    [InlineData("100.127.255.255")]
    [InlineData("192.0.0.170")]
    [InlineData("198.18.0.1")]
    [InlineData("224.0.0.1")]
    [InlineData("255.255.255.255")]
    [InlineData("::")]
    [InlineData("::ffff:169.254.169.254")]
    [InlineData("::169.254.169.254")]      // IPv4-compatible
    [InlineData("64:ff9b::a9fe:a9fe")]     // NAT64 → 169.254.169.254
    [InlineData("64:ff9b::a00:1")]         // NAT64 → 10.0.0.1
    [InlineData("fd00:ec2::254")]          // AWS IMDS over IPv6
    [InlineData("fe80::1")]
    [InlineData("ff02::1")]
    public void BlocksPrivateDestinations(string address) =>
        Assert.True(WebhookFanout.IsPrivate(IPAddress.Parse(address)));

    [Theory]
    [InlineData("8.8.8.8")]
    [InlineData("100.63.255.255")]
    [InlineData("172.32.0.1")]
    [InlineData("2606:4700:4700::1111")]
    [InlineData("::ffff:8.8.8.8")]
    public void AllowsPublicDestinations(string address) =>
        Assert.False(WebhookFanout.IsPrivate(IPAddress.Parse(address)));

    [Fact]
    public async Task OneEventReachesAtMostTheHookCap()
    {
        var hooks = Enumerable.Range(0, WebhookFanout.MaxHooksPerEvent + 5)
            .Select(i => new { url = $"https://8.8.8.8/hook/{i}", secret = "s", events = "order.updated" });
        using var internalClient = new HttpClient(new StubHandler(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = JsonContent.Create(hooks)
        })));
        var delivered = 0;
        using var deliveryClient = new HttpClient(new StubHandler(_ =>
        {
            Interlocked.Increment(ref delivered);
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NoContent));
        }));
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("webhooks-internal")).Returns(internalClient);
        factory.Setup(f => f.CreateClient("webhooks")).Returns(deliveryClient);
        var fanout = new WebhookFanout(factory.Object, new ConfigurationBuilder().Build(), NullLogger<WebhookFanout>.Instance);

        await fanout.PublishAsync("order.updated", new { }, customerId: Guid.NewGuid());

        Assert.Equal(WebhookFanout.MaxHooksPerEvent, delivered);
    }

    [Fact]
    public async Task DeliveryNamesOnlyCurrentEventAndSignsExactBody()
    {
        string? eventHeader = null;
        string? signature = null;
        string? body = null;

        // The identity service returns one public HTTPS hook subscribed to two events.
        var subscriptions = new[]
        {
            new { url = "https://8.8.8.8/hook", secret = "test-secret", events = "price.updated,order.updated" },
        };
        using var internalClient = new HttpClient(new StubHandler(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = JsonContent.Create(subscriptions),
        })));
        // Every outbound request is intercepted; no network request is sent.
        using var deliveryClient = new HttpClient(new StubHandler(async request =>
        {
            eventHeader = request.Headers.GetValues("X-Element-Event").Single();
            signature = request.Headers.GetValues("X-Element-Signature").Single();
            body = await request.Content!.ReadAsStringAsync();
            return new HttpResponseMessage(HttpStatusCode.NoContent);
        }));
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("webhooks-internal")).Returns(internalClient);
        factory.Setup(f => f.CreateClient("webhooks")).Returns(deliveryClient);
        var fanout = new WebhookFanout(factory.Object, new ConfigurationBuilder().Build(), NullLogger<WebhookFanout>.Instance);

        await fanout.PublishAsync("order.updated", new { OrderId = "test-order", Status = "Completed" });

        Assert.Equal("order.updated", eventHeader);
        Assert.NotNull(body);
        var expectedHash = HMACSHA256.HashData(Encoding.UTF8.GetBytes("test-secret"), Encoding.UTF8.GetBytes(body));
        var expectedSignature = Convert.ToHexString(expectedHash).ToLowerInvariant();
        Assert.Equal(expectedSignature, signature);
    }

    [Fact]
    public async Task SubscriptionLookupFailureThrowsSoTheEventIsRetried()
    {
        using var internalClient = new HttpClient(new StubHandler(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable))));
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient("webhooks-internal")).Returns(internalClient);
        var fanout = new WebhookFanout(factory.Object, new ConfigurationBuilder().Build(), NullLogger<WebhookFanout>.Instance);

        await Assert.ThrowsAsync<HttpRequestException>(() => fanout.PublishAsync("order.updated", new { }, customerId: Guid.NewGuid()));
        factory.Verify(f => f.CreateClient("webhooks"), Times.Never);
    }

    private sealed class StubHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> send) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => send(request);
    }
}
