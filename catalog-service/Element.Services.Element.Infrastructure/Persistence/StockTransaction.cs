using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Element.Services.Element.Infrastructure.Persistence;

/// <summary>
/// Serialises stock changes per element symbol, so two orders for the same element
/// cannot both read the same "available" grams and oversell.
/// </summary>
public static class StockTransaction
{
    /// <summary>
    /// Opens a transaction holding a PostgreSQL advisory lock for the symbol until commit/rollback.
    /// Returns null on non-relational providers (the in-memory test database), where no lock is needed.
    /// </summary>
    public static async Task<IDbContextTransaction?> BeginAsync(ElementDbContext db, string symbol)
    {
        if (!db.Database.IsRelational())
        {
            return null;
        }

        var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtext({symbol.ToUpperInvariant()}))");
            return transaction;
        }
        catch
        {
            await transaction.DisposeAsync();
            throw;
        }
    }

    /// <summary>Commits the transaction returned by <see cref="BeginAsync"/>; does nothing when it was null.</summary>
    public static async Task CommitAsync(IDbContextTransaction? transaction)
    {
        if (transaction is null)
        {
            return;
        }

        await transaction.CommitAsync();
    }
}
