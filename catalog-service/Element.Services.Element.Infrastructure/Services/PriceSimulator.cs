using Element.Services.Element.Infrastructure.Persistence;
using Element.Shared.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Element.Services.Element.Infrastructure.Services;

/// <summary>
/// Background job that keeps the simulated market alive: every few seconds it moves each
/// element's price by a small random amount, records history and publishes the new price.
/// </summary>
public class PriceSimulator : BackgroundService
{
    private static readonly TimeSpan TickInterval = TimeSpan.FromSeconds(15);

    // Readers need at most 24h (board/ticker) or the last N points; 2 days keeps margin at ~1.4M rows.
    private static readonly TimeSpan HistoryRetention = TimeSpan.FromDays(2);
    private static readonly TimeSpan PruneInterval = TimeSpan.FromHours(1);

    // ±0.4% jitter so house trades stay visible; do not disable
    private const double MaxJitterPercent = 0.4;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PriceSimulator> _logger;
    private readonly Random _random = new();
    private DateTime _lastPruneUtc = DateTime.MinValue;

    public PriceSimulator(IServiceScopeFactory scopeFactory, ILogger<PriceSimulator> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    /// <summary>Runs one price tick per interval until the host stops; a failed tick is logged and the loop continues.</summary>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Price Simulator Background Service is starting...");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TickInterval, stoppingToken);
                await SimulatePriceChangesAsync(stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogError(ex, "Error occurred executing price simulation.");
            }
        }
    }

    private async Task SimulatePriceChangesAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ElementDbContext>();
        // Bus outbox: Publish only adds OutboxMessage rows to this DbContext; they commit with the prices
        // and MassTransit's delivery service sends them afterwards. Nothing reaches RabbitMQ on rollback.
        var publishEndpoint = scope.ServiceProvider.GetRequiredService<IPublishEndpoint>();

        // One transaction per tick; rows locked in Id order so a concurrent order/sale nudge waits instead of being overwritten.
        await using var transaction = await context.Database.BeginTransactionAsync(stoppingToken);
        var elements = await context.LockAllElementsAsync(stoppingToken);

        foreach (var element in elements)
        {
            var percentageChange = NextRandomChange();
            var oldPrice = element.PricePerGram;
            var point = element.Tick(percentageChange, DateTime.UtcNow);
            if (point is null)
            {
                continue;
            }

            context.PriceHistories.Add(point);

            // Debug: 118 lines per 15 s tick would flood (and rotate away) the container log.
            _logger.LogDebug("Market change: {Name} ({Symbol}) price changed from ${Old} to ${New} ({Change:P2})",
                element.Name, element.Symbol, oldPrice, point.Price, percentageChange);

            // Lets order-service and other listeners see the live price without polling.
            await publishEndpoint.Publish(new ElementPriceChangedIntegrationEvent(
                ElementSymbol: element.Symbol,
                NewPrice: point.Price,
                ChangedAt: point.Timestamp
            ), stoppingToken);
        }

        await context.SaveChangesAsync(stoppingToken);
        await transaction.CommitAsync(stoppingToken);

        await PruneOldHistoryIfDueAsync(context, stoppingToken);
    }

    /// <summary>At most once per <see cref="PruneInterval"/>, deletes price history older than <see cref="HistoryRetention"/>.</summary>
    private async Task PruneOldHistoryIfDueAsync(ElementDbContext context, CancellationToken stoppingToken)
    {
        if (DateTime.UtcNow - _lastPruneUtc <= PruneInterval)
        {
            return;
        }

        var cutoff = DateTime.UtcNow - HistoryRetention;
        var pruned = await context.PriceHistories
            .Where(history => history.Timestamp < cutoff)
            .ExecuteDeleteAsync(stoppingToken);
        _lastPruneUtc = DateTime.UtcNow;
        _logger.LogInformation("Pruned {Count} price history rows older than {Cutoff:o}.", pruned, cutoff);
    }

    /// <summary>Random change as a fraction, uniformly between -0.4% and +0.4%.</summary>
    private decimal NextRandomChange()
    {
        var percent = _random.NextDouble() * (2 * MaxJitterPercent) - MaxJitterPercent;
        return (decimal)percent / 100m;
    }
}
