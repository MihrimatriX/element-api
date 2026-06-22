using System.IdentityModel.Tokens.Jwt;
using Element.Services.Identity.Core.Entities;
using Element.Services.Identity.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;

namespace Element.Services.UnitTests.Identity;

public class TokenServiceTests
{
    [Fact]
    public void GenerateJwtToken_ContainsUserClaims()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JwtSettings:Secret"] = "SuperSecretKeyForTestingPurposesOnly123!",
                ["JwtSettings:Issuer"] = "ElementTest",
                ["JwtSettings:Audience"] = "ElementTestAudience",
                ["JwtSettings:ExpiryMinutes"] = "60"
            })
            .Build();

        var user = new ApplicationUser
        {
            Id = Guid.Parse("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            Email = "test@element.dev",
            UserName = "test@element.dev",
            FirstName = "Ada",
            LastName = "Lovelace"
        };

        var service = new TokenService(config);
        var token = service.GenerateJwtToken(user);

        token.Should().NotBeNullOrWhiteSpace();

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        jwt.Issuer.Should().Be("ElementTest");
        jwt.Audiences.Should().Contain("ElementTestAudience");
        jwt.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Sub && c.Value == user.Id.ToString());
        jwt.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Email && c.Value == user.Email);
        jwt.Claims.Should().Contain(c => c.Type == "firstName" && c.Value == "Ada");
    }
}
