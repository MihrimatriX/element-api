using Element.Shared.Middleware;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Element.Services.UnitTests.Shared;

/// <summary>The last-resort handler answers real failures with a 500 and stays quiet when the client simply left.</summary>
public class ExceptionHandlingMiddlewareTests
{
    private static ExceptionHandlingMiddleware MiddlewareThatThrows(Exception exception) =>
        new(_ => throw exception, NullLogger<ExceptionHandlingMiddleware>.Instance, Mock.Of<IHostEnvironment>());

    [Fact]
    public async Task ClientThatHungUp_IsNotReportedAsAServerError()
    {
        using var aborted = new CancellationTokenSource();
        await aborted.CancelAsync();
        var context = new DefaultHttpContext { RequestAborted = aborted.Token };

        await MiddlewareThatThrows(new OperationCanceledException(aborted.Token)).InvokeAsync(context);

        context.Response.StatusCode.Should().Be(StatusCodes.Status499ClientClosedRequest);
    }

    [Fact]
    public async Task RealFailure_StillAnswers500()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await MiddlewareThatThrows(new InvalidOperationException("boom")).InvokeAsync(context);

        context.Response.StatusCode.Should().Be(StatusCodes.Status500InternalServerError);
    }
}
