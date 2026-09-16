using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;

namespace Element.Shared.Extensions;

public static class ProductionConfiguration
{
    public static void ValidateProductionConfiguration(this WebApplicationBuilder builder)
    {
        if (!builder.Environment.IsProduction()) return;
        foreach (var name in new[] { "INTERNAL_API_KEY", "JwtSettings:Secret" })
        {
            var value = builder.Configuration[name];
            // Not every service uses both secrets. Reject known development values
            // when the setting is part of this service's configuration.
            if (value is not null && (value.Length < 32 || value.Contains("ChangeMe", StringComparison.OrdinalIgnoreCase) || value == "element-internal-dev-key"))
                throw new InvalidOperationException($"Configure a production value for {name}; development credentials are not accepted.");
        }
    }
}
