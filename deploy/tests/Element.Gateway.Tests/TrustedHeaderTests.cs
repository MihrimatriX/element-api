using Element.Gateway.Middleware;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Moq;
using StackExchange.Redis;

namespace Element.Gateway.Tests;

public class TrustedHeaderTests
{
    [Fact]
    public async Task ClientSuppliedTrustHeaders_AreStripped_OnRoutesWithoutApiKey()
    {
        IHeaderDictionary? forwarded = null;
        var middleware = new ApiKeyValidationMiddleware(
            ctx => { forwarded = ctx.Request.Headers; return Task.CompletedTask; },
            Mock.Of<IConnectionMultiplexer>(),
            Mock.Of<IHttpClientFactory>(),
            new ConfigurationBuilder().Build());

        var context = new DefaultHttpContext();
        context.Request.Path = "/api/v1/stock/fe";
        context.Request.Headers["X-User-Id"] = Guid.NewGuid().ToString();
        context.Request.Headers["INTERNAL_API_KEY"] = "guessed-key";
        context.Request.Headers["X-Request-Id"] = "keep-me";

        await middleware.InvokeAsync(context);

        forwarded.Should().NotBeNull();
        forwarded!.ContainsKey("X-User-Id").Should().BeFalse();
        forwarded.ContainsKey("INTERNAL_API_KEY").Should().BeFalse();
        forwarded["X-Request-Id"].ToString().Should().Be("keep-me");
    }
}
