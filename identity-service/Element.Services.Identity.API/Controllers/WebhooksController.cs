using Element.Services.Identity.Core.DTOs;
using Element.Services.Identity.Core.Entities;
using Element.Services.Identity.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Element.Services.Identity.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/webhooks")]
public class WebhooksController : ControllerBase
{
    private static readonly HashSet<string> Allowed = new(StringComparer.OrdinalIgnoreCase)
    {
        "price.updated",
        "order.updated"
    };

    private const int MaxPerUser = 10;
    private readonly IdentityAppDbContext _db;

    public WebhooksController(IdentityAppDbContext db) => _db = db;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWebhookRequest request)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized("Invalid user identification in token.");

        if (request is null || string.IsNullOrWhiteSpace(request.Url) || string.IsNullOrWhiteSpace(request.Secret))
            return BadRequest("url and secret are required.");

        if (!WebhookSubscription.IsAcceptableUrl(request.Url.Trim()))
            return BadRequest("Webhook URL must be public https with a DNS host name (no IP literal, localhost or credentials).");

        var events = (request.Events ?? [])
            .OfType<string>()
            .Select(e => e.Trim().ToLowerInvariant())
            .Where(Allowed.Contains)
            .Distinct()
            .ToArray();
        if (events.Length == 0)
            return BadRequest("events must include price.updated and/or order.updated.");

        await using var transaction = await _db.Database.BeginTransactionAsync();
        // Per-account lock (as in API-key issuance) so the cap holds under concurrent requests.
        // Every hook costs a delivery attempt per event; unbounded hooks = fan-out amplification.
        await _db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM \"AspNetUsers\" WHERE \"Id\" = {userId.Value} FOR UPDATE");
        if (await _db.WebhookSubscriptions.CountAsync(w => w.UserId == userId && w.IsActive) >= MaxPerUser)
            return Conflict(new { message = $"En fazla {MaxPerUser} webhook kaydedebilirsin. Kullanmadıklarını sil." });

        var row = new WebhookSubscription
        {
            Id = Guid.NewGuid(),
            UserId = userId.Value,
            Url = request.Url.Trim(),
            Secret = request.Secret,
            Events = string.Join(',', events),
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };
        _db.WebhookSubscriptions.Add(row);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();
        return Ok(ToDto(row));
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized("Invalid user identification in token.");

        var rows = await _db.WebhookSubscriptions.AsNoTracking()
            .Where(w => w.UserId == userId && w.IsActive)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();
        return Ok(rows.Select(ToDto));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized("Invalid user identification in token.");

        // Hard delete: drops the signing secret and stops create/delete loops from growing the table.
        var deleted = await _db.WebhookSubscriptions.Where(w => w.Id == id && w.UserId == userId).ExecuteDeleteAsync();
        if (deleted == 0) return NotFound();
        return Ok(new { Message = "Webhook removed." });
    }

    private Guid? CurrentUserId()
    {
        var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    private static WebhookResponseDto ToDto(WebhookSubscription row) =>
        new(row.Id, row.Url, row.Events.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries), row.CreatedAt);
}
