using System.Security.Cryptography;
using System.Text;

namespace Element.Services.Identity.API;

/// <summary>Guards the service-to-service endpoints: callers must send the shared INTERNAL_API_KEY header.</summary>
internal static class InternalApiKey
{
    /// <summary>Name of both the request header and the configuration key that hold the shared secret.</summary>
    public const string HeaderName = "INTERNAL_API_KEY";

    /// <summary>
    /// True only when a key is configured and the request header carries exactly that key.
    /// Compared in constant time; an empty configuration never matches.
    /// </summary>
    public static bool IsAuthorized(HttpRequest request, IConfiguration configuration)
    {
        var expectedKey = configuration[HeaderName];
        if (string.IsNullOrEmpty(expectedKey))
        {
            return false;
        }

        return request.Headers.TryGetValue(HeaderName, out var providedKey)
            && CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(providedKey.ToString()),
                Encoding.UTF8.GetBytes(expectedKey));
    }
}
