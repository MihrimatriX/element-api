using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Element.Services.Element.Core.Entities;

namespace Element.Services.Element.Core.Abstractions;

/// <summary>
/// Read port over the element catalogue. The domain/application layers depend on
/// this abstraction; the EF Core adapter lives in the Infrastructure project.
/// </summary>
public interface IElementRepository
{
    Task<IReadOnlyList<ChemicalElement>> GetAllAsync(CancellationToken ct = default);
    Task<ChemicalElement?> GetBySymbolAsync(string symbol, CancellationToken ct = default);
    Task<IReadOnlyList<ChemicalElement>> GetBySymbolsAsync(IEnumerable<string> symbols, CancellationToken ct = default);
    Task<IReadOnlyList<ElementPriceHistory>> GetPriceHistoryAsync(string symbol, int limit, CancellationToken ct = default);
}
