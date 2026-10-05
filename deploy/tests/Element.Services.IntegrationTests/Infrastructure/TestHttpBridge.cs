using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace Element.Services.IntegrationTests.Infrastructure;

/// <summary>
/// Exposes an in-memory TestServer client on a real loopback port, so the separate Node
/// order-service process can call a .NET service that only exists inside the test.
/// Only GET is forwarded (status, content type and body).
/// </summary>
public sealed class TestHttpBridge : IAsyncDisposable
{
    private readonly WebApplication _app;

    /// <summary>The loopback URL the bridge listens on (random free port).</summary>
    public string BaseUrl => _app.Urls.Single();

    private TestHttpBridge(WebApplication app) => _app = app;

    /// <summary>Starts a minimal web app that forwards every incoming GET to <paramref name="client"/>.</summary>
    public static async Task<TestHttpBridge> StartAsync(HttpClient client)
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        var app = builder.Build();
        app.Run(async context =>
        {
            using var response = await client.GetAsync(
                context.Request.Path + context.Request.QueryString, context.RequestAborted);
            context.Response.StatusCode = (int)response.StatusCode;
            context.Response.ContentType = response.Content.Headers.ContentType?.ToString();
            await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
        });
        await app.StartAsync();
        return new TestHttpBridge(app);
    }

    public async ValueTask DisposeAsync() => await _app.DisposeAsync();
}
