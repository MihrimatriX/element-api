using Element.Services.Element.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Element.Services.Element.Infrastructure.Persistence;

/// <summary>
/// Read-only queries the catalogue API needs (elements, price history, sold volume).
/// Nothing is change-tracked and symbol matching is case-insensitive. The full element list is
/// served from a short-lived in-process snapshot (<see cref="SnapshotTtl"/>).
/// </summary>
public sealed class EfElementRepository
{
    /// <summary>
    /// Max age of the shared catalogue snapshot. Prices tick every 15 s, so 5 s is invisible to the UI but turns
    /// N anonymous list/search/stats/board reads into one 118-row query per 5 s.
    /// </summary>
    public static readonly TimeSpan SnapshotTtl = TimeSpan.FromSeconds(5);

    private const string ElementsSnapshotCacheKey = "catalog:elements";

    private readonly ElementDbContext _context;
    private readonly IMemoryCache _cache;

    public EfElementRepository(ElementDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    /// <summary>
    /// Returns every element ordered by atomic number, from a shared snapshot that lives for
    /// <see cref="SnapshotTtl"/>. The snapshot is shared and read-only: do not mutate the entities.
    /// GetBySymbol* stay uncached on purpose: order- and wallet-service price trades from the ticker,
    /// which must read the live row.
    /// </summary>
    public async Task<IReadOnlyList<ChemicalElement>> GetAllAsync(CancellationToken ct = default)
    {
        var snapshot = await _cache.GetOrCreateAsync(ElementsSnapshotCacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = SnapshotTtl;
            return await _context.ChemicalElements
                .AsNoTracking()
                .OrderBy(element => element.AtomicNumber)
                .ToListAsync(ct);
        });

        return snapshot!;
    }

    /// <summary>Finds one element by symbol (e.g. "au" or "Au"); null when it does not exist.</summary>
    public async Task<ChemicalElement?> GetBySymbolAsync(string symbol, CancellationToken ct = default)
    {
        var normalizedSymbol = NormalizeSymbol(symbol);
        return await _context.ChemicalElements
            .AsNoTracking()
            .FirstOrDefaultAsync(element => element.Symbol.ToLower() == normalizedSymbol, ct);
    }

    /// <summary>Loads all elements whose symbol is in the given list; unknown symbols are skipped.</summary>
    public async Task<IReadOnlyList<ChemicalElement>> GetBySymbolsAsync(IEnumerable<string> symbols, CancellationToken ct = default)
    {
        var normalizedSymbols = symbols
            .Select(NormalizeSymbol)
            .Distinct()
            .ToList();

        return await _context.ChemicalElements
            .AsNoTracking()
            .Where(element => normalizedSymbols.Contains(element.Symbol.ToLower()))
            .ToListAsync(ct);
    }

    /// <summary>Returns the newest <paramref name="limit"/> price points of an element, newest first.</summary>
    public async Task<IReadOnlyList<ElementPriceHistory>> GetPriceHistoryAsync(string symbol, int limit, CancellationToken ct = default)
    {
        var normalizedSymbol = NormalizeSymbol(symbol);
        return await _context.PriceHistories
            .AsNoTracking()
            .Where(history => history.ElementSymbol.ToLower() == normalizedSymbol)
            .OrderByDescending(history => history.Timestamp)
            .Take(limit)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Open (oldest price), high and low of an element since <paramref name="sinceUtc"/>, aggregated in SQL;
    /// all three are null when the window is empty. A day is ~5.8k rows per symbol; the public ticker used
    /// to pull all of them into memory on every call.
    /// </summary>
    public async Task<(decimal? First, decimal? High, decimal? Low)> GetPriceRangeSinceAsync(string symbol, DateTime sinceUtc, CancellationToken ct = default)
    {
        var normalizedSymbol = NormalizeSymbol(symbol);
        var window = _context.PriceHistories
            .Where(history => history.ElementSymbol.ToLower() == normalizedSymbol && history.Timestamp >= sinceUtc);

        var range = await window
            .GroupBy(_ => 1)
            .Select(group => new
            {
                First = window.OrderBy(history => history.Timestamp).Select(history => (decimal?)history.Price).FirstOrDefault(),
                High = (decimal?)group.Max(history => history.Price),
                Low = (decimal?)group.Min(history => history.Price)
            })
            .FirstOrDefaultAsync(ct);

        return (range?.First, range?.High, range?.Low);
    }

    /// <summary>Sums the grams of fulfilled orders for an element since <paramref name="sinceUtc"/> (ticker volume).</summary>
    public async Task<decimal> GetFulfilledVolumeSinceAsync(string symbol, DateTime sinceUtc, CancellationToken ct = default)
    {
        var normalizedSymbol = NormalizeSymbol(symbol);

        // ponytail: CreatedAt is reservation time, not fulfill time
        var totalGrams = await _context.StockReservations
            .AsNoTracking()
            .Where(reservation => reservation.ElementSymbol.ToLower() == normalizedSymbol)
            .Where(reservation => reservation.Status == StockReservationStatus.Fulfilled)
            .Where(reservation => reservation.CreatedAt >= sinceUtc)
            .SumAsync(reservation => (decimal?)reservation.Quantity, ct);

        return totalGrams ?? 0m;
    }

    /// <summary>
    /// For every symbol, returns the oldest price recorded since <paramref name="sinceUtc"/>.
    /// Used as the starting price of the 24h change on the market board.
    /// </summary>
    public async Task<IReadOnlyDictionary<string, decimal>> GetOldestPriceSinceAsync(DateTime sinceUtc, CancellationToken ct = default)
    {
        // One index seek per element (IX_PriceHistories_lower_ElementSymbol_Timestamp) instead of pulling a
        // day of history (~680k rows) into memory on every /market/board poll.
        var oldestPrices = await _context.ChemicalElements
            .AsNoTracking()
            .Select(element => new
            {
                element.Symbol,
                Price = _context.PriceHistories
                    .Where(history => history.ElementSymbol.ToLower() == element.Symbol.ToLower() && history.Timestamp >= sinceUtc)
                    .OrderBy(history => history.Timestamp)
                    .Select(history => (decimal?)history.Price)
                    .FirstOrDefault()
            })
            .ToListAsync(ct);

        // Filter in memory: a SQL WHERE on Price makes EF repeat the subquery.
        return oldestPrices
            .Where(row => row.Price != null)
            .ToDictionary(row => row.Symbol, row => row.Price!.Value, StringComparer.OrdinalIgnoreCase);
    }

    private static string NormalizeSymbol(string symbol) => symbol.Trim().ToLower();
}
