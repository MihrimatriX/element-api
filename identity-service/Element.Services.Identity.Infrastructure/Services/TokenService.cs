using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Element.Services.Identity.Core.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Element.Services.Identity.Infrastructure.Services;

/// <summary>Creates the signed JWT returned at sign-in; Program.cs validates incoming tokens with the same JwtSettings.</summary>
public class TokenService
{
    /// <summary>Claim that carries the user's security stamp; a token whose stamp is out of date is rejected.</summary>
    public const string SecurityStampClaimType = "security_stamp";

    /// <summary>Issuer used when JwtSettings:Issuer is not configured.</summary>
    public const string DefaultIssuer = "ElementGateway";

    /// <summary>Audience used when JwtSettings:Audience is not configured.</summary>
    public const string DefaultAudience = "ElementMicroservices";

    private const string DefaultExpiryMinutes = "60";

    private readonly IConfiguration _configuration;

    /// <summary>Creates the service; JWT settings are read on every call so configuration changes apply immediately.</summary>
    public TokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    /// <summary>Builds an HMAC-SHA256 signed JWT with the user's id, e-mail, names and security stamp.</summary>
    public string GenerateJwtToken(ApplicationUser user)
    {
        var secretKey = _configuration["JwtSettings:Secret"]
            ?? throw new InvalidOperationException("JWT Secret key not configured.");
        var issuer = _configuration["JwtSettings:Issuer"] ?? DefaultIssuer;
        var audience = _configuration["JwtSettings:Audience"] ?? DefaultAudience;
        var expiryMinutes = double.Parse(_configuration["JwtSettings:ExpiryMinutes"] ?? DefaultExpiryMinutes);

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var signingCredentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(SecurityStampClaimType, user.SecurityStamp ?? string.Empty),
            new("firstName", user.FirstName),
            new("lastName", user.LastName),
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: signingCredentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
