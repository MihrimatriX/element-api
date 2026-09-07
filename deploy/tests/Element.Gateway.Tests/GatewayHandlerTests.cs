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

public class GatewayHandlerTests
{
    private const string ValidKey = "ele_live_12345678901234567890123456789012";

    [Fact]
    public async Task ValidateApiKeyAsync_Returns503_WhenIdentityUnreachable()
    {
        var mockFactory = new Mock<IHttpClientFactory>();
        mockFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Throws(new HttpRequestException("down"));

        var redisDb = new Mock<IDatabase>();
        redisDb.Setup(r => r.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(RedisValue.Null);
        var multiplexer = new Mock<IConnectionMultiplexer>();
        multiplexer.Setup(m => m.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(redisDb.Object);

        var context = new DefaultHttpContext();
        var (ok, vc) = await ApiKeyValidator.ValidateApiKeyAsync(
            context, ValidKey, multiplexer.Object, mockFactory.Object, new ConfigurationBuilder().Build());

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
            rateLimitTps = 20
        });

        var messageHandler = new Mock<HttpMessageHandler>();
        messageHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseJson, Encoding.UTF8, "application/json")
            });

        var client = new HttpClient(messageHandler.Object);
        var mockFactory = new Mock<IHttpClientFactory>();
        mockFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(client);

        var redisDb = new Mock<IDatabase>();
        redisDb.Setup(r => r.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(RedisValue.Null);
        redisDb.Setup(r => r.StringIncrementAsync(It.IsAny<RedisKey>(), It.IsAny<long>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(1L);
        redisDb.Setup(r => r.KeyExpireAsync(It.IsAny<RedisKey>(), It.IsAny<TimeSpan>(), It.IsAny<ExpireWhen>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(true);
        var multiplexer = new Mock<IConnectionMultiplexer>();
        multiplexer.Setup(m => m.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(redisDb.Object);

        var context = new DefaultHttpContext();
        var (ok, vc) = await ApiKeyValidator.ValidateApiKeyAsync(
            context, ValidKey, multiplexer.Object, mockFactory.Object, new ConfigurationBuilder().Build());

        ok.Should().BeTrue();
        vc.IsActive.Should().BeTrue();
        vc.UserId.Should().Be(userId);
        vc.RateLimitTps.Should().Be(20);
    }

    [Fact]
    public async Task ValidateApiKeyAsync_SetsContext_FromRedisCache()
    {
        var userId = Guid.NewGuid();
        var cached = JsonSerializer.Serialize(new { UserId = userId, IsActive = true, RateLimitTps = 15 });

        var redisDb = new Mock<IDatabase>();
        redisDb.Setup(r => r.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync((RedisValue)cached);
        redisDb.Setup(r => r.StringIncrementAsync(It.IsAny<RedisKey>(), It.IsAny<long>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(1L);
        redisDb.Setup(r => r.KeyExpireAsync(It.IsAny<RedisKey>(), It.IsAny<TimeSpan>(), It.IsAny<ExpireWhen>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(true);
        var multiplexer = new Mock<IConnectionMultiplexer>();
        multiplexer.Setup(m => m.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(redisDb.Object);

        var context = new DefaultHttpContext();
        var (ok, vc) = await ApiKeyValidator.ValidateApiKeyAsync(
            context, ValidKey, multiplexer.Object, Mock.Of<IHttpClientFactory>(), new ConfigurationBuilder().Build());

        ok.Should().BeTrue();
        vc.IsActive.Should().BeTrue();
        vc.UserId.Should().Be(userId);
        vc.RateLimitTps.Should().Be(15);
        context.Items["HashedApiKey"].Should().NotBeNull();
    }

    [Fact]
    public async Task ValidateApiKeyAsync_Returns429_WhenOverLimit()
    {
        var userId = Guid.NewGuid();
        var cached = JsonSerializer.Serialize(new { UserId = userId, IsActive = true, RateLimitTps = 10 });

        var redisDb = new Mock<IDatabase>();
        redisDb.Setup(r => r.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync((RedisValue)cached);
        redisDb.Setup(r => r.StringIncrementAsync(It.IsAny<RedisKey>(), It.IsAny<long>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(11L);
        var multiplexer = new Mock<IConnectionMultiplexer>();
        multiplexer.Setup(m => m.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(redisDb.Object);

        var context = new DefaultHttpContext();
        var (ok, vc) = await ApiKeyValidator.ValidateApiKeyAsync(
            context, ValidKey, multiplexer.Object, Mock.Of<IHttpClientFactory>(), new ConfigurationBuilder().Build());

        ok.Should().BeFalse();
        vc.StatusCode.Should().Be(StatusCodes.Status429TooManyRequests);
    }

    [Fact]
    public async Task ValidateApiKeyAsync_Returns429_WhenRedisRateLimitThrows()
    {
        var userId = Guid.NewGuid();
        var cached = JsonSerializer.Serialize(new { UserId = userId, IsActive = true, RateLimitTps = 10 });

        var redisDb = new Mock<IDatabase>();
        redisDb.Setup(r => r.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync((RedisValue)cached);
        redisDb.Setup(r => r.StringIncrementAsync(It.IsAny<RedisKey>(), It.IsAny<long>(), It.IsAny<CommandFlags>()))
            .ThrowsAsync(new RedisConnectionException(ConnectionFailureType.UnableToConnect, "down"));
        var multiplexer = new Mock<IConnectionMultiplexer>();
        multiplexer.Setup(m => m.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(redisDb.Object);

        var context = new DefaultHttpContext();
        var (ok, vc) = await ApiKeyValidator.ValidateApiKeyAsync(
            context, ValidKey, multiplexer.Object, Mock.Of<IHttpClientFactory>(), new ConfigurationBuilder().Build());

        ok.Should().BeFalse();
        vc.StatusCode.Should().Be(StatusCodes.Status429TooManyRequests);
    }
}
