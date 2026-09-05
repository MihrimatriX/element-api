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
    [Fact]
    public async Task DatabaseCheckHandler_Returns503_WhenIdentityUnreachable()
    {
        var mockFactory = new Mock<IHttpClientFactory>();
        mockFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Throws(new HttpRequestException("down"));

        var dbHandler = new DatabaseCheckHandler(mockFactory.Object, new ConfigurationBuilder().Build());
        var context = new DefaultHttpContext();
        var validationContext = new ApiKeyValidationContext();

        var result = await dbHandler.HandleAsync(context, "ele_live_12345678901234567890123456789012", validationContext);

        result.Should().BeFalse();
        validationContext.StatusCode.Should().Be(StatusCodes.Status503ServiceUnavailable);
    }

    [Fact]
    public async Task DatabaseCheckHandler_SetsUser_WhenIdentityValidates()
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

        var dbHandler = new DatabaseCheckHandler(mockFactory.Object, new ConfigurationBuilder().Build());
        var context = new DefaultHttpContext();
        var validationContext = new ApiKeyValidationContext();

        var result = await dbHandler.HandleAsync(context, "ele_live_12345678901234567890123456789012", validationContext);

        result.Should().BeTrue();
        validationContext.IsActive.Should().BeTrue();
        validationContext.UserId.Should().Be(userId);
        validationContext.RateLimitTps.Should().Be(20);
    }

    [Fact]
    public async Task RedisCacheCheckHandler_SetsContext_FromCache()
    {
        var userId = Guid.NewGuid();
        var cached = JsonSerializer.Serialize(new { UserId = userId, IsActive = true, RateLimitTps = 15 });

        var redisDb = new Mock<IDatabase>();
        redisDb.Setup(r => r.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync((RedisValue)cached);

        var multiplexer = new Mock<IConnectionMultiplexer>();
        multiplexer.Setup(m => m.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(redisDb.Object);

        var handler = new RedisCacheCheckHandler(multiplexer.Object);
        var context = new DefaultHttpContext();
        var validationContext = new ApiKeyValidationContext();

        await handler.HandleAsync(context, "ele_live_12345678901234567890123456789012", validationContext);

        validationContext.IsActive.Should().BeTrue();
        validationContext.UserId.Should().Be(userId);
        validationContext.RateLimitTps.Should().Be(15);
        context.Items["HashedApiKey"].Should().NotBeNull();
    }

    [Fact]
    public async Task RateLimitCheckHandler_Returns429_WhenOverLimit()
    {
        var redisDb = new Mock<IDatabase>();
        redisDb.Setup(r => r.StringIncrementAsync(It.IsAny<RedisKey>(), It.IsAny<long>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(11L);

        var multiplexer = new Mock<IConnectionMultiplexer>();
        multiplexer.Setup(m => m.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(redisDb.Object);

        var handler = new RateLimitCheckHandler(multiplexer.Object);
        var context = new DefaultHttpContext();
        context.Items["HashedApiKey"] = "abc123";
        var validationContext = new ApiKeyValidationContext { RateLimitTps = 10 };

        var result = await handler.HandleAsync(context, "ele_live_12345678901234567890123456789012", validationContext);

        result.Should().BeFalse();
        validationContext.StatusCode.Should().Be(StatusCodes.Status429TooManyRequests);
    }

    [Fact]
    public async Task RateLimitCheckHandler_Returns429_WhenRedisThrows()
    {
        var redisDb = new Mock<IDatabase>();
        redisDb.Setup(r => r.StringIncrementAsync(It.IsAny<RedisKey>(), It.IsAny<long>(), It.IsAny<CommandFlags>()))
            .ThrowsAsync(new RedisConnectionException(ConnectionFailureType.UnableToConnect, "down"));

        var multiplexer = new Mock<IConnectionMultiplexer>();
        multiplexer.Setup(m => m.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(redisDb.Object);

        var handler = new RateLimitCheckHandler(multiplexer.Object);
        var context = new DefaultHttpContext();
        context.Items["HashedApiKey"] = "abc123";
        var validationContext = new ApiKeyValidationContext { RateLimitTps = 10 };

        var result = await handler.HandleAsync(context, "ele_live_12345678901234567890123456789012", validationContext);

        result.Should().BeFalse();
        validationContext.StatusCode.Should().Be(StatusCodes.Status429TooManyRequests);
    }
}
