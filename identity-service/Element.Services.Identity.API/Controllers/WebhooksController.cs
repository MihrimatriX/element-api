using Element.Services.Identity.Core.DTOs;
using Element.Services.Identity.Core.Entities;
using Element.Services.Identity.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Identity.API.Controllers;

/// <summary>Lets a signed-in user register HTTPS endpoints that receive price and order events.</summary>
[Authorize]
[ApiController]
[Route("api/v1/webhooks")]
public class WebhooksController(IdentityAppDbContext database) : ControllerBase
{
    private const string InvalidUserMessage = "Invalid user identification in token.";

    // Every hook costs a delivery attempt per event; unbounded hooks = fan-out amplification.
    private const int MaxSubscriptionsPerUser = 10;

    private static readonly HashSet<string> SupportedEvents = new(StringComparer.OrdinalIgnoreCase)
    {
        "price.updated",
        "order.updated",
    };

    /// <summary>
    /// Creates a subscription. Only public HTTPS URLs with a DNS host name and supported event names are accepted;
    /// an account may hold at most 10 active subscriptions (409 beyond that).
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWebhookRequest request)
    {
        if (User.GetUserId() is not Guid userId)
        {
            return Unauthorized(InvalidUserMessage);
        }

        if (request is null || string.IsNullOrWhiteSpace(request.Url) || string.IsNullOrWhiteSpace(request.Secret))
        {
            return BadRequest("url and secret are required.");
        }

        if (!WebhookSubscription.IsAcceptableUrl(request.Url.Trim()))
        {
            return BadRequest("Webhook URL must be public https with a DNS host name (no IP literal, localhost or credentials).");
        }

        var events = (request.Events ?? [])
            .OfType<string>()
            .Select(eventName => eventName.Trim().ToLowerInvariant())
            .Where(SupportedEvents.Contains)
            .Distinct()
            .ToArray();
        if (events.Length == 0)
        {
            return BadRequest("events must include price.updated and/or order.updated.");
        }

        await using var transaction = await database.Database.BeginTransactionAsync();

        // Per-account lock (as in API-key issuance) so the cap holds under concurrent requests.
        await database.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM \"AspNetUsers\" WHERE \"Id\" = {userId} FOR UPDATE");
        var activeSubscriptionCount = await database.WebhookSubscriptions
            .CountAsync(subscription => subscription.UserId == userId && subscription.IsActive);
        if (activeSubscriptionCount >= MaxSubscriptionsPerUser)
        {
            return Conflict(new { message = $"En fazla {MaxSubscriptionsPerUser} webhook kaydedebilirsin. Kullanmadıklarını sil." });
        }

        var subscription = new WebhookSubscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Url = request.Url.Trim(),
            Secret = request.Secret,
            Events = string.Join(',', events),
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
        };
        database.WebhookSubscriptions.Add(subscription);
        await database.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(ToDto(subscription));
    }

    /// <summary>Lists the caller's active subscriptions, newest first; secrets are never returned.</summary>
    [HttpGet]
    public async Task<IActionResult> List()
    {
        if (User.GetUserId() is not Guid userId)
        {
            return Unauthorized(InvalidUserMessage);
        }

        var subscriptions = await database.WebhookSubscriptions
            .AsNoTracking()
            .Where(subscription => subscription.UserId == userId && subscription.IsActive)
            .OrderByDescending(subscription => subscription.CreatedAt)
            .ToListAsync();
        return Ok(subscriptions.Select(ToDto));
    }

    /// <summary>Permanently deletes one of the caller's subscriptions; someone else's is reported as not found.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (User.GetUserId() is not Guid userId)
        {
            return Unauthorized(InvalidUserMessage);
        }

        // Hard delete: drops the signing secret and stops create/delete loops from growing the table.
        var deletedCount = await database.WebhookSubscriptions
            .Where(webhook => webhook.Id == id && webhook.UserId == userId)
            .ExecuteDeleteAsync();
        if (deletedCount == 0)
        {
            return NotFound();
        }

        return Ok(new { Message = "Webhook removed." });
    }

    private static WebhookResponseDto ToDto(WebhookSubscription subscription)
    {
        var events = subscription.Events.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        return new WebhookResponseDto(subscription.Id, subscription.Url, events, subscription.CreatedAt);
    }
}
