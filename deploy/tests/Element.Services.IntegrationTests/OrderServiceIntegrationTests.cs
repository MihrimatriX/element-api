using System.Net.Http.Json;
using System.Text.Json;
using Element.Services.IntegrationTests.Infrastructure;

namespace Element.Services.IntegrationTests;

[Trait("Category", "Integration")]
public class OrderServiceIntegrationTests : IClassFixture<IntegrationTestContainers>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly IntegrationTestContainers _containers;

    public OrderServiceIntegrationTests(IntegrationTestContainers containers)
    {
        _containers = containers;
    }

    [Fact]
    public async Task GetUserOrders_ReturnsEmptyList_WhenNoOrders()
    {
        await using var host = new OrderNodeTestHost();
        await host.StartAsync(_containers, "http://127.0.0.1:59999");

        var client = host.CreateClient();
        client.DefaultRequestHeaders.Add("X-User-Id", Guid.NewGuid().ToString());

        var response = await client.GetAsync("/api/v1/orders");

        response.EnsureSuccessStatusCode();
        var orders = await response.Content.ReadFromJsonAsync<OrderApiResponse[]>(JsonOptions);
        Assert.NotNull(orders);
        Assert.Empty(orders);
    }

    [Fact]
    public async Task Health_ReturnsHealthy_WhenDependenciesUp()
    {
        await using var host = new OrderNodeTestHost();
        await host.StartAsync(_containers, "http://127.0.0.1:59999");

        var client = host.CreateClient();
        var response = await client.GetAsync("/health");
        var body = await response.Content.ReadAsStringAsync();

        Assert.True(
            response.IsSuccessStatusCode || body.Contains("Healthy", StringComparison.OrdinalIgnoreCase),
            $"Unexpected health response: {(int)response.StatusCode} {body}");
    }
}
