using Element.Services.Compound.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Compound.Infrastructure.Persistence;

/// <summary>Read-only compound queries; all text matching is case-insensitive.</summary>
public class EfCompoundRepository
{
    private readonly CompoundDbContext _db;

    public EfCompoundRepository(CompoundDbContext db) => _db = db;

    /// <summary>
    /// Returns compounds matching every given filter (parent element symbol, kind, free-text search),
    /// ordered by element symbol then slug. Null or blank filters are ignored.
    /// </summary>
    public async Task<IReadOnlyList<ChemicalCompound>> QueryAsync(
        string? element,
        string? kind,
        string? search,
        CancellationToken ct = default)
    {
        var query = _db.Compounds.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(element))
        {
            var elementSymbol = element.Trim().ToUpperInvariant();
            query = query.Where(compound => compound.ElementSymbol.ToUpper() == elementSymbol);
        }

        if (!string.IsNullOrWhiteSpace(kind))
        {
            var normalizedKind = kind.Trim().ToLowerInvariant();
            query = query.Where(compound => compound.Kind.ToLower() == normalizedKind);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(compound =>
                compound.Slug.ToLower().Contains(term)
                || compound.Formula.ToLower().Contains(term)
                || compound.Name.ToLower().Contains(term)
                || compound.NameTr.ToLower().Contains(term)
                || compound.ElementSymbol.ToLower().Contains(term));
        }

        return await query
            .OrderBy(compound => compound.ElementSymbol)
            .ThenBy(compound => compound.Slug)
            .ToListAsync(ct);
    }

    /// <summary>Finds one compound by slug (e.g. "aucl3"); null when it does not exist.</summary>
    public Task<ChemicalCompound?> GetBySlugAsync(string slug, CancellationToken ct = default)
    {
        var normalizedSlug = slug.Trim().ToLowerInvariant();
        return _db.Compounds
            .AsNoTracking()
            .FirstOrDefaultAsync(compound => compound.Slug.ToLower() == normalizedSlug, ct);
    }
}
