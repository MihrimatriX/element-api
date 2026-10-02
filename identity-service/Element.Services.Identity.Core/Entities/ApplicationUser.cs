using Microsoft.AspNetCore.Identity;

namespace Element.Services.Identity.Core.Entities;

/// <summary>An account: the standard ASP.NET Identity user plus first name, last name and creation time.</summary>
public class ApplicationUser : IdentityUser<Guid>
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
