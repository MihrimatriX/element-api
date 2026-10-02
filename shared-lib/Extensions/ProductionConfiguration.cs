using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;

namespace Element.Shared.Extensions;

/// <summary>Production safety net: refuses to start with development secrets.</summary>
public static class ProductionConfiguration
{
    private const int MinimumSecretLength = 32;
    private const string PlaceholderMarker = "ChangeMe";

    // Both are public in git history, so they must never guard a production deployment.
    private static readonly string[] KnownDevelopmentSecrets =
        ["element-internal-dev-key", "SuperSecretKeyForElementApiMasterProject2026!"];

    private static readonly string[] GuardedSecretKeys = ["INTERNAL_API_KEY", "JwtSettings:Secret"];

    /// <summary>In Production, throws if any configured shared secret is short, a placeholder or a known development secret.</summary>
    public static void ValidateProductionConfiguration(this WebApplicationBuilder builder)
    {
        if (!builder.Environment.IsProduction())
            return;

        foreach (var secretKey in GuardedSecretKeys)
        {
            var secretValue = builder.Configuration[secretKey];

            // Not every service uses both secrets. Reject known development values
            // when the setting is part of this service's configuration.
            if (secretValue is not null && IsDevelopmentSecret(secretValue))
                throw new InvalidOperationException($"Configure a production value for {secretKey}; development credentials are not accepted.");
        }
    }

    private static bool IsDevelopmentSecret(string secretValue) =>
        secretValue.Length < MinimumSecretLength
        || secretValue.Contains(PlaceholderMarker, StringComparison.OrdinalIgnoreCase)
        || KnownDevelopmentSecrets.Contains(secretValue);
}
