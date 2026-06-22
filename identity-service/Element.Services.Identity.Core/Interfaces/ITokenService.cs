using Element.Services.Identity.Core.Entities;

namespace Element.Services.Identity.Core.Interfaces;

public interface ITokenService
{
    string GenerateJwtToken(ApplicationUser user);
}
