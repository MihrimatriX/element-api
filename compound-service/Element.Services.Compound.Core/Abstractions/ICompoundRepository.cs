using Element.Services.Compound.Core.Entities;

namespace Element.Services.Compound.Core.Abstractions;

public interface ICompoundRepository
{
    Task<IReadOnlyList<ChemicalCompound>> QueryAsync(
        string? element,
        string? kind,
        string? q,
        CancellationToken ct = default);

    Task<ChemicalCompound?> GetBySlugAsync(string slug, CancellationToken ct = default);
}
