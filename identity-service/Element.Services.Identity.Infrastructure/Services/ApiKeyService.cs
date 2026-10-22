using Element.Services.Identity.Core.DTOs;
using Element.Services.Identity.Core.Entities;
using Element.Services.Identity.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Identity.Infrastructure.Services;

/// <summary>Result of <see cref="ApiKeyService.IssueKeyAsync"/>.</summary>
public enum IssueKeyOutcome
{
    Issued,

    /// <summary>The account is gone or its password changed after the JWT was issued.</summary>
    StaleSession,

    /// <summary>The account already holds <see cref="ApiKey.MaxActivePerAccount"/> active keys.</summary>
    LimitReached,
}

/// <summary>
/// API key use cases: issue, list, revoke, revoke all, validate. The only writer of the ApiKeys table
/// (account deletion cascades separately). The rules themselves live on <see cref="ApiKey"/>.
/// </summary>
public class ApiKeyService
{
    private readonly IdentityAppDbContext _context;

    /// <summary>Creates the service on top of the identity database.</summary>
    public ApiKeyService(IdentityAppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Issues a key in one transaction: locks the account row, re-checks the session, enforces the active-key cap,
    /// prunes old revoked keys and stores the new key. The raw key is returned only on <see cref="IssueKeyOutcome.Issued"/>.
    /// </summary>
    public async Task<(IssueKeyOutcome Outcome, string? RawKey, ApiKey? Key)> IssueKeyAsync(
        Guid userId, string? sessionSecurityStamp, string description, int rateLimitTps)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();

        // Lock the account row so parallel requests cannot exceed the key limit, then
        // re-check the session in case the password changed while we waited for the lock.
        var lockedAccounts = await _context.Users
            .FromSqlInterpolated($"SELECT * FROM \"AspNetUsers\" WHERE \"Id\" = {userId} FOR UPDATE")
            .AsNoTracking()
            .ToArrayAsync();
        if (lockedAccounts.Length != 1 || lockedAccounts[0].SecurityStamp != sessionSecurityStamp)
        {
            return (IssueKeyOutcome.StaleSession, null, null);
        }

        var activeKeyCount = await _context.ApiKeys.CountAsync(key => key.UserId == userId && key.IsActive);
        if (!ApiKey.CanIssueAnother(activeKeyCount))
        {
            return (IssueKeyOutcome.LimitReached, null, null);
        }

        // Every web login mints a key, so revoked history grows forever; keep only the newest revoked rows.
        var staleRevokedKeyIds = await _context.ApiKeys
            .Where(key => key.UserId == userId && !key.IsActive)
            .OrderByDescending(key => key.CreatedAt)
            .Skip(ApiKey.MaxRevokedKept)
            .Select(key => key.Id)
            .ToListAsync();
        if (staleRevokedKeyIds.Count > 0)
        {
            await _context.ApiKeys.Where(key => staleRevokedKeyIds.Contains(key.Id)).ExecuteDeleteAsync();
        }

        var (rawKey, apiKey) = ApiKey.Issue(userId, description, rateLimitTps, DateTime.UtcNow);
        _context.ApiKeys.Add(apiKey);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return (IssueKeyOutcome.Issued, rawKey, apiKey);
    }

    /// <summary>The user's keys (masked, including revoked ones), newest first.</summary>
    public Task<List<ApiKeyResponseDto>> ListAsync(Guid userId)
    {
        return _context.ApiKeys
            .AsNoTracking()
            .Where(key => key.UserId == userId)
            .OrderByDescending(key => key.CreatedAt)
            .Select(key => new ApiKeyResponseDto(
                key.Id,
                key.UserId,
                key.MaskedKey,
                key.Description,
                key.IsActive,
                key.CreatedAt,
                key.RateLimitTps))
            .ToListAsync();
    }

    /// <summary>Deactivates a key owned by the user; returns false when the user has no key with that id.</summary>
    public async Task<bool> RevokeKeyAsync(Guid userId, Guid keyId)
    {
        var apiKey = await _context.ApiKeys.FirstOrDefaultAsync(key => key.Id == keyId && key.UserId == userId);
        if (apiKey is null)
        {
            return false;
        }

        apiKey.Revoke();
        await _context.SaveChangesAsync();
        // No cache to evict: gateway validates every call against the database via /internal/api-keys/validate.
        return true;
    }

    /// <summary>
    /// Deactivates every active key of the user with one set-based UPDATE (same rule as <see cref="ApiKey.Revoke"/>).
    /// Joins the caller's transaction, so a password change and the revocation commit or roll back together.
    /// </summary>
    public Task RevokeAllAsync(Guid userId)
    {
        return _context.ApiKeys
            .Where(key => key.UserId == userId && key.IsActive)
            .ExecuteUpdateAsync(update => update.SetProperty(key => key.IsActive, false));
    }

    /// <summary>Returns the active key matching the raw value, or null. Reads the database every time so revocation is immediate.</summary>
    public async Task<ApiKey?> ValidateKeyAsync(string rawKey)
    {
        if (string.IsNullOrWhiteSpace(rawKey))
        {
            return null;
        }

        var keyHash = ApiKey.Hash(rawKey);
        return await _context.ApiKeys
            .AsNoTracking()
            .FirstOrDefaultAsync(key => key.KeyHash == keyHash && key.IsActive);
    }
}
