using System.Net.Http.Json;
using System.Text.Json;
using Element.Services.Element.API.Controllers;
using Element.Services.IntegrationTests.Infrastructure;
using Element.Services.Shipment.API;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Element.Services.IntegrationTests;

/// <summary>
/// Real Node, catalog and shipment services; payment events are supplied by the test.
/// The Java worker and wallet debit are covered by deploy/scripts/test-e2e.mjs.
/// </summary>
[Trait("Category", "Integration")]
[Collection("SagaFlow")]
public class SagaFlowIntegrationTests : IClassFixture<IntegrationTestContainers>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly IntegrationTestContainers _containers;

    static SagaFlowIntegrationTests()
    {
        AppContext.SetSwitch("System.Net.Http.SocketsHttpHandler.Http2UnencryptedSupport", true);
    }

    public SagaFlowIntegrationTests(IntegrationTestContainers containers)
    {
        _containers = containers;
    }

    [Fact]
    public async Task CreateOrder_CompletesSaga_WhenStockAndPaymentSucceed()
    {
        await using var elementApp = CreateElementFactory();
        var elementClient = elementApp.CreateClient();
        await using var elementBridge = await TestHttpBridge.StartAsync(elementClient);

        (await elementClient.GetAsync("/api/v1/elements/Au")).EnsureSuccessStatusCode();

        await using var shipmentApp = CreateShipmentFactory();
        using var shipmentClient = shipmentApp.CreateClient();
        await using var orderHost = new OrderNodeTestHost();
        await orderHost.StartAsync(_containers, elementBridge.BaseUrl);

        var orderClient = orderHost.CreateClient();
        var customerId = Guid.NewGuid();
        orderClient.DefaultRequestHeaders.Add("X-User-Id", customerId.ToString());

        var createResponse = await orderClient.PostAsJsonAsync("/api/v1/orders",
            new CreateOrderRequest("Au", 1));
        if (!createResponse.IsSuccessStatusCode)
        {
            var errorBody = await createResponse.Content.ReadAsStringAsync();
            Assert.Fail($"Create order failed: {(int)createResponse.StatusCode} {errorBody}");
        }

        var created = await createResponse.Content.ReadFromJsonAsync<OrderApiResponse>(JsonOptions);
        Assert.NotNull(created);

        var finalStatus = await PollAndAdvanceSagaAsync(orderClient, created!.Id, TimeSpan.FromSeconds(90));
        var sagaState = await GetSagaStateAsync(created.Id);
        Assert.True(finalStatus == "Completed",
            $"Expected Completed but order status was '{finalStatus}' and saga state was '{sagaState ?? "missing"}'.");
    }

    private async Task<string> PollAndAdvanceSagaAsync(
        HttpClient orderClient,
        Guid orderId,
        TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow.Add(timeout);
        var status = "Submitted";

        while (DateTime.UtcNow < deadline)
        {
            var response = await orderClient.GetAsync($"/api/v1/orders/{orderId}");
            response.EnsureSuccessStatusCode();
            var order = await response.Content.ReadFromJsonAsync<OrderApiResponse>(JsonOptions);
            status = order!.Status;

            if (status is "Completed" or "Failed")
                return status;

            await TryAdvanceSagaAsync(orderId, status);
            await Task.Delay(TimeSpan.FromSeconds(2));
        }

        return status;
    }

    private async Task TryAdvanceSagaAsync(Guid orderId, string status)
    {
        switch (status)
        {
            case "StockReserved":
                await SagaEventPublisher.PublishPaymentProcessedAsync(_containers, orderId);
                break;
        }
    }

    private async Task<string?> GetSagaStateAsync(Guid orderId)
    {
        await using var conn = new Npgsql.NpgsqlConnection(
            IntegrationTestSettings.BuildPostgresConnection(_containers, "element_order_db"));
        await conn.OpenAsync();
        await using var cmd = new Npgsql.NpgsqlCommand(
            "SELECT current_state FROM saga_state WHERE order_id = @id", conn);
        cmd.Parameters.AddWithValue("id", orderId);
        var result = await cmd.ExecuteScalarAsync();
        return result as string;
    }

    private WebApplicationFactory<ElementsController> CreateElementFactory() =>
        new WebApplicationFactory<ElementsController>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseSetting("ConnectionStrings:DefaultConnection",
                    IntegrationTestSettings.BuildPostgresConnection(_containers, "element_market_db"));
                builder.UseSetting("RedisConnection", _containers.RedisConnection);
                builder.UseSetting("PriceSimulator:Enabled", "false");
                IntegrationTestSettings.RabbitMqSettings(_containers)(builder);
            });

    private WebApplicationFactory<ShipmentApiMarker> CreateShipmentFactory() =>
        new WebApplicationFactory<ShipmentApiMarker>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseSetting("ConnectionStrings:DefaultConnection",
                    IntegrationTestSettings.BuildPostgresConnection(_containers, "element_shipment_db"));
                IntegrationTestSettings.RabbitMqSettings(_containers)(builder);
            });
}

[CollectionDefinition("SagaFlow", DisableParallelization = true)]
public class SagaFlowCollection;
