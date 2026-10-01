using System.ComponentModel.DataAnnotations;
using Element.Services.Identity.Core.Entities;

namespace Element.Services.Identity.Core.DTOs;

/// <summary>Body of POST /api/v1/auth/register.</summary>
/// <param name="CaptchaToken">Turnstile token when CAPTCHA_SECRET_KEY is set; ignored when captcha is off.</param>
public record RegisterRequest(
    [Required, EmailAddress, MaxLength(254)] string Email,
    [Required, MaxLength(1024)] string Password,
    [Required, MaxLength(100)] string FirstName,
    [Required, MaxLength(100)] string LastName,
    [MaxLength(2048)] string? CaptchaToken = null
);

/// <summary>Body of POST /api/v1/auth/login.</summary>
public record LoginRequest(
    [Required, EmailAddress, MaxLength(254)] string Email,
    [Required, MaxLength(1024)] string Password,
    [MaxLength(2048)] string? CaptchaToken = null
);

/// <summary>Successful sign-in: the JWT plus the user's e-mail and full name.</summary>
public record AuthResponse(
    string Token,
    [Required, EmailAddress, MaxLength(254)] string Email,
    string FullName
);

/// <summary>Body of POST /api/v1/api-keys/generate. The rate limit is clamped to 1-10 requests per second.</summary>
public record GenerateKeyRequest(
    [Required, MaxLength(200)] string Description,
    int RateLimitTps = 10
);

/// <summary>Public view of a stored API key; it never contains the raw key or its hash.</summary>
public record ApiKeyResponseDto(
    Guid Id,
    Guid UserId,
    string MaskedKey,
    string Description,
    bool IsActive,
    DateTime CreatedAt,
    int RateLimitTps
)
{
    /// <summary>Builds the public view of a stored key.</summary>
    public static ApiKeyResponseDto FromEntity(ApiKey apiKey) => new(
        Id: apiKey.Id,
        UserId: apiKey.UserId,
        MaskedKey: apiKey.MaskedKey,
        Description: apiKey.Description,
        IsActive: apiKey.IsActive,
        CreatedAt: apiKey.CreatedAt,
        RateLimitTps: apiKey.RateLimitTps);
}

/// <summary>Body of the internal POST /api/v1/internal/api-keys/validate call made by the gateway.</summary>
public record ValidateKeyRequest(
    string RawKey
);

/// <summary>Body of POST /api/v1/webhooks. Bounds mirror the WebhookSubscriptions columns (oversize used to surface as a 500 from Postgres).</summary>
public record CreateWebhookRequest(
    [MaxLength(2048)] string Url,
    [MaxLength(10)] string[] Events,
    [MaxLength(256)] string Secret
);

/// <summary>Public view of a webhook subscription; the signing secret is never returned.</summary>
public record WebhookResponseDto(
    Guid Id,
    string Url,
    string[] Events,
    DateTime CreatedAt
);
