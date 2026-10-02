using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Element.Services.IntegrationTests.Infrastructure;
using Element.Shared.Events;
using Npgsql;

namespace Element.Services.IntegrationTests;

/// <summary>
/// The real Java wallet-service in a container: welcome grant, once-per-order debit and desk-sell
/// limits. The order saga is not running, so the test publishes its PaymentRequestedEvent itself.
/// </summary>
[Trait("Category", "Integration")]
public class WalletServiceIntegrationTests : IClassFixture<WalletServiceContainers>
{
    private const decimal DebitAmount = 10;
    private static readonly TimeSpan DeliveryTimeout = TimeSpan.FromSeconds(30);

    private readonly WalletServiceContainers _wallet;

    public WalletServiceIntegrationTests(WalletServiceContainers wallet)
    {
        _wallet = wallet;
    }

    [Fact]
    public async Task WalletDebit_IsIdempotent_AndSellRejectsOverHolding()
    {
        var userId = Guid.NewGuid();
        using var client = _wallet.CreateClient(userId);

        // The first wallet read creates the account with the welcome grant.
        Assert.Equal(WalletServiceContainers.WelcomeGrant, await GetBalanceAsync(client));

        // The same payment request delivered twice (a saga retry gets a new message id) must only charge once.
        var orderId = Guid.NewGuid();
        var payment = new { orderId, customerId = userId, amount = DebitAmount, elementSymbol = "AU", quantity = 1 };
        await SagaEventPublisher.PublishAsync(_wallet.Infrastructure, nameof(PaymentRequestedEvent), payment);
        await SagaEventPublisher.PublishAsync(_wallet.Infrastructure, nameof(PaymentRequestedEvent), payment);
        await WaitForProcessedDeliveriesAsync(orderId, expected: 2);
        Assert.Equal(WalletServiceContainers.WelcomeGrant - DebitAmount, await GetBalanceAsync(client));

        // The user holds no gold, so selling 50 g must be rejected for that reason (the stub catalog supplies the bid).
        var sell = await client.PostAsJsonAsync("/api/v1/desk/sell", new { symbol = "Au", grams = 50 });
        Assert.Equal(HttpStatusCode.BadRequest, sell.StatusCode);
        var error = await sell.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("no_holding", error.GetProperty("reason").GetString());
    }

    private static async Task<decimal> GetBalanceAsync(HttpClient client)
    {
        var wallet = await client.GetFromJsonAsync<JsonElement>("/api/v1/me/wallet");
        return wallet.GetProperty("balanceElx").GetDecimal();
    }

    /// <summary>
    /// Waits until wallet-service has handled <paramref name="expected"/> deliveries for the order.
    /// Each delivery is marked in processed_messages in the same transaction as its ledger work.
    /// </summary>
    private async Task WaitForProcessedDeliveriesAsync(Guid orderId, int expected)
    {
        await using var connection = new NpgsqlConnection(
            IntegrationTestSettings.BuildPostgresConnection(_wallet.Infrastructure, "element_wallet_db"));
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "SELECT count(*) FROM processed_messages WHERE order_id = @id", connection);
        command.Parameters.AddWithValue("id", orderId);

        var deadline = DateTime.UtcNow.Add(DeliveryTimeout);
        long processed = 0;
        while (DateTime.UtcNow < deadline)
        {
            processed = (long)(await command.ExecuteScalarAsync())!;
            if (processed >= expected)
                return;
            await Task.Delay(TimeSpan.FromMilliseconds(500));
        }

        Assert.Fail($"wallet-service handled {processed} of {expected} PaymentRequestedEvent deliveries in time.");
    }
}
