using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Element.Services.Element.Core.Abstractions;
using Element.Services.Element.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Element.Infrastructure.Persistence;

/// <summary>EF Core adapter for <see cref="IElementRepository"/>.</summary>
public sealed class EfElementRepository : IElementRepository
{
    private readonly ElementDbContext _context;

    public EfElementRepository(ElementDbContext context) => _context = context;

    public async Task<IReadOnlyList<ChemicalElement>> GetAllAsync(CancellationToken ct = default) =>
        await _context.ChemicalElements.AsNoTracking().OrderBy(e => e.AtomicNumber).ToListAsync(ct);

    public async Task<ChemicalElement?> GetBySymbolAsync(string symbol, CancellationToken ct = default)
    {
        var s = symbol.Trim().ToLower();
        return await _context.ChemicalElements.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Symbol.ToLower() == s, ct);
    }

    public async Task<IReadOnlyList<ChemicalElement>> GetBySymbolsAsync(IEnumerable<string> symbols, CancellationToken ct = default)
    {
        var wanted = symbols.Select(s => s.Trim().ToLower()).Distinct().ToList();
        return await _context.ChemicalElements.AsNoTracking()
            .Where(e => wanted.Contains(e.Symbol.ToLower()))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ElementPriceHistory>> GetPriceHistoryAsync(string symbol, int limit, CancellationToken ct = default)
    {
        var s = symbol.Trim().ToLower();
        return await _context.PriceHistories.AsNoTracking()
            .Where(h => h.ElementSymbol.ToLower() == s)
            .OrderByDescending(h => h.Timestamp)
            .Take(limit)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ElementPriceHistory>> GetPriceHistorySinceAsync(string symbol, DateTime sinceUtc, CancellationToken ct = default)
    {
        var s = symbol.Trim().ToLower();
        return await _context.PriceHistories.AsNoTracking()
            .Where(h => h.ElementSymbol.ToLower() == s && h.Timestamp >= sinceUtc)
            .OrderBy(h => h.Timestamp)
            .ToListAsync(ct);
    }

    public async Task<decimal> GetFulfilledVolumeSinceAsync(string symbol, DateTime sinceUtc, CancellationToken ct = default)
    {
        var s = symbol.Trim().ToLower();
        // ponytail: CreatedAt is reservation time, not fulfill time
        return await _context.StockReservations.AsNoTracking()
            .Where(r => r.ElementSymbol.ToLower() == s && r.Status == "Fulfilled" && r.CreatedAt >= sinceUtc)
            .SumAsync(r => (decimal?)r.Quantity, ct) ?? 0m;
    }

    public async Task<IReadOnlyDictionary<string, decimal>> GetOldestPriceSinceAsync(DateTime sinceUtc, CancellationToken ct = default)
    {
        var rows = await _context.PriceHistories.AsNoTracking()
            .Where(h => h.Timestamp >= sinceUtc)
            .Select(h => new { h.ElementSymbol, h.Price, h.Timestamp })
            .ToListAsync(ct);

        return rows
            .GroupBy(h => h.ElementSymbol, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(x => x.Timestamp).First().Price,
                StringComparer.OrdinalIgnoreCase);
    }

    public async Task<IReadOnlyDictionary<string, decimal>> GetFulfilledVolumeBySymbolSinceAsync(DateTime sinceUtc, CancellationToken ct = default)
    {
        // ponytail: CreatedAt is reservation time, not fulfill time
        var rows = await _context.StockReservations.AsNoTracking()
            .Where(r => r.Status == "Fulfilled" && r.CreatedAt >= sinceUtc)
            .GroupBy(r => r.ElementSymbol)
            .Select(g => new { Symbol = g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToListAsync(ct);
        return rows.ToDictionary(x => x.Symbol, x => x.Qty, StringComparer.OrdinalIgnoreCase);
    }
}
