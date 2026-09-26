using FluentAssertions;
using Microsoft.AspNetCore.Http;

namespace Element.Gateway.Tests;

public class CorrelationIdMiddlewareTests
{
    [Fact]
    public async Task Invoke_MintsRequestId_WhenMissing()
    {
        var ctx = new DefaultHttpContext();
        string? seen = null;
        var mw = new CorrelationIdMiddleware(c =>
        {
            seen = c.Request.Headers[CorrelationIdMiddleware.HeaderName].ToString();
            return Task.CompletedTask;
        });

        await mw.InvokeAsync(ctx);

        seen.Should().NotBeNullOrWhiteSpace();
        seen!.Length.Should().BeGreaterThan(8);
    }

    [Fact]
    public async Task Invoke_PreservesIncomingRequestId()
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Headers[CorrelationIdMiddleware.HeaderName] = "client-trace-abc";
        string? seen = null;
        var mw = new CorrelationIdMiddleware(c =>
        {
            seen = c.Request.Headers[CorrelationIdMiddleware.HeaderName].ToString();
            return Task.CompletedTask;
        });

        await mw.InvokeAsync(ctx);
        seen.Should().Be("client-trace-abc");
    }
}
