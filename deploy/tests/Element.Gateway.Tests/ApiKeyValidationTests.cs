using Element.Gateway.Middleware.ApiKeyValidation;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Moq;
using StackExchange.Redis;

namespace Element.Gateway.Tests;

public class ApiKeyValidationTests
{
    private static readonly IHttpClientFactory UnusedHttp = Mock.Of<IHttpClientFactory>();
    private static readonly IConfiguration EmptyConfig = new ConfigurationBuilder().Build();

    private static IConnectionMultiplexer UnusedRedis()
    {
        var redisDb = new Mock<IDatabase>();
        var multiplexer = new Mock<IConnectionMultiplexer>();
        multiplexer.Setup(m => m.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(redisDb.Object);
        return multiplexer.Object;
    }

    [Fact]
    public async Task ValidateApiKeyAsync_Returns401_WhenApiKeyIsEmpty()
    {
        var context = new DefaultHttpContext();

        var (ok, vc) = await ApiKeyValidator.ValidateApiKeyAsync(
            context, string.Empty, UnusedRedis(), UnusedHttp, EmptyConfig);

        ok.Should().BeFalse();
        vc.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        vc.ErrorMessage.Should().Be("API Key is missing. Please provide it in the 'X-API-Key' header.");
    }

    [Fact]
    public async Task ValidateApiKeyAsync_Returns400_WhenFormatIsInvalid()
    {
        var context = new DefaultHttpContext();

        var (ok, vc) = await ApiKeyValidator.ValidateApiKeyAsync(
            context, "invalid_format_key", UnusedRedis(), UnusedHttp, EmptyConfig);

        ok.Should().BeFalse();
        vc.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        vc.ErrorMessage.Should().Be("API Key format is invalid. It should start with 'ele_live_' followed by 32 characters.");
    }
}
