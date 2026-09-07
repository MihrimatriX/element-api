using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Element.Services.Identity.Core.DTOs;
using Element.Services.Identity.Infrastructure.Persistence;
using Element.Services.Identity.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Identity.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/api-keys")]
public class ApiKeyController : ControllerBase
{
    private readonly ApiKeyService _apiKeyService;
    private readonly IdentityAppDbContext _context;

    public ApiKeyController(ApiKeyService apiKeyService, IdentityAppDbContext context)
    {
        _apiKeyService = apiKeyService;
        _context = context;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> GenerateKey([FromBody] GenerateKeyRequest request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                           ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized("Invalid user identification in token.");
        }

        var (rawKey, apiKeyRecord) = await _apiKeyService.GenerateKeyAsync(userId, request.Description, request.RateLimitTps);

        return Ok(new
        {
            Message = "API Key generated successfully. Please copy it now, it will not be shown again.",
            ApiKey = rawKey,
            Details = new ApiKeyResponseDto(
                Id: apiKeyRecord.Id,
                UserId: apiKeyRecord.UserId,
                MaskedKey: apiKeyRecord.MaskedKey,
                Description: apiKeyRecord.Description,
                IsActive: apiKeyRecord.IsActive,
                CreatedAt: apiKeyRecord.CreatedAt,
                RateLimitTps: apiKeyRecord.RateLimitTps
            )
        });
    }

    [HttpGet]
    public async Task<IActionResult> GetUserKeys()
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                           ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized("Invalid user identification in token.");
        }

        var keys = await _context.ApiKeys
            .Where(k => k.UserId == userId)
            .OrderByDescending(k => k.CreatedAt)
            .Select(k => new ApiKeyResponseDto(
                k.Id,
                k.UserId,
                k.MaskedKey,
                k.Description,
                k.IsActive,
                k.CreatedAt,
                k.RateLimitTps
            ))
            .ToListAsync();

        return Ok(keys);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> RevokeKey(Guid id)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                           ?? User.FindFirst("sub")?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized("Invalid user identification in token.");
        }

        var success = await _apiKeyService.RevokeKeyAsync(userId, id);
        if (!success)
        {
            return NotFound("API Key not found or does not belong to you.");
        }

        return Ok(new { Message = "API Key revoked successfully." });
    }
}
