using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using Npgsql;

namespace Element.Services.IntegrationTests.Infrastructure;

/// <summary>
/// Runs the Node.js order-service against integration Testcontainers.
/// Requires <c>npm run build</c> in <c>order-service/</c> before tests run.
/// </summary>
public sealed class OrderNodeTestHost : IAsyncDisposable
{
    private Process? _process;
    public string BaseUrl { get; private set; } = "";

    public async Task StartAsync(IntegrationTestContainers containers, string catalogBaseUrl)
    {
        var repoRoot = FindRepoRoot();
        var serviceDir = Path.Combine(repoRoot, "order-service");
        var entry = Path.Combine(serviceDir, "dist", "index.js");
        if (!File.Exists(entry))
            throw new InvalidOperationException(
                $"order-service not built. Run: cd order-service && npm ci && npm run build. Missing: {entry}");

        var port = GetFreePort();
        var db = new NpgsqlConnectionStringBuilder(containers.Postgres.GetConnectionString())
        {
            Database = "element_order_db"
        };

        var psi = new ProcessStartInfo
        {
            FileName = "node",
            Arguments = $"\"{entry}\"",
            WorkingDirectory = serviceDir,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        psi.Environment["PORT"] = port.ToString();
        psi.Environment["DATABASE_URL"] = db.ConnectionString;
        psi.Environment["REDIS_URL"] = containers.RedisConnection;
        psi.Environment["RABBITMQ_HOST"] = containers.RabbitHost;
        psi.Environment["RABBITMQ_PORT"] = containers.RabbitPort.ToString();
        psi.Environment["RABBITMQ_USERNAME"] = "guest";
        psi.Environment["RABBITMQ_PASSWORD"] = "guest";
        psi.Environment["CATALOG_SERVICE_URL"] = catalogBaseUrl.TrimEnd('/');

        _process = Process.Start(psi)
            ?? throw new InvalidOperationException("Failed to start order-service node process.");

        BaseUrl = $"http://127.0.0.1:{port}";
        await WaitForHealthyAsync();
    }

    public HttpClient CreateClient()
    {
        if (string.IsNullOrEmpty(BaseUrl))
            throw new InvalidOperationException("OrderNodeTestHost not started.");
        return new HttpClient { BaseAddress = new Uri(BaseUrl + "/") };
    }

    private async Task WaitForHealthyAsync()
    {
        using var client = CreateClient();
        var deadline = DateTime.UtcNow.AddSeconds(30);
        while (DateTime.UtcNow < deadline)
        {
            try
            {
                var res = await client.GetAsync("/health");
                if (res.IsSuccessStatusCode)
                    return;
            }
            catch
            {
                /* retry */
            }

            if (_process?.HasExited == true)
            {
                var err = await _process.StandardError.ReadToEndAsync();
                throw new InvalidOperationException($"order-service exited early: {err}");
            }

            await Task.Delay(500);
        }

        throw new TimeoutException("order-service did not become healthy in time.");
    }

    private static int GetFreePort()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }

    private static string FindRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "order-service")))
                return dir.FullName;
            dir = dir.Parent;
        }

        throw new InvalidOperationException("Could not locate repository root (order-service folder).");
    }

    public async ValueTask DisposeAsync()
    {
        if (_process is { HasExited: false })
        {
            _process.Kill(entireProcessTree: true);
            await _process.WaitForExitAsync();
        }

        _process?.Dispose();
    }
}
