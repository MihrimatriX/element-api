using System.Net;
using Element.Gateway;
using FluentAssertions;
using Microsoft.AspNetCore.Http;

namespace Element.Gateway.Tests;

public class RateLimitPolicyTests
{
    [Fact]
    public void Resolve_Register_IsStricterThanOtherAuth()
    {
        var register = RateLimitPolicy.Resolve(Post("/api/v1/auth/register"));
        var login = RateLimitPolicy.Resolve(Post("/api/v1/auth/login"));

        register.PermitLimit.Should().Be(5);
        register.Window.Should().Be(TimeSpan.FromMinutes(1));
        register.PartitionKey.Should().StartWith("register:");

        login.PermitLimit.Should().Be(15);
        login.Window.Should().Be(TimeSpan.FromMinutes(1));
        login.PartitionKey.Should().StartWith("auth:");
    }

    [Fact]
    public void Resolve_PublicApi_IsSixtyPerTenSeconds()
    {
        var get = RateLimitPolicy.Resolve(Get("/api/v2/elements/fe"));

        get.PermitLimit.Should().Be(60);
        get.Window.Should().Be(TimeSpan.FromSeconds(10));
        get.PartitionKey.Should().StartWith("public:");
    }

    static DefaultHttpContext Post(string path)
    {
        var ctx = new DefaultHttpContext();
        ctx.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.50");
        ctx.Request.Method = HttpMethods.Post;
        ctx.Request.Path = path;
        return ctx;
    }

    static DefaultHttpContext Get(string path)
    {
        var ctx = new DefaultHttpContext();
        ctx.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.50");
        ctx.Request.Method = HttpMethods.Get;
        ctx.Request.Path = path;
        return ctx;
    }
}
