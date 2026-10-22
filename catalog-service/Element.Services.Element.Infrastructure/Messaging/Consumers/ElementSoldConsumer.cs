using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Persistence;
using Element.Shared.Events;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace Element.Services.Element.Infrastructure.Messaging.Consumers;

/// <summary>
/// Reacts to a desk sale (a user selling grams back to the house) by nudging the element's
/// last price down. Price nudge only — restock lives in inventory-service.
/// Runs inside MassTransit's EF Core inbox/outbox, like <see cref="OrderCompletedConsumer"/>.
/// </summary>
public class ElementSoldConsumer : IConsumer<ElementSoldEvent>
{
    private readonly ElementDbContext _context;
    private readonly ILogger<ElementSoldConsumer> _logger;

    public ElementSoldConsumer(ElementDbContext context, ILogger<ElementSoldConsumer> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>Moves the price down once per sale message, records history and publishes the new price.</summary>
    public async Task Consume(ConsumeContext<ElementSoldEvent> context)
    {
        var message = context.Message;
        if (message.Grams <= 0)
        {
            return;
        }

        // The sale event has no id of its own, so the broker message id is the idempotency key. The inbox
        // already drops redeliveries for a while; the marker row keeps the rule after the inbox is pruned.
        if (context.MessageId is not { } saleId)
        {
            return;
        }

        var element = await _context.LockElementAsync(message.ElementSymbol, context.CancellationToken);
        if (element is null)
        {
            _logger.LogWarning("Element {Symbol} not found for desk-sell price nudge.", message.ElementSymbol);
            return;
        }

        if (await _context.StockReservations.FindAsync([saleId], context.CancellationToken) is not null)
        {
            return;
        }

        var now = DateTime.UtcNow;
        _context.PriceHistories.Add(element.RecordTrade(message.Grams, buy: false, now));
        _context.StockReservations.Add(StockReservation.ForDeskSale(saleId, element.Symbol, message.Grams, now));

        await context.Publish(new ElementPriceChangedIntegrationEvent(element.Symbol, element.PricePerGram, now));
        await _context.SaveChangesAsync(context.CancellationToken);
        _logger.LogInformation("Last nudged down after desk sell {Symbol} {Grams}g", message.ElementSymbol, message.Grams);
    }
}
