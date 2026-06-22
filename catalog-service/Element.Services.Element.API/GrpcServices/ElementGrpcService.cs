using System;
using System.Text.Json;
using System.Threading.Tasks;
using Grpc.Core;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace Element.Services.Element.API.Grpc;

public class ElementGrpcService : ElementGrpc.ElementGrpcBase
{
    private readonly IDatabase _redisDb;
    private readonly ILogger<ElementGrpcService> _logger;

    public ElementGrpcService(IConnectionMultiplexer redisMultiplexer, ILogger<ElementGrpcService> logger)
    {
        _redisDb = redisMultiplexer.GetDatabase();
        _logger = logger;
    }

    public override async Task<ElementPriceResponse> GetElementPrice(ElementPriceRequest request, ServerCallContext context)
    {
        var cacheKey = $"element:{request.Symbol.ToLower()}";
        
        try
        {
            var cachedData = await _redisDb.StringGetAsync(cacheKey);
            if (cachedData.HasValue)
            {
                using var doc = JsonDocument.Parse((string)cachedData!);
                if (doc.RootElement.TryGetProperty("pricePerGram", out var priceProp) ||
                    doc.RootElement.TryGetProperty("PricePerGram", out priceProp))
                {
                    return new ElementPriceResponse
                    {
                        Symbol = request.Symbol,
                        PricePerGram = (double)priceProp.GetDecimal(),
                        IsSuccess = true,
                        ErrorMessage = string.Empty
                    };
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis error while fetching price for {Symbol} via gRPC", request.Symbol);
        }

        return new ElementPriceResponse
        {
            Symbol = request.Symbol,
            PricePerGram = 0,
            IsSuccess = false,
            ErrorMessage = "Price not found in cache or service unavailable"
        };
    }
}
