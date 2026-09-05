using System.Threading.Tasks;
using Element.Services.Identity.Core.DTOs;
using Element.Services.Identity.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace Element.Services.Identity.API.Controllers;

[ApiController]
[Route("api/v1/internal/api-keys")]
public class InternalKeysController : ControllerBase
{
    private readonly IApiKeyService _apiKeyService;
    private readonly IConfiguration _configuration;

    public InternalKeysController(IApiKeyService apiKeyService, IConfiguration configuration)
    {
        _apiKeyService = apiKeyService;
        _configuration = configuration;
    }

    [HttpPost("validate")]
    public async Task<IActionResult> ValidateKey([FromBody] ValidateKeyRequest request)
    {
        var expected = _configuration["INTERNAL_API_KEY"];
        if (string.IsNullOrEmpty(expected) ||
            !Request.Headers.TryGetValue("INTERNAL_API_KEY", out var got) ||
            got != expected)
        {
            return Unauthorized("INTERNAL_API_KEY required.");
        }

        var apiKeyRecord = await _apiKeyService.ValidateKeyAsync(request.RawKey);
        if (apiKeyRecord == null)
        {
            return Unauthorized("Invalid or inactive API Key.");
        }

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
