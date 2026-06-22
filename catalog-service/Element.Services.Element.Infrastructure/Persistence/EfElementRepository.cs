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
}
