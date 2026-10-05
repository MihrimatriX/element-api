using System.Data.Common;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Serilog;

namespace Element.Shared.Extensions;

/// <summary>Startup helpers for the EF Core database every stateful .NET service owns.</summary>
public static class DatabaseExtensions
{
    // On reboot Docker starts every container at once (depends_on is ignored), so Postgres may
    // still be booting. Wait up to ~60s instead of crash-looping; after that we throw and the
    // `restart: unless-stopped` policy takes over.
    private const int MaxAttempts = 30;
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(2);

    /// <summary>
    /// Applies EF migrations for the context. Multiple contexts may share one database — always use Migrate, not EnsureCreated.
    /// </summary>
    public static async Task ApplyDatabaseAsync<TContext>(this WebApplication app, string databaseLabel)
        where TContext : DbContext
    {
        for (var attempt = 1; ; attempt++)
        {
            using var scope = app.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<TContext>();

            try
            {
                await dbContext.Database.MigrateAsync();
                Log.Information("Database {Database} migrated successfully.", databaseLabel);
                return;
            }
            catch (Exception ex) when (attempt < MaxAttempts && IsTransientStartupError(ex))
            {
                Log.Warning("Database {Database} not ready (attempt {Attempt}/{Max}): {Reason}",
                    databaseLabel, attempt, MaxAttempts, ex.GetBaseException().Message);
                await Task.Delay(RetryDelay);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to initialize database {Database}.", databaseLabel);
                throw;
            }
        }
    }

    /// <summary>
    /// True when the failure means "Postgres isn't reachable/ready yet" (worth waiting for),
    /// false for errors that waiting won't fix (bad password, broken migration, SQL error).
    /// </summary>
    internal static bool IsTransientStartupError(Exception ex)
    {
        // TODO(human): decide which startup failures are worth retrying.
        return false;
    }
}
