using System.Threading.Tasks;
using Element.Services.Identity.Core.DTOs;
using Element.Services.Identity.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Element.Services.Identity.API.Controllers;

[ApiController]
[Route("api/v1/internal/api-keys")]
public class InternalKeysController : ControllerBase
{
    private readonly IApiKeyService _apiKeyService;

    public InternalKeysController(IApiKeyService apiKeyService)
    {
        _apiKeyService = apiKeyService;
    }

    [HttpPost("validate")]
    public async Task<IActionResult> ValidateKey([FromBody] ValidateKeyRequest request)
    {
        var apiKeyRecord = await _apiKeyService.ValidateKeyAsync(request.RawKey);
        if (apiKeyRecord == null)
        {
            return Unauthorized("Invalid or inactive API Key.");
        }

        // Return core properties needed by YARP Gateway
        return Ok(new ApiKeyResponseDto(
            Id: apiKeyRecord.Id,
            UserId: apiKeyRecord.UserId,
            MaskedKey: apiKeyRecord.MaskedKey,
            Description: apiKeyRecord.Description,
            IsActive: apiKeyRecord.IsActive,
            CreatedAt: apiKeyRecord.CreatedAt,
            RateLimitTps: apiKeyRecord.RateLimitTps
        ));
    }
}
