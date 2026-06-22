using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Serilog;

namespace Element.Shared.Extensions;

public static class DatabaseExtensions
{
    /// <summary>
    /// Applies EF migrations for the context. Multiple contexts may share one database — always use Migrate, not EnsureCreated.
    /// </summary>
    public static async Task ApplyDatabaseAsync<TContext>(this WebApplication app, string databaseLabel)
        where TContext : DbContext
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TContext>();

        try
        {
            await db.Database.MigrateAsync();
            Log.Information("Database {Database} migrated successfully.", databaseLabel);
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to initialize database {Database}.", databaseLabel);
            throw;
        }
    }
}
