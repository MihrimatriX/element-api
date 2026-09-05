using Element.Services.Element.Core.Abstractions;
using Element.Services.Element.Core.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Element.Services.Element.API.Controllers;

[ApiController]
[Route("api/v1/market")]
public class MarketController : ControllerBase
{
    private readonly IElementRepository _repository;
    private readonly MarketOptions _market;

    public MarketController(IElementRepository repository, IOptions<MarketOptions> market)
    {
        _repository = repository;
        _market = market.Value;
    }

    /// <summary>Top absolute 24h movers for the ticker tape.</summary>
    [HttpGet("movers")]
    public async Task<IActionResult> Movers([FromQuery] int limit = 12, CancellationToken ct = default)
    {
        if (limit is < 1 or > 50) limit = 12;
        var board = await BuildBoardAsync(ct);
        var movers = board
            .Where(x => x.Change24hPct != null)
            .OrderByDescending(x => Math.Abs(x.Change24hPct!.Value))
            .Take(limit)
            .ToList();
        return Ok(movers);
    }

    /// <summary>Last + 24h Δ for every element (periodic heatmap). One call, not 118 tickers.</summary>
    [HttpGet("board")]
    public async Task<IActionResult> Board(CancellationToken ct = default)
    {
        return Ok(await BuildBoardAsync(ct));
    }

    private async Task<List<BoardRow>> BuildBoardAsync(CancellationToken ct)
    {
        var spread = _market.SpreadPct > 0 ? _market.SpreadPct : MarketMaker.DefaultSpreadPct;
        var cutoff = DateTime.UtcNow.AddHours(-24);
        var elements = await _repository.GetAllAsync(ct);
        var firsts = await _repository.GetOldestPriceSinceAsync(cutoff, ct);
        return elements.Select(e =>
        {
            firsts.TryGetValue(e.Symbol, out var first);
            var (bid, ask) = MarketMaker.Quotes(e.PricePerGram, spread);
            return new BoardRow(
                e.Symbol,
                e.PricePerGram,
                MarketMaker.ChangePct(e.PricePerGram, firsts.ContainsKey(e.Symbol) ? first : null),
                bid,
                ask,
                e.AvailableStock,
                "KREDI",
                "simulation",
                DateTime.UtcNow
            );
        }).ToList();
    }

    public record BoardRow(string Symbol, decimal Last, decimal? Change24hPct, decimal Bid, decimal Ask,
        decimal AvailableStock, string Currency, string PriceSource, DateTime UpdatedAt);
}
