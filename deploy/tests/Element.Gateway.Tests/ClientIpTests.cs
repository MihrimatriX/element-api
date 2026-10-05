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

    [Fact]
    public void Resolve_UsesFirstForwardedHop_WhenRemoteIsDockerPrivate()
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse("172.18.0.5");
        context.Request.Headers["X-Forwarded-For"] = "198.51.100.1, 172.18.0.5";

        ClientIp.Resolve(context).Should().Be("198.51.100.1");
    }

    [Fact]
    public void IsTrustedProxy_AcceptsRfc1918_RejectsPublic()
    {
        var previous = Environment.GetEnvironmentVariable("TRUSTED_PROXY_CIDRS");
        try
        {
            Environment.SetEnvironmentVariable("TRUSTED_PROXY_CIDRS", null);
            ClientIp.IsTrustedProxy(IPAddress.Parse("10.0.0.3")).Should().BeTrue();
            ClientIp.IsTrustedProxy(IPAddress.Parse("192.168.1.1")).Should().BeTrue();
            ClientIp.IsTrustedProxy(IPAddress.Parse("203.0.113.10")).Should().BeFalse();
        }
        finally
        {
            Environment.SetEnvironmentVariable("TRUSTED_PROXY_CIDRS", previous);
        }
    }

    [Fact]
    public void IsTrustedProxy_UsesExplicitCidrs_WhenEnvSet()
    {
        var previous = Environment.GetEnvironmentVariable("TRUSTED_PROXY_CIDRS");
        try
        {
            Environment.SetEnvironmentVariable("TRUSTED_PROXY_CIDRS", "172.16.0.0/12");
            ClientIp.IsTrustedProxy(IPAddress.Parse("172.18.0.5")).Should().BeTrue();
            ClientIp.IsTrustedProxy(IPAddress.Parse("10.0.0.3")).Should().BeFalse();
            ClientIp.IsTrustedProxy(IPAddress.Loopback).Should().BeTrue();
        }
        finally
        {
            Environment.SetEnvironmentVariable("TRUSTED_PROXY_CIDRS", previous);
        }
    }
}
