using Element.Services.Identity.Core.DTOs;
using Element.Services.Identity.Core.Entities;
using Element.Services.Identity.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Element.Services.Identity.API.Controllers;

/// <summary>Lets a signed-in user issue, list and revoke the API keys that unlock the public market API.</summary>
[Authorize]
[ApiController]
[Route("api/v1/api-keys")]
public class ApiKeyController(ApiKeyService apiKeyService) : ControllerBase
{
    private const string InvalidUserMessage = "Invalid user identification in token.";

    /// <summary>
    /// Issues a new API key; the raw key appears only in this response.
    /// 401 when the session is stale, 409 at the active-key cap. Also prunes the caller's revoked keys down to the newest 20.
    /// </summary>
    [HttpPost("generate")]
    public async Task<IActionResult> GenerateKey([FromBody] GenerateKeyRequest request)
    {
        if (User.GetUserId() is not Guid userId)
        {
            return Unauthorized(InvalidUserMessage);
        }

        var tokenSecurityStamp = User.FindFirst(TokenService.SecurityStampClaimType)?.Value;
        var (outcome, rawKey, apiKey) = await apiKeyService.IssueKeyAsync(
            userId, tokenSecurityStamp, request.Description, request.RateLimitTps);

        return outcome switch
        {
            IssueKeyOutcome.StaleSession => Unauthorized(),
            IssueKeyOutcome.LimitReached => Conflict(new
            {
                message = $"En fazla {ApiKey.MaxActivePerAccount} etkin API anahtarı kullanabilirsin. Kullanmadıklarını iptal et.",
            }),
            _ => Ok(new
            {
                Message = "API Key generated successfully. Please copy it now, it will not be shown again.",
                ApiKey = rawKey,
                Details = ApiKeyResponseDto.FromEntity(apiKey!),
            }),
        };
    }

    /// <summary>Lists the caller's keys (masked, including revoked ones), newest first.</summary>
    [HttpGet]
    public async Task<IActionResult> GetUserKeys()
    {
        if (User.GetUserId() is not Guid userId)
        {
            return Unauthorized(InvalidUserMessage);
        }

        return Ok(await apiKeyService.ListAsync(userId));
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
