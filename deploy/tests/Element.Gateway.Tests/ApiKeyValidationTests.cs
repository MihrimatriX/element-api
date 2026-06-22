using System.Threading.Tasks;
using Element.Gateway.Middleware.ApiKeyValidation;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace Element.Gateway.Tests;

public class ApiKeyValidationTests
{
    [Fact]
    public async Task HeaderCheckHandler_ShouldReturnFalse_WhenApiKeyIsEmpty()
    {
        // Arrange
        var handler = new HeaderCheckHandler();
        var context = new DefaultHttpContext();
        var validationContext = new ApiKeyValidationContext();

        // Act
        var result = await handler.HandleAsync(context, string.Empty, validationContext);

        // Assert
        result.Should().BeFalse();
        validationContext.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        validationContext.ErrorMessage.Should().Be("API Key is missing. Please provide it in the 'X-API-Key' header.");
    }

    [Fact]
    public async Task HeaderCheckHandler_ShouldCallNext_WhenApiKeyIsProvided()
    {
        // Arrange
        var handler = new HeaderCheckHandler();
        var nextHandler = new FakeSuccessHandler();
        handler.SetNext(nextHandler);
        
        var context = new DefaultHttpContext();
        var validationContext = new ApiKeyValidationContext();

        // Act
        var result = await handler.HandleAsync(context, "some_key", validationContext);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task FormatCheckHandler_ShouldReturnFalse_WhenFormatIsInvalid()
    {
        // Arrange
        var handler = new FormatCheckHandler();
        var context = new DefaultHttpContext();
        var validationContext = new ApiKeyValidationContext();

        // Act
        var result = await handler.HandleAsync(context, "invalid_format_key", validationContext);

        // Assert
        result.Should().BeFalse();
        validationContext.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        validationContext.ErrorMessage.Should().Be("API Key format is invalid. It should start with 'ele_live_' followed by 32 characters.");
    }

    [Fact]
    public async Task FormatCheckHandler_ShouldCallNext_WhenFormatIsValid()
    {
        // Arrange
        var handler = new FormatCheckHandler();
        var nextHandler = new FakeSuccessHandler();
        handler.SetNext(nextHandler);
        
        var context = new DefaultHttpContext();
        var validationContext = new ApiKeyValidationContext();

        // Act - key must be exactly 41 chars long starting with ele_live_
        var result = await handler.HandleAsync(context, "ele_live_12345678901234567890123456789012", validationContext);

        // Assert
        result.Should().BeTrue();
    }

    // A fake handler that just returns true to test the chain
    private class FakeSuccessHandler : ApiKeyValidationHandler
    {
        public override Task<bool> HandleAsync(HttpContext context, string apiKey, ApiKeyValidationContext validationContext)
        {
            return Task.FromResult(true);
        }
    }
}
