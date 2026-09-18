using System.Net;
using Element.Gateway;
using FluentAssertions;
using Microsoft.AspNetCore.Http;

namespace Element.Gateway.Tests;

public class ClientIpTests
{
    [Fact]
    public void Resolve_UsesRemoteIp_WhenNotLoopback()
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.10");
        context.Request.Headers["X-Forwarded-For"] = "198.51.100.1";

        ClientIp.Resolve(context).Should().Be("203.0.113.10");
    }

    [Fact]
    public void Resolve_UsesFirstForwardedHop_WhenRemoteIsLoopback()
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Loopback;
        context.Request.Headers["X-Forwarded-For"] = "198.51.100.1, 203.0.113.10";

        ClientIp.Resolve(context).Should().Be("198.51.100.1");
    }

    [Fact]
    public void Resolve_FallsBackToLoopback_WhenNoForwardedHeader()
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.IPv6Loopback;

        ClientIp.Resolve(context).Should().Be("::1");
    }
}
