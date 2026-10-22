using System.Net;
using System.Text.Json;
using Element.Gateway.Middleware;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Moq;
using StackExchange.Redis;
using Yarp.ReverseProxy.Configuration;
using Yarp.ReverseProxy.Forwarder;
using Yarp.ReverseProxy.Model;

namespace Element.Gateway.Tests;

/// <summary>
/// Checks that clients cannot smuggle gateway-trusted headers (X-User-Id, INTERNAL_API_KEY) to the backends, and that
/// a protected route only reaches the backend with the identity-validated owner.
/// </summary>
public class TrustedHeaderTests
{
    private const string ConfiguredInternalKey = "gateway-internal-key";

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

    [Fact]
    public async Task ProtectedRoute_ForwardsValidatedOwner_InsteadOfSpoofedUserId()
    {
        var owner = Guid.NewGuid();
        IHeaderDictionary? forwarded = null;
        var middleware = new ApiKeyValidationMiddleware(
            ctx => { forwarded = ctx.Request.Headers; return Task.CompletedTask; },
            GatewayHandlerTests.MultiplexerFor(GatewayHandlerTests.RedisWithCounter(1)),
            GatewayHandlerTests.IdentityFactory(owner),
            ConfigWithInternalKey());

        var context = ProtectedRequest();
        context.Request.Headers["X-API-Key"] = GatewayHandlerTests.ValidKey;
        context.Request.Headers["X-User-Id"] = Guid.NewGuid().ToString();
        context.Request.Headers["INTERNAL_API_KEY"] = "guessed-key";

        await middleware.InvokeAsync(context);

        forwarded.Should().NotBeNull();
        forwarded!["X-User-Id"].ToString().Should().Be(owner.ToString());
        forwarded["INTERNAL_API_KEY"].ToString().Should().Be(ConfiguredInternalKey);
        context.Response.Headers.CacheControl.ToString().Should().Be("private, no-store");
    }

    [Fact]
    public async Task ProtectedRoute_WithoutKey_IsRejectedWithJsonProblem_AndNeverReachesBackend()
    {
        var backendCalled = false;
        var middleware = new ApiKeyValidationMiddleware(
            _ => { backendCalled = true; return Task.CompletedTask; },
            Mock.Of<IConnectionMultiplexer>(),
            Mock.Of<IHttpClientFactory>(),
            ConfigWithInternalKey());

        var context = ProtectedRequest();
        context.Request.Headers["X-User-Id"] = Guid.NewGuid().ToString();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        backendCalled.Should().BeFalse();
        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        context.Response.ContentType.Should().Be("application/json");
        context.Response.Headers.CacheControl.ToString().Should().Be("private, no-store");

        context.Response.Body.Position = 0;
        using var problem = await JsonDocument.ParseAsync(context.Response.Body);
        // PascalCase on purpose: clients already depend on this shape.
        problem.RootElement.GetProperty("Title").GetString().Should().Be("Authentication Failed");
        problem.RootElement.GetProperty("Status").GetInt32().Should().Be(401);
        // Instance is a serialised PathString ({"Value", "HasValue"}), not a plain string; pinned as shipped.
        problem.RootElement.GetProperty("Instance").GetProperty("Value").GetString().Should().Be("/api/v1/orders");
    }

    private static IConfiguration ConfigWithInternalKey() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["INTERNAL_API_KEY"] = ConfiguredInternalKey })
            .Build();

    // A request matched to a YARP route whose metadata says RequireApiKey = "true".
    private static DefaultHttpContext ProtectedRequest()
    {
        var route = new RouteConfig
        {
            RouteId = "orders",
            ClusterId = "order-cluster",
            Metadata = new Dictionary<string, string> { ["RequireApiKey"] = "true" },
        };
        var routeModel = new RouteModel(route, cluster: null, HttpTransformer.Default);

        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.7");
        context.Request.Method = HttpMethods.Get;
        context.Request.Path = "/api/v1/orders";
        context.SetEndpoint(new Endpoint(_ => Task.CompletedTask, new EndpointMetadataCollection(routeModel), "orders"));
        return context;
    }
}
