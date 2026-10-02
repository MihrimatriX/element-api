using System.Collections.Concurrent;
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
    /// <summary>Internal key shared with the order-service process; sent on every test request.</summary>
    private const string TestInternalApiKey = "test-internal-key";
    /// <summary>Only the last lines of service output are kept, for the "exited early" error message.</summary>
    private const int MaxCapturedOutputLines = 100;
    private static readonly TimeSpan StartupTimeout = TimeSpan.FromSeconds(30);

    private Process? _process;
    private readonly ConcurrentQueue<string> _output = new();

    /// <summary>Loopback URL of the running service; empty until <see cref="StartAsync"/> succeeds.</summary>
    public string BaseUrl { get; private set; } = "";

    /// <summary>
    /// Starts <c>node dist/index.js</c> on a free port, wired to the test containers and to
    /// <paramref name="catalogBaseUrl"/> for prices, and waits until /health answers.
    /// </summary>
    public async Task StartAsync(IntegrationTestContainers containers, string catalogBaseUrl)
    {
        var repoRoot = FindRepoRoot();
        var serviceDir = Path.Combine(repoRoot, "order-service");
        var entry = Path.Combine(serviceDir, "dist", "index.js");
        if (!File.Exists(entry))
            throw new InvalidOperationException(
                $"order-service not built. Run: cd order-service && npm ci && npm run build. Missing: {entry}");

        var port = GetFreePort();
        var database = new NpgsqlConnectionStringBuilder(containers.Postgres.GetConnectionString())
        {
            Database = "element_order_db"
        };

        var startInfo = new ProcessStartInfo
        {
            FileName = "node",
            Arguments = $"\"{entry}\"",
            WorkingDirectory = serviceDir,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };
        var databaseUser = Uri.EscapeDataString(database.Username!);
        var databasePassword = Uri.EscapeDataString(database.Password!);
        startInfo.Environment["PORT"] = port.ToString();
        startInfo.Environment["DATABASE_URL"] = $"postgres://{databaseUser}:{databasePassword}@{database.Host}:{database.Port}/{database.Database}";
        startInfo.Environment["REDIS_URL"] = $"redis://127.0.0.1:{containers.Redis.GetMappedPublicPort(6379)}";
        startInfo.Environment["RABBITMQ_HOST"] = containers.RabbitHost;
        startInfo.Environment["RABBITMQ_PORT"] = containers.RabbitPort.ToString();
        startInfo.Environment["RABBITMQ_USERNAME"] = "guest";
        startInfo.Environment["RABBITMQ_PASSWORD"] = "guest";
        startInfo.Environment["CATALOG_SERVICE_URL"] = catalogBaseUrl.TrimEnd('/');
        startInfo.Environment["INTERNAL_API_KEY"] = TestInternalApiKey;

        _process = Process.Start(startInfo)
            ?? throw new InvalidOperationException("Failed to start order-service node process.");
        _process.OutputDataReceived += CaptureOutput;
        _process.ErrorDataReceived += CaptureOutput;
        _process.BeginOutputReadLine();
        _process.BeginErrorReadLine();

        BaseUrl = $"http://127.0.0.1:{port}";
        await WaitForHealthyAsync();
    }

    /// <summary>HTTP client for the started service, pre-authenticated with the internal API key.</summary>
    public HttpClient CreateClient()
    {
        if (string.IsNullOrEmpty(BaseUrl))
            throw new InvalidOperationException("OrderNodeTestHost not started.");
        var client = new HttpClient { BaseAddress = new Uri(BaseUrl + "/"), Timeout = TimeSpan.FromSeconds(15) };
        client.DefaultRequestHeaders.Add("INTERNAL_API_KEY", TestInternalApiKey);
        return client;
    }

    private void CaptureOutput(object sender, DataReceivedEventArgs args)
    {
        if (args.Data == null) return;
        _output.Enqueue(args.Data);
        while (_output.Count > MaxCapturedOutputLines) _output.TryDequeue(out _);
    }

    private async Task WaitForHealthyAsync()
    {
        using var client = CreateClient();
        var deadline = DateTime.UtcNow.Add(StartupTimeout);
        while (DateTime.UtcNow < deadline)
        {
            try
            {
                var response = await client.GetAsync("/health");
                if (response.IsSuccessStatusCode)
                    return;
            }
            catch
            {
                // Not listening yet; retry.
            }

            if (_process?.HasExited == true)
            {
                var output = string.Join(Environment.NewLine, _output);
                throw new InvalidOperationException($"order-service exited early: {output}");
            }

            await Task.Delay(500);
        }

        throw new TimeoutException("order-service did not become healthy in time.");
    }

    /// <summary>Asks the OS for an unused loopback port (tiny race window, acceptable for tests).</summary>
    private static int GetFreePort()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }

    /// <summary>Walks up from the test binaries until it finds the folder that contains order-service.</summary>
    internal static string FindRepoRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory != null)
        {
            if (Directory.Exists(Path.Combine(directory.FullName, "order-service")))
                return directory.FullName;
            directory = directory.Parent;
        }

        throw new InvalidOperationException("Could not locate repository root (order-service folder).");
    }

    /// <summary>Kills the Node process tree so no service outlives the test.</summary>
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
