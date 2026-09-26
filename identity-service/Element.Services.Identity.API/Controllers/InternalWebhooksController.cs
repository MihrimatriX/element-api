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
        if (!InternalKeyOk()) return Unauthorized();

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

        var rows = await query.Select(w => new
        {
            w.Url,
            w.Secret,
            events = w.Events
        }).ToListAsync();
        return Ok(rows);
    }

    private bool InternalKeyOk()
    {
        var expected = _configuration["INTERNAL_API_KEY"];
        if (string.IsNullOrEmpty(expected)) return false;
        return Request.Headers.TryGetValue("INTERNAL_API_KEY", out var got) && got == expected;
    }
}
