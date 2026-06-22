using System;

namespace Element.Services.Identity.Core.Entities;

public class ApiKey
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string KeyHash { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string MaskedKey { get; set; } = string.Empty; // e.g. "ele_live_abcd...1234"
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
    public int RateLimitTps { get; set; } = 10; // Default limit: 10 requests per second
}
