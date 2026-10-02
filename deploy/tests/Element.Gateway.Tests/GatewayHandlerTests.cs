using System.Net;
using System.Text;
using System.Text.Json;
using Element.Gateway.Middleware.ApiKeyValidation;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Moq;
using Moq.Protected;
using StackExchange.Redis;

namespace Element.Gateway.Tests;

/// <summary>Covers the identity lookup and the Redis per-key rate limit of <see cref="ApiKeyValidator"/>.</summary>
public class GatewayHandlerTests
{
    private const string ValidKey = "ele_live_12345678901234567890123456789012";
    private static readonly IConfiguration EmptyConfig = new ConfigurationBuilder().Build();

    /// <summary>Fake identity-service that answers every validate call with the given status and body.</summary>
    private static IHttpClientFactory IdentityFactory(HttpStatusCode status, string responseJson)
    {
        var handler = new Mock<HttpMessageHandler>();
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(status)
            {
                Content = new StringContent(responseJson, Encoding.UTF8, "application/json"),
            });

        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(new HttpClient(handler.Object));
        return factory.Object;
    }

    private static IHttpClientFactory IdentityFactory(Guid userId, HttpStatusCode status = HttpStatusCode.OK)
    {
        var responseJson = JsonSerializer.Serialize(new { userId, isActive = status == HttpStatusCode.OK, rateLimitTps = 10 });
        return IdentityFactory(status, responseJson);
    }

    private static IConnectionMultiplexer MultiplexerFor(Mock<IDatabase> redisDb)
    {
        var multiplexer = new Mock<IConnectionMultiplexer>();
        multiplexer.Setup(m => m.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(redisDb.Object);
        return multiplexer.Object;
    }

    /// <summary>Redis whose per-second counter returns <paramref name="requestCount"/> on increment.</summary>
    private static Mock<IDatabase> RedisWithCounter(long requestCount)
    {
        var redisDb = new Mock<IDatabase>();
        redisDb.Setup(r => r.StringIncrementAsync(It.IsAny<RedisKey>(), It.IsAny<long>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(requestCount);
        redisDb.Setup(r => r.KeyExpireAsync(It.IsAny<RedisKey>(), It.IsAny<TimeSpan>(), It.IsAny<ExpireWhen>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(true);
        return redisDb;
    }

    [Fact]
    public async Task ValidateApiKeyAsync_Returns503_WhenIdentityUnreachable()
    {
        var unreachableIdentity = new Mock<IHttpClientFactory>();
        unreachableIdentity.Setup(f => f.CreateClient(It.IsAny<string>())).Throws(new HttpRequestException("down"));

        var context = new DefaultHttpContext();
        var (ok, vc) = await ApiKeyValidator.ValidateApiKeyAsync(
            context, ValidKey, MultiplexerFor(new Mock<IDatabase>()), unreachableIdentity.Object, EmptyConfig);

        ok.Should().BeFalse();
        vc.StatusCode.Should().Be(StatusCodes.Status503ServiceUnavailable);
    }

    [Fact]
    public async Task ValidateApiKeyAsync_SetsUser_WhenIdentityValidates()
    {
        var userId = Guid.NewGuid();
        var responseJson = JsonSerializer.Serialize(new
        {
            id = userId,
            userId,
            isActive = true,
            rateLimitTps = 20,
        });

        var context = new DefaultHttpContext();
        var (ok, vc) = await ApiKeyValidator.ValidateApiKeyAsync(
            context, ValidKey, MultiplexerFor(RedisWithCounter(1)), IdentityFactory(HttpStatusCode.OK, responseJson), EmptyConfig);

        ok.Should().BeTrue();
        vc.IsActive.Should().BeTrue();
        vc.UserId.Should().Be(userId);
        vc.RateLimitTps.Should().Be(20);
    }

    [Fact]
    public async Task ValidateApiKeyAsync_IgnoresStaleCache_WhenIdentityRejects()
    {
        var userId = Guid.NewGuid();

        // A cached "active" entry must never win over identity's live answer.
        var cached = JsonSerializer.Serialize(new { UserId = userId, IsActive = true, RateLimitTps = 15 });
        var redisDb = RedisWithCounter(1);
        redisDb.Setup(r => r.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync((RedisValue)cached);

        var context = new DefaultHttpContext();
        var (ok, vc) = await ApiKeyValidator.ValidateApiKeyAsync(
            context, ValidKey, MultiplexerFor(redisDb), IdentityFactory(userId, HttpStatusCode.Unauthorized), EmptyConfig);

        ok.Should().BeFalse();
        vc.StatusCode.Should().Be(401);
        context.Items["HashedApiKey"].Should().NotBeNull();
    }

    [Fact]
    public async Task ValidateApiKeyAsync_Returns429_WhenOverLimit()
    {
        var userId = Guid.NewGuid();

        // Identity allows 10 requests per second; this is the 11th.
        var context = new DefaultHttpContext();
        var (ok, vc) = await ApiKeyValidator.ValidateApiKeyAsync(
            context, ValidKey, MultiplexerFor(RedisWithCounter(11)), IdentityFactory(userId), EmptyConfig);

        ok.Should().BeFalse();
        vc.StatusCode.Should().Be(StatusCodes.Status429TooManyRequests);
    }

    [Fact]
    public async Task ValidateApiKeyAsync_Returns429_WhenRedisRateLimitThrows()
    {
        var userId = Guid.NewGuid();
        var redisDb = new Mock<IDatabase>();
        redisDb.Setup(r => r.StringIncrementAsync(It.IsAny<RedisKey>(), It.IsAny<long>(), It.IsAny<CommandFlags>()))
            .ThrowsAsync(new RedisConnectionException(ConnectionFailureType.UnableToConnect, "down"));

        var context = new DefaultHttpContext();
        var (ok, vc) = await ApiKeyValidator.ValidateApiKeyAsync(
            context, ValidKey, MultiplexerFor(redisDb), IdentityFactory(userId), EmptyConfig);

        ok.Should().BeFalse();
        vc.StatusCode.Should().Be(StatusCodes.Status429TooManyRequests);
    }
}
