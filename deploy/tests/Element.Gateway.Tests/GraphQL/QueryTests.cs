using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Element.Gateway.GraphQL;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Element.Gateway.Tests.GraphQL;

public class QueryTests
{
    [Fact]
    public async Task GetElementPriceAsync_ReturnsPrice_WhenElementServiceResponds()
    {
        var handler = new StubElementHandler("""
            {"symbol":"Au","name":"Gold","pricePerGram":75.25}
            """);
        var services = new ServiceCollection();
        services.AddHttpClient("ElementService", c => c.BaseAddress = new Uri("http://element.test"))
            .ConfigurePrimaryHttpMessageHandler(() => handler);

        var factory = services.BuildServiceProvider();
        var query = new Query();
        var result = await query.GetElementPriceAsync("Au", factory.GetRequiredService<IHttpClientFactory>());

        result.Symbol.Should().Be("Au");
        result.PricePerGram.Should().Be(75.25m);
    }

    [Fact]
    public async Task GetElementPriceAsync_ReadsNestedMarketPrice()
    {
        var handler = new StubElementHandler("""
            {"symbol":"Au","name":"Gold","market":{"pricePerGram":75.25,"currency":"USD"}}
            """);
        var services = new ServiceCollection();
        services.AddHttpClient("ElementService", c => c.BaseAddress = new Uri("http://element.test"))
            .ConfigurePrimaryHttpMessageHandler(() => handler);

        var factory = services.BuildServiceProvider();
        var query = new Query();
        var result = await query.GetElementPriceAsync("Au", factory.GetRequiredService<IHttpClientFactory>());

        result.PricePerGram.Should().Be(75.25m);
    }

    [Fact]
    public async Task GetElementPriceAsync_ReturnsZero_WhenElementServiceFails()
    {
        var handler = new StubElementHandler(null, HttpStatusCode.NotFound);
        var services = new ServiceCollection();
        services.AddHttpClient("ElementService", c => c.BaseAddress = new Uri("http://element.test"))
            .ConfigurePrimaryHttpMessageHandler(() => handler);

        var factory = services.BuildServiceProvider();
        var query = new Query();
        var result = await query.GetElementPriceAsync("Xx", factory.GetRequiredService<IHttpClientFactory>());

        result.PricePerGram.Should().Be(0);
    }

    private sealed class StubElementHandler : HttpMessageHandler
    {
        private readonly string? _json;
        private readonly HttpStatusCode _status;

        public StubElementHandler(string? json, HttpStatusCode status = HttpStatusCode.OK)
        {
            _json = json;
            _status = status;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (_json == null)
                return Task.FromResult(new HttpResponseMessage(_status));

            return Task.FromResult(new HttpResponseMessage(_status)
            {
                Content = new StringContent(_json, System.Text.Encoding.UTF8, "application/json")
            });
        }
    }
}
