using Element.Services.Shipment.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Shipment.API.Controllers;

[ApiController]
[Route("api/v1/shipments")]
public class ShipmentsController : ControllerBase
{
    private readonly ShipmentDbContext _db;

    public ShipmentsController(ShipmentDbContext db) => _db = db;

    /// <summary>Search shipments by order, tracking number, status or free-text query.</summary>
    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] Guid? orderId,
        [FromQuery] string? tracking,
        [FromQuery] string? status,
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize is < 1 or > 100) pageSize = 20;

        var query = _db.Shipments.AsNoTracking();

        if (orderId.HasValue)
            query = query.Where(s => s.OrderId == orderId.Value);
        if (!string.IsNullOrWhiteSpace(tracking))
            query = query.Where(s => s.TrackingNumber != null && s.TrackingNumber.Contains(tracking));
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(s => s.Status == status);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(s =>
                s.TrackingNumber != null && s.TrackingNumber.Contains(term) ||
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
                s.DispatchedAt
            })
            .ToListAsync(ct);

        return Ok(new
        {
            count = total,
            page,
            pageSize,
            results = items
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var shipment = await _db.Shipments.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
        return shipment == null ? NotFound() : Ok(shipment);
    }

    [HttpGet("track/{trackingNumber}")]
    public async Task<IActionResult> Track(string trackingNumber, CancellationToken ct)
    {
        var shipment = await _db.Shipments.AsNoTracking()
            .FirstOrDefaultAsync(s => s.TrackingNumber == trackingNumber, ct);
        return shipment == null ? NotFound() : Ok(shipment);
    }
}
