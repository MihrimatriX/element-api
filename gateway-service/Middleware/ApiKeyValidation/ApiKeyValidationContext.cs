using System;

namespace Element.Gateway.Middleware.ApiKeyValidation;

public class ApiKeyValidationContext
{
    public Guid UserId { get; set; }
    public int RateLimitTps { get; set; } = 10;
    public bool IsActive { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;
    public int StatusCode { get; set; } = 200;
}
