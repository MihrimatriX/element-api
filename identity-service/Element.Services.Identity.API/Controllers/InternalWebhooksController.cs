using Element.Services.Identity.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Identity.API.Controllers;

/// <summary>Service-to-service endpoint the notification service calls to find the webhooks to deliver for an event.</summary>
[ApiController]
[Route("api/v1/internal/webhooks")]
public class InternalWebhooksController(IdentityAppDbContext database, IConfiguration configuration) : ControllerBase
{
    private const string OrderUpdatedEvent = "order.updated";

    /// <summary>The notification service delivers to at most this many hooks per event.</summary>
    private const int MaxDeliveredSubscriptions = 10;

    /// <summary>
    /// Lists up to 10 active subscriptions (URL, signing secret, events) for an event, oldest first;
    /// requires the INTERNAL_API_KEY header.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? @event, [FromQuery] Guid? customerId)
    {
        if (!InternalApiKey.IsAuthorized(Request, configuration))
        {
            return Unauthorized();
        }

        var subscriptions = database.WebhookSubscriptions
            .AsNoTracking()
            .Where(subscription => subscription.IsActive);

        // An order belongs to one customer, so its updates may only reach that customer's endpoints.
        if (@event == OrderUpdatedEvent)
        {
            if (customerId is null || customerId == Guid.Empty)
            {
                return Ok(Array.Empty<object>());
            }

            subscriptions = subscriptions.Where(subscription => subscription.UserId == customerId);
        }

        if (!string.IsNullOrWhiteSpace(@event))
        {
            var normalizedEvent = @event.Trim().ToLowerInvariant();
            subscriptions = subscriptions.Where(subscription => subscription.Events.ToLower().Contains(normalizedEvent));
        }

        // ponytail: for broadcast price.updated this is 10 platform-wide (oldest first);
        // page or fan out per user before price.updated is ever published.
        var rows = await subscriptions
            .OrderBy(subscription => subscription.CreatedAt)
            .Take(MaxDeliveredSubscriptions)
            .Select(subscription => new { subscription.Url, subscription.Secret, events = subscription.Events })
            .ToListAsync();
        return Ok(rows);
    }
}
