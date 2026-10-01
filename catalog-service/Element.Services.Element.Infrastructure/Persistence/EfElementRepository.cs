using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Element.Services.Element.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Element.Services.Element.Infrastructure.Persistence;

public sealed class EfElementRepository
{
    /// <summary>
    /// Max age of the shared catalogue snapshot. Prices tick every 15 s, so 5 s is invisible to the UI but turns
    /// N anonymous list/search/stats/board reads into one 118-row query per 5 s.
    /// </summary>
    public static readonly TimeSpan SnapshotTtl = TimeSpan.FromSeconds(5);

    private readonly ElementDbContext _context;
    private readonly IMemoryCache _cache;

    public EfElementRepository(ElementDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    /// <summary>
    /// Shared, read-only snapshot (do not mutate the entities). GetBySymbol* stay uncached on purpose:
    /// order- and wallet-service price trades from the ticker, which must read the live row.
    /// </summary>
    public async Task<IReadOnlyList<ChemicalElement>> GetAllAsync(CancellationToken ct = default) =>
        (await _cache.GetOrCreateAsync("catalog:elements", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = SnapshotTtl;
            return await _context.ChemicalElements.AsNoTracking().OrderBy(e => e.AtomicNumber).ToListAsync(ct);
        }))!;

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

    /// <summary>
    /// Open/high/low since <paramref name="sinceUtc"/>, aggregated in SQL. A day is ~5.8k rows per symbol;
    /// the public ticker used to pull all of them into memory on every call.
    /// </summary>
    public async Task<(decimal? First, decimal? High, decimal? Low)> GetPriceRangeSinceAsync(string symbol, DateTime sinceUtc, CancellationToken ct = default)
    {
        var s = symbol.Trim().ToLower();
        var window = _context.PriceHistories.Where(h => h.ElementSymbol.ToLower() == s && h.Timestamp >= sinceUtc);
        var row = await window
            .GroupBy(_ => 1)
            .Select(g => new
            {
                First = window.OrderBy(h => h.Timestamp).Select(h => (decimal?)h.Price).FirstOrDefault(),
                High = (decimal?)g.Max(h => h.Price),
                Low = (decimal?)g.Min(h => h.Price)
            })
            .FirstOrDefaultAsync(ct);
        return (row?.First, row?.High, row?.Low);
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
        // One index seek per element (IX_PriceHistories_lower_ElementSymbol_Timestamp) instead of pulling a
        // day of history (~680k rows) into memory on every /market/board poll.
        var rows = await _context.ChemicalElements.AsNoTracking()
            .Select(e => new
            {
                e.Symbol,
                Price = _context.PriceHistories
                    .Where(h => h.ElementSymbol.ToLower() == e.Symbol.ToLower() && h.Timestamp >= sinceUtc)
                    .OrderBy(h => h.Timestamp)
                    .Select(h => (decimal?)h.Price)
                    .FirstOrDefault()
            })
            .ToListAsync(ct);

        // Filter in memory: a SQL WHERE on Price makes EF repeat the subquery.
        return rows.Where(r => r.Price != null)
            .ToDictionary(r => r.Symbol, r => r.Price!.Value, StringComparer.OrdinalIgnoreCase);
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
