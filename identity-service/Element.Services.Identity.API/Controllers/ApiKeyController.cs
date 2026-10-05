using Element.Services.Identity.Core.DTOs;
using Element.Services.Identity.Infrastructure.Persistence;
using Element.Services.Identity.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Identity.API.Controllers;

/// <summary>Lets a signed-in user issue, list and revoke the API keys that unlock the public market API.</summary>
[Authorize]
[ApiController]
[Route("api/v1/api-keys")]
public class ApiKeyController(ApiKeyService apiKeyService, IdentityAppDbContext database) : ControllerBase
{
    private const int MaxActiveKeysPerAccount = 20;
    private const int MaxRevokedKeysKept = 20;
    private const string InvalidUserMessage = "Invalid user identification in token.";

    /// <summary>
    /// Issues a new API key; the raw key appears only in this response.
    /// Also prunes the caller's revoked keys down to the newest 20.
    /// </summary>
    [HttpPost("generate")]
    public async Task<IActionResult> GenerateKey([FromBody] GenerateKeyRequest request)
    {
        if (User.GetUserId() is not Guid userId)
        {
            return Unauthorized(InvalidUserMessage);
        }

        await using var transaction = await database.Database.BeginTransactionAsync();

        // Lock the account row so parallel requests cannot exceed the key limit, then
        // re-check the session in case the password changed while we waited for the lock.
        var lockedAccounts = await database.Users
            .FromSqlInterpolated($"SELECT * FROM \"AspNetUsers\" WHERE \"Id\" = {userId} FOR UPDATE")
            .AsNoTracking()
            .ToArrayAsync();
        var tokenSecurityStamp = User.FindFirst(TokenService.SecurityStampClaimType)?.Value;
        var sessionIsCurrent = lockedAccounts.Length == 1 && lockedAccounts[0].SecurityStamp == tokenSecurityStamp;
        if (!sessionIsCurrent)
        {
            return Unauthorized();
        }

        var activeKeyCount = await database.ApiKeys.CountAsync(key => key.UserId == userId && key.IsActive);
        if (activeKeyCount >= MaxActiveKeysPerAccount)
        {
            return Conflict(new { message = $"En fazla {MaxActiveKeysPerAccount} etkin API anahtarı kullanabilirsin. Kullanmadıklarını iptal et." });
        }

        // Every web login mints a key, so revoked history grows forever; keep only the newest revoked rows.
        var staleRevokedKeyIds = await database.ApiKeys
            .Where(key => key.UserId == userId && !key.IsActive)
            .OrderByDescending(key => key.CreatedAt)
            .Skip(MaxRevokedKeysKept)
            .Select(key => key.Id)
            .ToListAsync();
        if (staleRevokedKeyIds.Count > 0)
        {
            await database.ApiKeys.Where(key => staleRevokedKeyIds.Contains(key.Id)).ExecuteDeleteAsync();
        }

        var (rawKey, apiKey) = await apiKeyService.GenerateKeyAsync(userId, request.Description, request.RateLimitTps);
        await transaction.CommitAsync();

        return Ok(new
        {
            Message = "API Key generated successfully. Please copy it now, it will not be shown again.",
            ApiKey = rawKey,
            Details = ApiKeyResponseDto.FromEntity(apiKey),
        });
    }

    /// <summary>Lists the caller's keys (masked, including revoked ones), newest first.</summary>
    [HttpGet]
    public async Task<IActionResult> GetUserKeys()
    {
        if (User.GetUserId() is not Guid userId)
        {
            return Unauthorized(InvalidUserMessage);
        }

        var keys = await database.ApiKeys
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

        return Ok(keys);
    }

    /// <summary>Revokes one of the caller's keys; someone else's key is reported as not found.</summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> RevokeKey(Guid id)
    {
        if (User.GetUserId() is not Guid userId)
        {
            return Unauthorized(InvalidUserMessage);
        }

        var revoked = await apiKeyService.RevokeKeyAsync(userId, id);
        if (!revoked)
        {
            return NotFound("API Key not found or does not belong to you.");
        }

        return Ok(new { Message = "API Key revoked successfully." });
    }
}
