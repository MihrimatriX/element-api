using System.Security.Cryptography;
using System.Text;
using Element.Services.Shipment.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Shipment.API.Controllers;

/// <summary>
/// Read-only REST API over the shipment records written by the shipment consumer.
/// Internal only: every call needs INTERNAL_API_KEY. The gateway injects it (and overwrites X-User-Id)
/// on the public track route; anything else on the compose network must present it too.
/// </summary>
[ApiController]
[Route("api/v1/shipments")]
public class ShipmentsController : ControllerBase
{
    private const int FirstPage = 1;
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    /// <summary>Shared secret header (and configuration key) required on every request.</summary>
    private const string InternalApiKeyHeader = "INTERNAL_API_KEY";

    /// <summary>Header set by the gateway after it validates the caller's API key.</summary>
    private const string UserIdHeader = "X-User-Id";

    private readonly ShipmentDbContext _db;
    private readonly IConfiguration _configuration;

    /// <summary>Creates the controller with the shipment database context and configuration (for INTERNAL_API_KEY).</summary>
    public ShipmentsController(ShipmentDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    /// <summary>Search shipments by order, tracking number, status or free-text query, newest first and paged.</summary>
    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] Guid? orderId,
        [FromQuery] string? tracking,
        [FromQuery] string? status,
        [FromQuery] string? q,
        [FromQuery] int page = FirstPage,
        [FromQuery] int pageSize = DefaultPageSize,
        CancellationToken ct = default)
    {
        if (!HasValidInternalKey())
        {
            return Unauthorized();
        }

        if (page < FirstPage)
        {
            page = FirstPage;
        }

        // Out-of-range sizes fall back to the default, not to the nearest limit.
        if (pageSize is < 1 or > MaxPageSize)
        {
            pageSize = DefaultPageSize;
        }

        var query = _db.Shipments.AsNoTracking();

        if (orderId.HasValue)
        {
            query = query.Where(s => s.OrderId == orderId.Value);
        }

        if (!string.IsNullOrWhiteSpace(tracking))
        {
            query = query.Where(s => s.TrackingNumber != null && s.TrackingNumber.Contains(tracking));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(s => s.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(s =>
                (s.TrackingNumber != null && s.TrackingNumber.Contains(term)) ||
                s.ElementSymbol.Contains(term) ||
                s.CustomerId.Contains(term) ||
                s.OrderId.ToString().Contains(term));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new
            {
                s.Id,
                s.OrderId,
                s.CustomerId,
                s.ElementSymbol,
                s.Quantity,
                s.Status,
                s.TrackingNumber,
                s.CreatedAt,
                s.DispatchedAt,
            })
            .ToListAsync(ct);

        return Ok(new
        {
            count = total,
            page,
            pageSize,
            results = items,
        });
    }

    /// <summary>Returns one shipment by its id, or 404 when it does not exist.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (!HasValidInternalKey())
        {
            return Unauthorized();
        }

        var shipment = await _db.Shipments
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == id, ct);

        if (shipment == null)
        {
            return NotFound();
        }

        return Ok(shipment);
    }

    /// <summary>
    /// Customer-facing tracking lookup (exposed through the gateway with an API key):
    /// returns the shipment only when it belongs to the calling user.
    /// </summary>
    [HttpGet("track/{trackingNumber}")]
    public async Task<IActionResult> Track(string trackingNumber, CancellationToken ct)
    {
        if (!HasValidInternalKey())
        {
            return Unauthorized();
        }

        if (!Guid.TryParse(Request.Headers[UserIdHeader], out var userId))
        {
            return NotFound();
        }

        // Owner is part of the lookup: another customer's number is indistinguishable from an unknown one,
        // and a tracking-number collision can never return someone else's row.
        var owner = userId.ToString();
        var shipment = await _db.Shipments
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.TrackingNumber == trackingNumber && s.CustomerId.ToLower() == owner, ct);

        if (shipment == null)
        {
            return NotFound();
        }

        return Ok(shipment);
    }

    /// <summary>
    /// Constant-time comparison of the presented INTERNAL_API_KEY header with the configured key.
    /// Fails closed: false when no key is configured.
    /// </summary>
    private bool HasValidInternalKey()
    {
        var expected = _configuration[InternalApiKeyHeader];
        if (string.IsNullOrEmpty(expected))
        {
            return false;
        }

        var presented = Request.Headers[InternalApiKeyHeader].ToString();
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(presented),
            Encoding.UTF8.GetBytes(expected));
    }
}
