using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Element.Shared.Middleware;

/// <summary>Last-resort catch: logs any unhandled exception and returns a JSON 500 problem instead of an HTML error page.</summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    /// <summary>Runs the rest of the pipeline; on an exception writes the problem body unless the response has already started.</summary>
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);

            // Headers are already on the wire; we cannot replace the response, so let the server abort it.
            if (context.Response.HasStarted)
                throw;

            // Drop headers set before the throw (e.g. [ResponseCache] Cache-Control): an error must not be cached.
            context.Response.Clear();
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            context.Response.ContentType = "application/json";

            var problem = new
            {
                type = "https://httpstatuses.com/500",
                title = "Internal Server Error",
                status = 500,
                // Exception messages can leak internals, so they are shown only in Development.
                detail = _environment.IsDevelopment() ? ex.Message : "An unexpected error occurred.",
                instance = context.Request.Path.Value,
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(problem));
        }
    }
}

/// <summary>Registration helper for <see cref="ExceptionHandlingMiddleware"/>.</summary>
public static class ExceptionHandlingMiddlewareExtensions
{
    /// <summary>Adds the global JSON exception handler to the pipeline.</summary>
    public static IApplicationBuilder UseGlobalExceptionHandling(this IApplicationBuilder app)
        => app.UseMiddleware<ExceptionHandlingMiddleware>();
}
