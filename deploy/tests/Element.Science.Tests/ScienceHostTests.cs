using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Element.Science.Tests;

/// <summary>
/// Hosts science-service in memory with the real JSON snapshots and a throwaway web root (index.html, a hashed asset,
/// a media file) and pins its wire contract: JSON 404s for API misses, SPA fallback, cache policy, security headers,
/// public CORS, the coverage document and the per-IP limit that applies to /api only.
/// </summary>
public sealed class ScienceHostTests : IClassFixture<ScienceHostTests.ScienceFactory>
{
    private readonly ScienceFactory _factory;

    public ScienceHostTests(ScienceFactory factory) => _factory = factory;

    [Fact]
    public async Task Api_miss_is_a_json_404_and_never_the_spa()
    {
        var response = await _factory.CreateClient().GetAsync("/api/v9/unknown");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/problem+json");
        (await response.Content.ReadAsStringAsync()).Should().NotContain("<html");
    }

    [Fact]
    public async Task Spa_route_falls_back_to_index_html_that_must_revalidate()
    {
        var response = await _factory.CreateClient().GetAsync("/atlas/fe");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await response.Content.ReadAsStringAsync()).Should().Contain("science-test-index");
        response.Headers.CacheControl!.ToString().Should().Be("no-cache");
    }

    [Theory]
    [InlineData("/assets/app-abc123.js", "public, max-age=31536000, immutable")]
    [InlineData("/media/atom.svg", "public, max-age=604800")]
    [InlineData("/index.html", "no-cache")]
    public async Task Static_files_get_the_same_cache_policy_as_nginx(string path, string cacheControl)
    {
        var response = await _factory.CreateClient().GetAsync(path);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.CacheControl!.ToString().Should().Be(cacheControl);
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/api/v2/coverage")]
    [InlineData("/index.html")]
    public async Task Every_response_carries_the_security_headers(string path)
    {
        var response = await _factory.CreateClient().GetAsync(path);

        response.Headers.GetValues("X-Content-Type-Options").Should().Equal("nosniff");
        response.Headers.GetValues("Referrer-Policy").Should().Equal("no-referrer");
    }

    [Fact]
    public async Task Coverage_describes_the_loaded_snapshots()
    {
        var response = await _factory.CreateClient().GetAsync("/api/v2/coverage");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.CacheControl!.ToString().Should().Be("public, max-age=3600");
        using var coverage = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = coverage.RootElement;
        root.GetProperty("schemaVersion").GetString().Should().Be("2.0");
        root.GetProperty("elements").GetInt32().Should().Be(118);
        root.GetProperty("compounds").GetInt32().Should().BePositive();
        root.GetProperty("retrievedAt").GetString().Should().NotBeNullOrWhiteSpace();
        root.GetProperty("unavailableElementSections").ValueKind.Should().Be(JsonValueKind.Array);
        root.GetProperty("nullMeaning").GetString().Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Scientific_catalog_is_public_read_only_with_etag()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/v2/elements/fe");
        request.Headers.Add("Origin", "https://any-site.example");

        var response = await _factory.CreateClient().SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.ETag.Should().NotBeNull();
        response.Headers.GetValues("Access-Control-Allow-Origin").Should().Equal("*");
        response.Headers.GetValues("Access-Control-Expose-Headers").Should().Contain(value => value.Contains("ETag"));
        using var element = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        element.RootElement.GetProperty("symbol").GetString().Should().Be("Fe");
    }

    [Fact]
    public async Task Only_api_requests_are_rate_limited_per_client()
    {
        // Own host: the limiter state must not leak into the other tests.
        await using var factory = new ScienceFactory();
        var client = factory.CreateClient();

        for (var i = 0; i < 300; i++)
        {
            (await client.GetAsync("/api/v2/coverage")).StatusCode.Should().Be(HttpStatusCode.OK);
        }

        (await client.GetAsync("/api/v2/coverage")).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        (await client.GetAsync("/index.html")).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    /// <summary>Science host with a small generated web root, so static-file rules can be checked without a web-app build.</summary>
    public sealed class ScienceFactory : WebApplicationFactory<Program>
    {
        private readonly string _webRoot = Path.Combine(Path.GetTempPath(), "element-science-tests-" + Guid.NewGuid().ToString("N"));

        public ScienceFactory()
        {
            Directory.CreateDirectory(Path.Combine(_webRoot, "assets"));
            Directory.CreateDirectory(Path.Combine(_webRoot, "media"));
            File.WriteAllText(Path.Combine(_webRoot, "index.html"), "<!doctype html><title>science-test-index</title>");
            File.WriteAllText(Path.Combine(_webRoot, "assets", "app-abc123.js"), "console.log('x');");
            File.WriteAllText(Path.Combine(_webRoot, "media", "atom.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"/>");
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.UseWebRoot(_webRoot);

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            try
            {
                Directory.Delete(_webRoot, recursive: true);
            }
            catch (IOException)
            {
                // Best effort; the OS temp folder is cleaned eventually.
            }
        }
    }
}
