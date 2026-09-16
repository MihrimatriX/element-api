using System;
using System.ComponentModel.DataAnnotations;

namespace Element.Services.Identity.Core.DTOs;

public record RegisterRequest(
    [Required, EmailAddress, MaxLength(254)] string Email,
    [Required, MaxLength(1024)] string Password,
    [Required, MaxLength(100)] string FirstName,
    [Required, MaxLength(100)] string LastName
);

public record LoginRequest(
    [Required, EmailAddress, MaxLength(254)] string Email,
    [Required, MaxLength(1024)] string Password
);

public record AuthResponse(
    string Token,
    [Required, EmailAddress, MaxLength(254)] string Email,
    string FullName
);

public record GenerateKeyRequest(
    [Required, MaxLength(200)] string Description,
    int RateLimitTps = 10
);

public record ApiKeyResponseDto(
    Guid Id,
    Guid UserId,
    string MaskedKey,
    string Description,
    bool IsActive,
    DateTime CreatedAt,
    int RateLimitTps
);

public record ValidateKeyRequest(
    string RawKey
);

public record CreateWebhookRequest(
    string Url,
    string[] Events,
    string Secret
);

public record WebhookResponseDto(
    Guid Id,
    string Url,
    string[] Events,
    DateTime CreatedAt
);
