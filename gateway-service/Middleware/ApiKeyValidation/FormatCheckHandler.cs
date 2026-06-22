using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Element.Gateway.Middleware.ApiKeyValidation;

public class FormatCheckHandler : ApiKeyValidationHandler
{
    public override async Task<bool> HandleAsync(HttpContext context, string apiKey, ApiKeyValidationContext validationContext)
    {
        if (!apiKey.StartsWith("ele_live_") || apiKey.Length != 41)
        {
            validationContext.ErrorMessage = "API Key format is invalid. It should start with 'ele_live_' followed by 32 characters.";
            validationContext.StatusCode = StatusCodes.Status400BadRequest;
            return false;
        }

        if (NextHandler != null)
        {
            return await NextHandler.HandleAsync(context, apiKey, validationContext);
        }

        return true;
    }
}
