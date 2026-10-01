using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Element.Services.Identity.Core.DTOs;
using Element.Services.Identity.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace Element.Services.Identity.API.Controllers;

[ApiController]
[Route("api/v1/internal/api-keys")]
public class InternalKeysController : ControllerBase
{
    private readonly ApiKeyService _apiKeyService;
    private readonly IConfiguration _configuration;

    public InternalKeysController(ApiKeyService apiKeyService, IConfiguration configuration)
    {
        _apiKeyService = apiKeyService;
        _configuration = configuration;
    }

    [HttpPost("validate")]
    public async Task<IActionResult> ValidateKey([FromBody] ValidateKeyRequest request)
    {
        if (!InternalKey.Matches(Request, _configuration))
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

internal static class InternalKey
{
    /// <summary>Constant-time check of the service-to-service header; empty config never matches.</summary>
    public static bool Matches(HttpRequest request, IConfiguration configuration)
    {
        var expected = configuration["INTERNAL_API_KEY"];
        return !string.IsNullOrEmpty(expected)
            && request.Headers.TryGetValue("INTERNAL_API_KEY", out var got)
            && CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(got.ToString()), Encoding.UTF8.GetBytes(expected));
    }
}
