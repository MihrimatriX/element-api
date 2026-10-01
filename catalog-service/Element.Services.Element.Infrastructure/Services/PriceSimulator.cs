using System;
using System.Threading;
using System.Threading.Tasks;
using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Persistence;
using Element.Shared.Events;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Element.Services.Element.Infrastructure.Services;

public class PriceSimulator : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PriceSimulator> _logger;
    private readonly Random _random;
    // Readers need at most 24h (board/ticker) or the last N points; 2 days keeps margin at ~1.4M rows.
    private static readonly TimeSpan HistoryRetention = TimeSpan.FromDays(2);
    private DateTime _lastPruneUtc = DateTime.MinValue;

    public PriceSimulator(
        IServiceScopeFactory scopeFactory,
        ILogger<PriceSimulator> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _random = new Random();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Price Simulator Background Service is starting...");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
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
        var publishEndpoint = scope.ServiceProvider.GetRequiredService<IPublishEndpoint>();

        var elements = await context.ChemicalElements.ToListAsync(stoppingToken);

        foreach (var element in elements)
        {
            // ±0.4% jitter so house trades stay visible; do not disable
            var percentageChange = (decimal)(_random.NextDouble() * 0.8 - 0.4) / 100m;
            var priceDifference = element.PricePerGram * percentageChange;
            var oldPrice = element.PricePerGram;
            var newPrice = Math.Round(element.PricePerGram + priceDifference, 4);

            if (newPrice <= 0.0001m) continue; // Prevent zero or negative prices

            element.PricePerGram = newPrice;

            // Add to history
            context.PriceHistories.Add(new ElementPriceHistory
            {
                Id = Guid.NewGuid(),
                ElementSymbol = element.Symbol,
                Price = newPrice,
                Timestamp = DateTime.UtcNow
            });

            // Debug: 118 lines per 15 s tick would flood (and rotate away) the container log.
            _logger.LogDebug("Market change: {Name} ({Symbol}) price changed from ${Old} to ${New} ({Change:P2})",
                element.Name, element.Symbol, oldPrice, newPrice, percentageChange);

            // Publish Integration Event for Order Service or other consumers
            await publishEndpoint.Publish(new ElementPriceChangedIntegrationEvent(
                ElementSymbol: element.Symbol,
                NewPrice: newPrice,
                ChangedAt: DateTime.UtcNow
            ), stoppingToken);
        }

        await context.SaveChangesAsync(stoppingToken);

        if (DateTime.UtcNow - _lastPruneUtc > TimeSpan.FromHours(1))
        {
            var cutoff = DateTime.UtcNow - HistoryRetention;
            var pruned = await context.PriceHistories.Where(h => h.Timestamp < cutoff).ExecuteDeleteAsync(stoppingToken);
            _lastPruneUtc = DateTime.UtcNow;
            _logger.LogInformation("Pruned {Count} price history rows older than {Cutoff:o}.", pruned, cutoff);
        }
    }
}
