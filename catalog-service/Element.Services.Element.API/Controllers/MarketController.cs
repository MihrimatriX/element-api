using Element.Services.Element.Core.Domain;
using Element.Services.Element.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Element.Services.Element.API.Controllers;

/// <summary>
/// Market-wide views of the simulated KREDI prices: one row per element with last, bid/ask
/// and 24h change, so the web app can draw the ticker tape and heatmap in a single call.
/// </summary>
[ApiController]
[Route("api/v1/market")]
[ResponseCache(Duration = 5)]
public class MarketController : ControllerBase
{
    private const int DefaultMoversLimit = 12;
    private const int MaxMoversLimit = 50;
    private const int ChangeWindowHours = 24;

    private readonly EfElementRepository _repository;
    private readonly MarketOptions _market;
    private readonly IMemoryCache _cache;

    public MarketController(EfElementRepository repository, IOptions<MarketOptions> market, IMemoryCache cache)
    {
        _repository = repository;
        _market = market.Value;
        _cache = cache;
    }

    /// <summary>Top absolute 24h movers for the ticker tape.</summary>
    [HttpGet("movers")]
    public async Task<IActionResult> Movers([FromQuery] int limit = DefaultMoversLimit, CancellationToken ct = default)
    {
        if (limit is < 1 or > MaxMoversLimit)
        {
            limit = DefaultMoversLimit;
        }

        var board = await BuildBoardAsync(ct);
        var movers = board
            .Where(row => row.Change24hPct != null)
            .OrderByDescending(row => Math.Abs(row.Change24hPct!.Value))
            .Take(limit)
            .ToList();
        return Ok(movers);
    }

    /// <summary>Last + 24h Δ for every element (periodic heatmap). One call, not 118 tickers.</summary>
    [HttpGet("board")]
    public async Task<IActionResult> Board(CancellationToken ct = default)
    {
        var board = await BuildBoardAsync(ct);
        return Ok(board);
    }

    // Same for every caller and polled by every open tab: one build (118 index seeks) per snapshot TTL.
    private async Task<List<BoardRow>> BuildBoardAsync(CancellationToken ct) =>
        (await _cache.GetOrCreateAsync("market:board", entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = EfElementRepository.SnapshotTtl;
            return ComputeBoardAsync(ct);
        }))!;

    private async Task<List<BoardRow>> ComputeBoardAsync(CancellationToken ct)
    {
        var spread = _market.EffectiveSpreadPct;
        var windowStart = DateTime.UtcNow.AddHours(-ChangeWindowHours);
        var elements = await _repository.GetAllAsync(ct);
        var openPrices = await _repository.GetOldestPriceSinceAsync(windowStart, ct);

        return elements
            .Select(element =>
            {
                decimal? openPrice = openPrices.TryGetValue(element.Symbol, out var price) ? price : null;
                var (bid, ask) = MarketMaker.Quotes(element.PricePerGram, spread);

                return new BoardRow(
                    element.Symbol,
                    element.PricePerGram,
                    MarketMaker.ChangePct(element.PricePerGram, openPrice),
                    bid,
                    ask,
                    element.AvailableStock,
                    MarketMaker.Currency,
                    MarketMaker.SimulatedPriceSource,
                    DateTime.UtcNow);
            })
            .ToList();
    }

    /// <summary>One element's market snapshot on the board.</summary>
    public record BoardRow(
        string Symbol,
        decimal Last,
        decimal? Change24hPct,
        decimal Bid,
        decimal Ask,
        decimal AvailableStock,
        string Currency,
        string PriceSource,
        DateTime UpdatedAt);
}
