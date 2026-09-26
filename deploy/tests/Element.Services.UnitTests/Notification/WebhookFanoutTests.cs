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
    public void BlocksPrivateDestinations(string address) =>
        Assert.True(WebhookFanout.IsPrivate(IPAddress.Parse(address)));

    [Fact]
    public async Task DeliveryNamesOnlyCurrentEventAndSignsExactBody()
    {
        string? eventHeader = null, signature = null, body = null;
        using var internalClient = new HttpClient(new StubHandler(_ => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = JsonContent.Create(new[] { new { url = "https://8.8.8.8/hook", secret = "test-secret", events = "price.updated,order.updated" } })
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
        Assert.Equal(Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes("test-secret"), Encoding.UTF8.GetBytes(body))).ToLowerInvariant(), signature);
    }

    private sealed class StubHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> send) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => send(request);
    }
}
