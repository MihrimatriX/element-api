using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Http;

namespace Element.Gateway.Tests;

/// <summary>Pins the edge quota numbers so a change to <see cref="RateLimitPolicy"/> is always deliberate.</summary>
public class RateLimitPolicyTests
{
    [Fact]
    public void Resolve_Register_IsStricterThanOtherAuth()
    {
        var register = RateLimitPolicy.Resolve(Request(HttpMethods.Post, "/api/v1/auth/register"));
        var login = RateLimitPolicy.Resolve(Request(HttpMethods.Post, "/api/v1/auth/login"));

        register.PermitLimit.Should().Be(5);
        register.Window.Should().Be(TimeSpan.FromMinutes(1));
        register.PartitionKey.Should().StartWith("register:");

        login.PermitLimit.Should().Be(15);
        login.Window.Should().Be(TimeSpan.FromMinutes(1));
        login.PartitionKey.Should().StartWith("auth:");
    }

    [Theory]
    [InlineData("/api/v1/auth/password/forgot")]
    [InlineData("/api/v1/auth/email/send-verification")]
    public void Resolve_MailSendingEndpoints_ShareTheRegisterBucket(string path)
    {
        var policy = RateLimitPolicy.Resolve(Request(HttpMethods.Post, path));

        policy.PermitLimit.Should().Be(5);
        policy.PartitionKey.Should().StartWith("register:");
    }

    [Fact]
    public void Resolve_PublicApi_IsSixtyPerTenSeconds()
    {
        var get = RateLimitPolicy.Resolve(Request(HttpMethods.Get, "/api/v2/elements/fe"));

        get.PermitLimit.Should().Be(60);
        get.Window.Should().Be(TimeSpan.FromSeconds(10));
        get.PartitionKey.Should().StartWith("public:");
    }

    private static DefaultHttpContext Request(string method, string path)
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.50");
        context.Request.Method = method;
        context.Request.Path = path;
        return context;
    }
}
