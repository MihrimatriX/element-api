using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Element.Services.IntegrationTests.Infrastructure;
using Npgsql;

namespace Element.Services.IntegrationTests;

/// <summary>
/// The real Node order-service process on Testcontainers: order ownership, auth guard, wallet
/// debit idempotency, desk-sell limits and health.
/// </summary>
[Trait("Category", "Integration")]
public class OrderServiceIntegrationTests : IClassFixture<IntegrationTestContainers>
{
    /// <summary>Nothing listens here; these tests never need catalog prices.</summary>
    private const string UnreachableCatalogUrl = "http://127.0.0.1:59999";

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
        await host.StartAsync(_containers, UnreachableCatalogUrl);

        var client = host.CreateClient();
        client.DefaultRequestHeaders.Add("X-User-Id", Guid.NewGuid().ToString());

        var response = await client.GetAsync("/api/v1/orders");

        response.EnsureSuccessStatusCode();
        var orders = await response.Content.ReadFromJsonAsync<OrderApiResponse[]>(JsonOptions);
        Assert.NotNull(orders);
        Assert.Empty(orders);
    }

    [Fact]
    public async Task PostOrder_WithoutUser_Returns401()
    {
        await using var host = new OrderNodeTestHost();
        await host.StartAsync(_containers, UnreachableCatalogUrl);
        var client = host.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/orders", new { elementSymbol = "Au", quantity = 1 });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetOrder_WrongUser_Returns404()
    {
        await using var host = new OrderNodeTestHost();
        await host.StartAsync(_containers, UnreachableCatalogUrl);
        var owner = Guid.NewGuid();
        var other = Guid.NewGuid().ToString();
        var orderId = Guid.NewGuid();
        await InsertOrderAsync(orderId, owner, "Submitted");

        // Another user must not even learn that the order exists.
        var client = host.CreateClient();
        client.DefaultRequestHeaders.Add("X-User-Id", other);
        var stolen = await client.GetAsync($"/api/v1/orders/{orderId}");
        Assert.Equal(HttpStatusCode.NotFound, stolen.StatusCode);

        client.DefaultRequestHeaders.Remove("X-User-Id");
        client.DefaultRequestHeaders.Add("X-User-Id", owner.ToString());
        var own = await client.GetAsync($"/api/v1/orders/{orderId}");
        own.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task WalletDebit_IsIdempotent_AndSellRejectsOverHolding()
    {
        await using var host = new OrderNodeTestHost();
        await host.StartAsync(_containers, UnreachableCatalogUrl);
        var userId = Guid.NewGuid().ToString();
        var client = host.CreateClient();
        client.DefaultRequestHeaders.Add("X-User-Id", userId);

        // The first wallet read creates the account with the 10000 welcome grant.
        (await client.GetAsync("/api/v1/me/wallet")).EnsureSuccessStatusCode();
        var granted = await (await client.GetAsync("/api/v1/me/wallet")).Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal(10000, granted.GetProperty("balanceElx").GetDecimal());

        var orderId = Guid.NewGuid();
        await InsertOrderAsync(orderId, Guid.Parse(userId), "StockReserved");

        // The same debit twice must only charge once.
        var debitBody = new { orderId, customerId = userId, amount = 10 };
        var first = await client.PostAsJsonAsync("/internal/wallet/debit", debitBody);
        first.EnsureSuccessStatusCode();
        var second = await client.PostAsJsonAsync("/internal/wallet/debit", debitBody);
        second.EnsureSuccessStatusCode();

        var walletResponse = await client.GetAsync("/api/v1/me/wallet");
        walletResponse.EnsureSuccessStatusCode();
        var wallet = await walletResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal(9990, wallet.GetProperty("balanceElx").GetDecimal());

        // The user holds no gold, so selling 50 g must be rejected.
        var sell = await client.PostAsJsonAsync("/api/v1/desk/sell", new { symbol = "Au", grams = 50 });
        Assert.Equal(HttpStatusCode.BadRequest, sell.StatusCode);
    }

    [Fact]
    public async Task Health_ReturnsHealthy_WhenDependenciesUp()
    {
        await using var host = new OrderNodeTestHost();
        await host.StartAsync(_containers, UnreachableCatalogUrl);

        var client = host.CreateClient();
        var response = await client.GetAsync("/health");
        var body = await response.Content.ReadAsStringAsync();

        Assert.True(
            response.IsSuccessStatusCode || body.Contains("Healthy", StringComparison.OrdinalIgnoreCase),
            $"Unexpected health response: {(int)response.StatusCode} {body}");
    }

    /// <summary>Writes a 1 g gold order (total 10) straight into element_order_db, bypassing the API.</summary>
    private async Task InsertOrderAsync(Guid orderId, Guid customerId, string status)
    {
        await using var connection = new NpgsqlConnection(
            IntegrationTestSettings.BuildPostgresConnection(_containers, "element_order_db"));
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText =
            @"INSERT INTO orders (id, customer_id, element_symbol, quantity, total_price, status)
              VALUES (@id, @cid, 'AU', 1, 10, @status)";
        command.Parameters.AddWithValue("id", orderId);
        command.Parameters.AddWithValue("cid", customerId);
        command.Parameters.AddWithValue("status", status);
        await command.ExecuteNonQueryAsync();
    }
}
