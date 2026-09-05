using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Element.Services.Element.Infrastructure.Persistence;

public static class StockTransaction
{
    public static async Task<IDbContextTransaction?> BeginAsync(ElementDbContext db, string symbol)
    {
        if (!db.Database.IsRelational()) return null;
        var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtext({symbol.ToUpperInvariant()}))");
            return transaction;
        }
        catch { await transaction.DisposeAsync(); throw; }
    }
}
