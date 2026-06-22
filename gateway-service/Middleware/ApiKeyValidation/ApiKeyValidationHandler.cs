using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Element.Gateway.Middleware.ApiKeyValidation;

public abstract class ApiKeyValidationHandler
{
    protected ApiKeyValidationHandler? NextHandler;

    public ApiKeyValidationHandler SetNext(ApiKeyValidationHandler nextHandler)
    {
        NextHandler = nextHandler;
        return nextHandler;
    }

    public abstract Task<bool> HandleAsync(HttpContext context, string apiKey, ApiKeyValidationContext validationContext);
}
