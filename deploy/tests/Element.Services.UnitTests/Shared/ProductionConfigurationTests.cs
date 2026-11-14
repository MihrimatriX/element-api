using Element.Shared.Extensions;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;

namespace Element.Services.UnitTests.Shared;

/// <summary>
/// A service must not start in Production with a secret anyone can read in this repository:
/// the development key, a short value, or the placeholder that ships in docker/.env.public.*.example.
/// </summary>
public class ProductionConfigurationTests
{
    private static WebApplicationBuilder BuilderFor(string environment, string internalApiKey)
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = environment });
        builder.Configuration["INTERNAL_API_KEY"] = internalApiKey;
        return builder;
    }

    [Theory]
    [InlineData("replace-with-at-least-32-characters-key!!")] // the example file's value: long enough, still public
    [InlineData("element-internal-dev-key")]
    [InlineData("ChangeMeInProduction_UseLongRandomSecretKey123!")]
    [InlineData("too-short")]
    public void Production_RefusesSecretsThatArePublicOrWeak(string internalApiKey)
    {
        var builder = BuilderFor(Environments.Production, internalApiKey);

        builder.Invoking(candidate => candidate.ValidateProductionConfiguration())
            .Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Production_AcceptsAGeneratedSecret()
    {
        var builder = BuilderFor(Environments.Production, Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N"));

        builder.Invoking(candidate => candidate.ValidateProductionConfiguration()).Should().NotThrow();
    }

    [Fact]
    public void Development_KeepsWorkingWithTheDevelopmentKey()
    {
        var builder = BuilderFor(Environments.Development, "element-internal-dev-key");

        builder.Invoking(candidate => candidate.ValidateProductionConfiguration()).Should().NotThrow();
    }
}
