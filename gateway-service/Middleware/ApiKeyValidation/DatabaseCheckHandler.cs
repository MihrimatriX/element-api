using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace Element.Gateway.Middleware.ApiKeyValidation;

public class DatabaseCheckHandler : ApiKeyValidationHandler
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _identityServiceUrl;

    public DatabaseCheckHandler(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _identityServiceUrl = configuration["IdentityServiceInternalUrl"] ?? "http://localhost:5001";
    }

    public override async Task<bool> HandleAsync(HttpContext context, string apiKey, ApiKeyValidationContext validationContext)
    {
        // If already validated by Redis cache check, bypass database validation
        if (validationContext.IsActive)
        {
            if (NextHandler != null)
            {
                return await NextHandler.HandleAsync(context, apiKey, validationContext);
            }
            return true;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            var response = await client.PostAsJsonAsync($"{_identityServiceUrl}/api/v1/internal/api-keys/validate", new { RawKey = apiKey });

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<IdentityValidationResponse>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (result != null && result.IsActive)
                {
                    validationContext.IsActive = true;
                    validationContext.UserId = result.UserId == Guid.Empty ? result.Id : result.UserId; // Fallback to Id if UserId is empty
                    validationContext.RateLimitTps = result.RateLimitTps;
                }
            }
        }
        catch (Exception ex)
        {
            validationContext.ErrorMessage = $"Identity Service is temporarily unavailable. Error: {ex.Message}";
            validationContext.StatusCode = StatusCodes.Status503ServiceUnavailable;
            return false;
        }

        if (!validationContext.IsActive)
        {
            validationContext.ErrorMessage = "API Key is invalid or inactive.";
            validationContext.StatusCode = StatusCodes.Status401Unauthorized;
            return false;
        }

        if (NextHandler != null)
        {
            return await NextHandler.HandleAsync(context, apiKey, validationContext);
        }

        return true;
    }

    private class IdentityValidationResponse
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public bool IsActive { get; set; }
        public int RateLimitTps { get; set; }
    }
}
