using FluentAssertions;
using Microsoft.AspNetCore.Http;

namespace Element.Gateway.Tests;

/// <summary>Checks that every request leaves the gateway with an X-Request-Id.</summary>
public class CorrelationIdMiddlewareTests
{
    [Fact]
    public async Task Invoke_MintsRequestId_WhenMissing()
    {
        var context = new DefaultHttpContext();
        string? forwardedId = null;
        var middleware = new CorrelationIdMiddleware(forwardedContext =>
        {
            forwardedId = forwardedContext.Request.Headers[CorrelationIdMiddleware.HeaderName].ToString();
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(context);

        forwardedId.Should().NotBeNullOrWhiteSpace();
        forwardedId!.Length.Should().BeGreaterThan(8);
    }

    [Fact]
    public async Task Invoke_PreservesIncomingRequestId()
    {
        var context = new DefaultHttpContext();
        context.Request.Headers[CorrelationIdMiddleware.HeaderName] = "client-trace-abc";
        string? forwardedId = null;
        var middleware = new CorrelationIdMiddleware(forwardedContext =>
        {
            forwardedId = forwardedContext.Request.Headers[CorrelationIdMiddleware.HeaderName].ToString();
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(context);

        forwardedId.Should().Be("client-trace-abc");
    }
}
