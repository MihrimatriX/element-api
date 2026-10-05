using Element.Services.Identity.Core.DTOs;
using Element.Services.Identity.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace Element.Services.Identity.API.Controllers;

/// <summary>Service-to-service endpoint the gateway calls to resolve a raw API key into its owner and rate limit.</summary>
[ApiController]
[Route("api/v1/internal/api-keys")]
public class InternalKeysController(ApiKeyService apiKeyService, IConfiguration configuration) : ControllerBase
{
    /// <summary>Validates a raw API key; the caller must send the INTERNAL_API_KEY header.</summary>
    [HttpPost("validate")]
    public async Task<IActionResult> ValidateKey([FromBody] ValidateKeyRequest request)
    {
        if (!InternalApiKey.IsAuthorized(Request, configuration))
        {
            return Unauthorized("INTERNAL_API_KEY required.");
        }

        var apiKey = await apiKeyService.ValidateKeyAsync(request.RawKey);
        if (apiKey is null)
        {
            return Unauthorized("Invalid or inactive API Key.");
        }

        return Ok(ApiKeyResponseDto.FromEntity(apiKey));
    }
}
