using System.Security.Claims;

namespace Element.Services.Identity.API;

/// <summary>Reads the signed-in account id from the JWT so every controller identifies the caller the same way.</summary>
internal static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Returns the raw user id claim. ASP.NET maps the JWT "sub" claim to NameIdentifier; "sub" itself is the fallback.
    /// </summary>
    public static string? GetUserIdValue(this ClaimsPrincipal user)
    {
        return user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
    }

    /// <summary>Returns the user id as a Guid, or null when the claim is missing or not a Guid.</summary>
    public static Guid? GetUserId(this ClaimsPrincipal user)
    {
        return Guid.TryParse(user.GetUserIdValue(), out var userId) ? userId : null;
    }
}
