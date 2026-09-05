using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace Element.Services.IntegrationTests.Infrastructure;

/// <summary>Expose a TestServer client to the separate Node process over loopback.</summary>
public sealed class TestHttpBridge : IAsyncDisposable
{
    private readonly WebApplication _app;
    public string BaseUrl => _app.Urls.Single();

    private TestHttpBridge(WebApplication app) => _app = app;

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
