using Element.Services.Compound.Core.Abstractions;
using Element.Services.Compound.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Compound.Infrastructure.Persistence;

public class EfCompoundRepository : ICompoundRepository
{
    private readonly CompoundDbContext _db;

    public EfCompoundRepository(CompoundDbContext db) => _db = db;

    public async Task<IReadOnlyList<ChemicalCompound>> QueryAsync(
        string? element,
        string? kind,
        string? q,
        CancellationToken ct = default)
    {
        var query = _db.Compounds.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(element))
        {
            var sym = element.Trim().ToUpperInvariant();
            query = query.Where(c => c.ElementSymbol.ToUpper() == sym);
        }

        if (!string.IsNullOrWhiteSpace(kind))
        {
            var k = kind.Trim().ToLowerInvariant();
            query = query.Where(c => c.Kind.ToLower() == k);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLowerInvariant();
            query = query.Where(c =>
                c.Slug.ToLower().Contains(term)
                || c.Formula.ToLower().Contains(term)
                || c.Name.ToLower().Contains(term)
                || c.NameTr.ToLower().Contains(term)
                || c.ElementSymbol.ToLower().Contains(term));
        }

        return await query
            .OrderBy(c => c.ElementSymbol)
            .ThenBy(c => c.Slug)
            .ToListAsync(ct);
    }

    public Task<ChemicalCompound?> GetBySlugAsync(string slug, CancellationToken ct = default)
    {
        var key = slug.Trim().ToLowerInvariant();
        return _db.Compounds.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Slug.ToLower() == key, ct);
    }
}
