using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Element.Gateway.Middleware.ApiKeyValidation;

public class HeaderCheckHandler : ApiKeyValidationHandler
{
    public override async Task<bool> HandleAsync(HttpContext context, string apiKey, ApiKeyValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            validationContext.ErrorMessage = "API Key is missing. Please provide it in the 'X-API-Key' header.";
            validationContext.StatusCode = StatusCodes.Status401Unauthorized;
            return false;
        }

        if (NextHandler != null)
        {
            return await NextHandler.HandleAsync(context, apiKey, validationContext);
        }

        return true;
    }
}
