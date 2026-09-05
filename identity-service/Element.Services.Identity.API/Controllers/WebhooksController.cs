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

    private readonly IdentityAppDbContext _db;

    public WebhooksController(IdentityAppDbContext db) => _db = db;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWebhookRequest request)
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized("Invalid user identification in token.");

        if (request is null || string.IsNullOrWhiteSpace(request.Url) || string.IsNullOrWhiteSpace(request.Secret))
            return BadRequest("url and secret are required.");

        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
            return BadRequest("Webhook URL must be https.");

        var events = (request.Events ?? [])
            .Select(e => e.Trim().ToLowerInvariant())
            .Where(Allowed.Contains)
            .Distinct()
            .ToArray();
        if (events.Length == 0)
            return BadRequest("events must include price.updated and/or order.updated.");

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
        return Ok(ToDto(row));
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var userId = CurrentUserId();
        if (userId is null) return Unauthorized("Invalid user identification in token.");

        var rows = await _db.WebhookSubscriptions
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

        var row = await _db.WebhookSubscriptions.FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId);
        if (row == null) return NotFound();
        row.IsActive = false;
        await _db.SaveChangesAsync();
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
