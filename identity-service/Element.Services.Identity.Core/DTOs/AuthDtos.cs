using System;

namespace Element.Services.Identity.Core.DTOs;

public record RegisterRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName
);

public record LoginRequest(
    string Email,
    string Password
);

public record AuthResponse(
    string Token,
    string Email,
    string FullName
);

public record GenerateKeyRequest(
    string Description,
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
