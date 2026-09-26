using System;

namespace Element.Services.Identity.Core.Entities;

public class WebhookSubscription
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string Secret { get; set; } = string.Empty;
    public string Events { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; } = true;
}
