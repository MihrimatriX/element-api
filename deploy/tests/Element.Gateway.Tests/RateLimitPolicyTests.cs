using System.Net;
using System.Threading.RateLimiting;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;

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

    [Fact]
    public async Task WriteRejectionAsync_TellsTheClientWhenToRetry()
    {
        using var limiter = new FixedWindowRateLimiter(new FixedWindowRateLimiterOptions
        {
            PermitLimit = 1,
            Window = TimeSpan.FromSeconds(10),
            QueueLimit = 0,
        });
        using var granted = limiter.AttemptAcquire();
        using var rejected = limiter.AttemptAcquire();
        var context = Request(HttpMethods.Get, "/api/v2/elements/fe");
        context.RequestServices = new ServiceCollection().BuildServiceProvider();
        context.Response.Body = new MemoryStream();

        await RateLimitPolicy.WriteRejectionAsync(
            new OnRejectedContext { HttpContext = context, Lease = rejected }, CancellationToken.None);

        rejected.IsAcquired.Should().BeFalse();
        int.Parse(context.Response.Headers.RetryAfter.ToString()).Should().BeInRange(1, 10);
        context.Response.ContentType.Should().StartWith("application/json");
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
