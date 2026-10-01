using Element.Services.Identity.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Identity.API.Controllers;

[ApiController]
[Route("api/v1/internal/webhooks")]
public class InternalWebhooksController : ControllerBase
{
    private readonly IdentityAppDbContext _db;
    private readonly IConfiguration _configuration;

    public InternalWebhooksController(IdentityAppDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? @event, [FromQuery] Guid? customerId)
    {
        if (!InternalKey.Matches(Request, _configuration)) return Unauthorized();

        var query = _db.WebhookSubscriptions.AsNoTracking().Where(w => w.IsActive);
        if (@event == "order.updated")
        {
            if (customerId == null || customerId == Guid.Empty) return Ok(Array.Empty<object>());
            query = query.Where(w => w.UserId == customerId);
        }
        if (!string.IsNullOrWhiteSpace(@event))
        {
            var ev = @event.Trim().ToLowerInvariant();
            query = query.Where(w => w.Events.ToLower().Contains(ev));
        }

        // notification delivers to at most 10 hooks per event. ponytail: for broadcast price.updated this is
        // 10 platform-wide (oldest first); page or fan out per user before price.updated is ever published.
        var rows = await query.OrderBy(w => w.CreatedAt).Take(10).Select(w => new
        {
            w.Url,
            w.Secret,
            events = w.Events
        }).ToListAsync();
        return Ok(rows);
    }
}
