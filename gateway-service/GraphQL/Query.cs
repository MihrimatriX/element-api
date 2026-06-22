using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

namespace Element.Gateway.GraphQL;

public class Query
{
    public async Task<ElementPriceType> GetElementPriceAsync(string symbol, [Service] IHttpClientFactory clientFactory)
    {
        var client = clientFactory.CreateClient("ElementService");
        try
        {
            var response = await client.GetAsync($"/api/v1/elements/{symbol}");
            if (response.IsSuccessStatusCode)
            {
                var doc = await response.Content.ReadFromJsonAsync<JsonElement>();
                if (TryReadPricePerGram(doc, out var price))
                {
                    return new ElementPriceType
                    {
                        Symbol = symbol,
                        PricePerGram = price
                    };
                }
            }
        }
        catch (Exception)
        {
            // ignored for demo
        }

        return new ElementPriceType { Symbol = symbol, PricePerGram = 0 };
    }

    private static bool TryReadPricePerGram(JsonElement doc, out decimal price)
    {
        if (doc.TryGetProperty("pricePerGram", out var root) ||
            doc.TryGetProperty("PricePerGram", out root))
        {
            price = root.GetDecimal();
            return true;
        }

        if ((doc.TryGetProperty("market", out var market) ||
             doc.TryGetProperty("Market", out market)) &&
            (market.TryGetProperty("pricePerGram", out var nested) ||
             market.TryGetProperty("PricePerGram", out nested)))
        {
            price = nested.GetDecimal();
            return true;
        }

        price = 0;
        return false;
    }
}

public class ElementPriceType
{
    public string Symbol { get; set; } = string.Empty;
    public decimal PricePerGram { get; set; }
}
