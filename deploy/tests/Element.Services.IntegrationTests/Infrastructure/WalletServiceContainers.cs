using System.Globalization;
using System.Text;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using DotNet.Testcontainers.Images;

namespace Element.Services.IntegrationTests.Infrastructure;

/// <summary>
/// xUnit class fixture that runs the real Java wallet-service in a container, built from
/// wallet-service/Dockerfile, next to the shared Postgres and RabbitMQ containers. A stub catalog
/// quotes a fixed bid so desk sell can price a sale without the real catalog-service.
/// </summary>
public sealed class WalletServiceContainers : IAsyncLifetime
{
    /// <summary>KREDI a new wallet receives (passed to the service as WALLET_WELCOME_GRANT).</summary>
    public const decimal WelcomeGrant = 10000;

    private const string InternalApiKey = "test-internal-key";
    private const ushort ServicePort = 8080;
    private const string CatalogAlias = "catalog-service";
    private static readonly TimeSpan StartupTimeout = TimeSpan.FromMinutes(2);

    /// <summary>Answers every request (the ticker included) with a JSON bid of 100 KREDI per gram.</summary>
    private const string CatalogStubConfig =
        """server { listen 80; default_type application/json; return 200 '{"bid":100}'; }""";

    /// <summary>
    /// Fixed tag that outlives the run, so Docker's layer cache makes the next build quick.
    /// Not "element-wallet-service", which is the image the local compose stack runs.
    /// </summary>
    private readonly IFutureDockerImage _walletImage = new ImageFromDockerfileBuilder()
        .WithDockerfileDirectory(Path.Combine(OrderNodeTestHost.FindRepoRoot(), "wallet-service"))
        .WithName("element-wallet-service-it")
        .WithDeleteIfExists(false)
        .WithCleanUp(false)
        .Build();

    private readonly IContainer _catalogStub;
    private readonly IContainer _wallet;

    public WalletServiceContainers()
    {
        _catalogStub = new ContainerBuilder("nginx:stable-alpine")
            .WithNetwork(Infrastructure.Network)
            .WithNetworkAliases(CatalogAlias)
            .WithResourceMapping(Encoding.UTF8.GetBytes(CatalogStubConfig), "/etc/nginx/conf.d/default.conf")
            .Build();

        _wallet = new ContainerBuilder(_walletImage)
            .WithNetwork(Infrastructure.Network)
            .WithEnvironment("SPRING_DATASOURCE_URL",
                $"jdbc:postgresql://{IntegrationTestContainers.PostgresAlias}:5432/element_wallet_db")
            .WithEnvironment("SPRING_DATASOURCE_USERNAME", "postgres")
            .WithEnvironment("SPRING_DATASOURCE_PASSWORD", "postgres")
            .WithEnvironment("RABBITMQ_HOST", IntegrationTestContainers.RabbitMqAlias)
            .WithEnvironment("RABBITMQ_PORT", "5672")
            .WithEnvironment("RABBITMQ_USERNAME", "guest")
            .WithEnvironment("RABBITMQ_PASSWORD", "guest")
            .WithEnvironment("CATALOG_SERVICE_URL", $"http://{CatalogAlias}")
            .WithEnvironment("INTERNAL_API_KEY", InternalApiKey)
            .WithEnvironment("WALLET_WELCOME_GRANT", WelcomeGrant.ToString(CultureInfo.InvariantCulture))
            .WithPortBinding(ServicePort, assignRandomHostPort: true)
            // /health answers 200 only once Postgres and RabbitMQ are reachable (queues are declared by then).
            .WithWaitStrategy(Wait.ForUnixContainer().UntilHttpRequestIsSucceeded(
                request => request.ForPort(ServicePort).ForPath("/health"),
                wait => wait.WithTimeout(StartupTimeout)))
            .Build();
    }

    /// <summary>Postgres, Redis and RabbitMQ; the wallet database is created with the other service databases.</summary>
    public IntegrationTestContainers Infrastructure { get; } = new();

    /// <summary>Builds the image while the infrastructure starts, then starts the stub catalog and the wallet.</summary>
    public async Task InitializeAsync()
    {
        await Task.WhenAll(Infrastructure.InitializeAsync(), _walletImage.CreateAsync());
        await _catalogStub.StartAsync();
        await _wallet.StartAsync();
    }

    /// <summary>
    /// HTTP client for wallet-service that sends the internal key and <paramref name="userId"/>
    /// as X-User-Id, the way the gateway forwards a signed-in user.
    /// </summary>
    public HttpClient CreateClient(Guid userId)
    {
        var client = new HttpClient
        {
            BaseAddress = new UriBuilder("http", _wallet.Hostname, _wallet.GetMappedPublicPort(ServicePort)).Uri,
            Timeout = TimeSpan.FromSeconds(15)
        };
        client.DefaultRequestHeaders.Add("INTERNAL_API_KEY", InternalApiKey);
        client.DefaultRequestHeaders.Add("X-User-Id", userId.ToString());
        return client;
    }

    /// <summary>Removes the containers; the image is kept on purpose (see <see cref="_walletImage"/>).</summary>
    public async Task DisposeAsync()
    {
        await _wallet.DisposeAsync();
        await _catalogStub.DisposeAsync();
        await Infrastructure.DisposeAsync();
    }
}
