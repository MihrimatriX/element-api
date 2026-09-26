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
    public async Task PostOrder_WithoutUser_Returns401()
    {
        await using var host = new OrderNodeTestHost();
        await host.StartAsync(_containers, "http://127.0.0.1:59999");
        var client = host.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/orders", new { elementSymbol = "Au", quantity = 1 });
        Assert.Equal(System.Net.HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetOrder_WrongUser_Returns404()
    {
        await using var host = new OrderNodeTestHost();
        await host.StartAsync(_containers, "http://127.0.0.1:59999");
        var owner = Guid.NewGuid();
        var other = Guid.NewGuid().ToString();
        var orderId = Guid.NewGuid();

        await using var insert = new Npgsql.NpgsqlConnection(
            new Npgsql.NpgsqlConnectionStringBuilder(_containers.Postgres.GetConnectionString())
            {
                Database = "element_order_db"
            }.ConnectionString);
        await insert.OpenAsync();
        await using (var cmd = insert.CreateCommand())
        {
            cmd.CommandText =
                @"INSERT INTO orders (id, customer_id, element_symbol, quantity, total_price, status)
                  VALUES (@id, @cid, 'AU', 1, 10, 'Submitted')";
            cmd.Parameters.AddWithValue("id", orderId);
            cmd.Parameters.AddWithValue("cid", owner);
            await cmd.ExecuteNonQueryAsync();
        }

        var client = host.CreateClient();
        client.DefaultRequestHeaders.Add("X-User-Id", other);
        var stolen = await client.GetAsync($"/api/v1/orders/{orderId}");
        Assert.Equal(System.Net.HttpStatusCode.NotFound, stolen.StatusCode);

        client.DefaultRequestHeaders.Remove("X-User-Id");
        client.DefaultRequestHeaders.Add("X-User-Id", owner.ToString());
        var own = await client.GetAsync($"/api/v1/orders/{orderId}");
        own.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task WalletDebit_IsIdempotent_AndSellRejectsOverHolding()
    {
        await using var host = new OrderNodeTestHost();
        await host.StartAsync(_containers, "http://127.0.0.1:59999");
        var userId = Guid.NewGuid().ToString();
        var client = host.CreateClient();
        client.DefaultRequestHeaders.Add("X-User-Id", userId);

        (await client.GetAsync("/api/v1/me/wallet")).EnsureSuccessStatusCode();
        var granted = await (await client.GetAsync("/api/v1/me/wallet")).Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal(10000, granted.GetProperty("balanceElx").GetDecimal());

        var orderId = Guid.NewGuid();
        await using var insert = new Npgsql.NpgsqlConnection(
            new Npgsql.NpgsqlConnectionStringBuilder(_containers.Postgres.GetConnectionString())
            {
                Database = "element_order_db"
            }.ConnectionString);
        await insert.OpenAsync();
        await using (var cmd = insert.CreateCommand())
        {
            cmd.CommandText =
                @"INSERT INTO orders (id, customer_id, element_symbol, quantity, total_price, status)
                  VALUES (@id, @cid, 'AU', 1, 10, 'StockReserved')";
            cmd.Parameters.AddWithValue("id", orderId);
            cmd.Parameters.AddWithValue("cid", Guid.Parse(userId));
            await cmd.ExecuteNonQueryAsync();
        }

        var debitBody = new { orderId, customerId = userId, amount = 10 };
        var first = await client.PostAsJsonAsync("/internal/wallet/debit", debitBody);
        first.EnsureSuccessStatusCode();
        var second = await client.PostAsJsonAsync("/internal/wallet/debit", debitBody);
        second.EnsureSuccessStatusCode();

        var walletRes = await client.GetAsync("/api/v1/me/wallet");
        walletRes.EnsureSuccessStatusCode();
        var wallet = await walletRes.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal(9990, wallet.GetProperty("balanceElx").GetDecimal());

        var sell = await client.PostAsJsonAsync("/api/v1/desk/sell", new { symbol = "Au", grams = 50 });
        Assert.Equal(System.Net.HttpStatusCode.BadRequest, sell.StatusCode);
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
