using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Element.Services.Element.API.DTOs;
using Element.Services.Element.Core.Abstractions;
using Element.Services.Element.Core.Domain;
using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using StackExchange.Redis;

namespace Element.Services.Element.API.Controllers;

/// <summary>
/// Chemical elements: catalogue listing, filtering, search, comparison, periodic
/// neighbours and price history. Data access goes through <see cref="IElementRepository"/>;
/// all ranking/aggregation is delegated to the <see cref="ElementAnalytics"/> domain service.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class ElementsController : ControllerBase
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    private readonly IElementRepository _repository;
    private readonly IDatabase _redisDb;
    private readonly MarketOptions _market;

    public ElementsController(
        IElementRepository repository,
        IConnectionMultiplexer redisMultiplexer,
        IOptions<MarketOptions> market)
    {
        _repository = repository;
        _redisDb = redisMultiplexer.GetDatabase();
        _market = market.Value;
    }

    private string GetBaseUrl() => PublicBaseUrl.Resolve(Request);

    private ElementResponseDto MapToDto(ChemicalElement element) => ElementDtoMapper.ToDto(element, GetBaseUrl());

    private async Task<T?> TryCacheAsync<T>(string key) where T : class
    {
        try
        {
            var cached = await _redisDb.StringGetAsync(key);
            if (cached.HasValue) return JsonSerializer.Deserialize<T>(cached!);
        }
        catch { /* cache is best-effort */ }
        return null;
    }

    private async Task SetCacheAsync<T>(string key, T value)
    {
        try
        {
            await _redisDb.StringSetAsync(key, JsonSerializer.Serialize(value), CacheTtl);
            await CatalogCache.TrackListKeyAsync(_redisDb, key);
        }
        catch { /* cache is best-effort */ }
    }

    private PaginatedResponse<ElementResponseDto> Paginate(
        IReadOnlyList<ChemicalElement> source, int page, int pageSize, string pathAndFixedQuery)
    {
        var totalCount = source.Count;
        var totalPages = Math.Max(1, (int)Math.Ceiling((double)totalCount / pageSize));
        var slice = source.Skip((page - 1) * pageSize).Take(pageSize).Select(MapToDto).ToList();
        var baseUrl = GetBaseUrl();

        return new PaginatedResponse<ElementResponseDto>
        {
            Info = new PaginationInfo
            {
                Count = totalCount,
                Pages = totalPages,
                Next = page < totalPages ? $"{baseUrl}{pathAndFixedQuery}&page={page + 1}&pageSize={pageSize}" : null,
                Prev = page > 1 ? $"{baseUrl}{pathAndFixedQuery}&page={page - 1}&pageSize={pageSize}" : null
            },
            Results = slice
        };
    }

    /// <summary>
    /// Lists chemical elements with optional filtering and sorting. All query
    /// parameters are optional; with none supplied the full catalogue is returned
    /// ordered by atomic number.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PaginatedResponse<ElementResponseDto>), 200)]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? category = null,
        [FromQuery] string? block = null,
        [FromQuery] string? phase = null,
        [FromQuery] int? group = null,
        [FromQuery] int? period = null,
        [FromQuery] decimal? minPrice = null,
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] bool? inStock = null,
        [FromQuery] string? sort = null,
        [FromQuery] string? order = null,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize is < 1 or > 100) pageSize = pageSize < 1 ? 20 : 100;

        var descending = string.Equals(order, "desc", StringComparison.OrdinalIgnoreCase);
        var filter = new ElementFilter
        {
            Category = category,
            Block = block,
            Phase = phase,
            Group = group,
            Period = period,
            MinPrice = minPrice,
            MaxPrice = maxPrice,
            InStockOnly = inStock,
            Sort = ElementFilter.ParseSort(sort),
            Descending = descending
        };

        var cacheKey = $"elements:list:{category}:{block}:{phase}:{group}:{period}:{minPrice}:{maxPrice}:{inStock}:{sort}:{order}:p{page}:s{pageSize}";
        var cached = await TryCacheAsync<PaginatedResponse<ElementResponseDto>>(cacheKey);
        if (cached != null) return Ok(cached);

        var all = await _repository.GetAllAsync(ct);
        var filtered = ElementAnalytics.Query(all, filter);

        var fixedQuery = $"/api/v1/elements?sort={sort}&order={order}&category={Uri.EscapeDataString(category ?? "")}";
        var response = Paginate(filtered, page, pageSize, fixedQuery);

        await SetCacheAsync(cacheKey, response);
        return Ok(response);
    }

    /// <summary>Searches elements by name, Turkish name, symbol or atomic number.</summary>
    [HttpGet("search")]
    [ProducesResponseType(typeof(PaginatedResponse<ElementResponseDto>), 200)]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q)) return BadRequest("Search query 'q' is required.");
        if (page < 1) page = 1;
        if (pageSize is < 1 or > 100) pageSize = pageSize < 1 ? 20 : 100;

        var all = await _repository.GetAllAsync(ct);
        var matched = ElementAnalytics.Query(all, new ElementFilter { Search = q });

        var fixedQuery = $"/api/v1/elements/search?q={Uri.EscapeDataString(q)}";
        return Ok(Paginate(matched, page, pageSize, fixedQuery));
    }

    /// <summary>Retrieves a specific element by symbol (e.g. 'Au').</summary>
    [HttpGet("{symbol}")]
    [ProducesResponseType(typeof(ElementResponseDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetBySymbol(string symbol, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(symbol)) return BadRequest("Symbol is required.");

        var cacheKey = $"element:dto:{symbol.ToLower()}";
        var cached = await TryCacheAsync<ElementResponseDto>(cacheKey);
        if (cached != null) return Ok(cached);

        var element = await _repository.GetBySymbolAsync(symbol, ct);
        if (element == null) return NotFound($"Chemical element with symbol '{symbol}' was not found.");

        var dto = MapToDto(element);
        await SetCacheAsync(cacheKey, dto);
        return Ok(dto);
    }

    /// <summary>Returns a random element from the periodic table.</summary>
    [HttpGet("random")]
    [ProducesResponseType(typeof(ElementResponseDto), 200)]
    public async Task<IActionResult> GetRandom(CancellationToken ct = default)
    {
        var all = await _repository.GetAllAsync(ct);
        if (all.Count == 0) return NotFound("No elements found.");
        var element = all[Random.Shared.Next(all.Count)];
        return Ok(MapToDto(element));
    }

    /// <summary>
    /// Compares two or more elements side by side and reports per-metric winners
    /// (cheapest, most expensive, heaviest, lightest, highest melting, densest).
    /// </summary>
    [HttpGet("compare")]
    [ProducesResponseType(typeof(ElementComparisonResponseDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Compare([FromQuery] string symbols, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(symbols)) return BadRequest("Provide 'symbols' as a comma-separated list, e.g. ?symbols=au,ag,cu.");

        var wanted = symbols.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (wanted.Length < 2) return BadRequest("Comparison needs at least two symbols.");
        if (wanted.Length > 6) return BadRequest("Comparison supports at most six symbols.");

        var found = await _repository.GetBySymbolsAsync(wanted, ct);
        if (found.Count == 0) return NotFound("None of the requested symbols were found.");

        // Preserve the caller's requested order.
        var ordered = wanted
            .Select(w => found.FirstOrDefault(e => string.Equals(e.Symbol, w, StringComparison.OrdinalIgnoreCase)))
            .Where(e => e != null)
            .Select(e => e!)
            .ToList();

        return Ok(new ElementComparisonResponseDto
        {
            Elements = ordered.Select(MapToDto).ToList(),
            Comparison = ElementAnalytics.Compare(ordered)
        });
    }

    /// <summary>Returns the direct periodic-table neighbours of an element.</summary>
    [HttpGet("{symbol}/neighbors")]
    [ProducesResponseType(typeof(IEnumerable<ElementResponseDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetNeighbors(string symbol, CancellationToken ct = default)
    {
        var element = await _repository.GetBySymbolAsync(symbol, ct);
        if (element == null) return NotFound($"Chemical element with symbol '{symbol}' was not found.");

        var all = await _repository.GetAllAsync(ct);
        var neighbors = ElementAnalytics.Neighbors(all, element).Select(MapToDto).ToList();
        return Ok(neighbors);
    }

    /// <summary>Returns same-category elements closest by atomic number.</summary>
    [HttpGet("{symbol}/related")]
    [ProducesResponseType(typeof(IEnumerable<ElementResponseDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetRelated(string symbol, [FromQuery] int limit = 6, CancellationToken ct = default)
    {
        if (limit is < 1 or > 20) limit = 6;

        var element = await _repository.GetBySymbolAsync(symbol, ct);
        if (element == null) return NotFound($"Chemical element with symbol '{symbol}' was not found.");

        var all = await _repository.GetAllAsync(ct);
        var related = ElementAnalytics.Related(all, element, limit).Select(MapToDto).ToList();
        return Ok(related);
    }

    /// <summary>Retrieves the price history for an element (API key required at the gateway).</summary>
    [HttpGet("{symbol}/history")]
    [ProducesResponseType(typeof(IEnumerable<ElementPriceHistory>), 200)]
    public async Task<IActionResult> GetPriceHistory(string symbol, [FromQuery] int limit = 20, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(symbol)) return BadRequest("Symbol is required.");
        if (limit is < 1 or > 365) limit = 20;

        var history = await _repository.GetPriceHistoryAsync(symbol, limit, ct);
        return Ok(history);
    }

    /// <summary>Public ticker: last / bid / ask derived from house spread. No API key at the gateway.</summary>
    [HttpGet("{symbol}/ticker")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetTicker(string symbol, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(symbol)) return BadRequest("Symbol is required.");

        var element = await _repository.GetBySymbolAsync(symbol, ct);
        if (element == null) return NotFound($"Chemical element with symbol '{symbol}' was not found.");

        var spread = _market.SpreadPct > 0 ? _market.SpreadPct : MarketMaker.DefaultSpreadPct;
        var last = element.PricePerGram;
        var (bid, ask) = MarketMaker.Quotes(last, spread);
        var cutoff = DateTime.UtcNow.AddHours(-24);
        var since = await _repository.GetPriceHistorySinceAsync(symbol, cutoff, ct);
        var spark = (await _repository.GetPriceHistoryAsync(symbol, 24, ct))
            .Reverse()
            .Select(h => new { t = h.Timestamp, price = h.Price })
            .ToList();

        decimal? first24 = since.Count > 0 ? since[0].Price : null;
        var high = since.Count > 0 ? since.Max(h => h.Price) : last;
        var low = since.Count > 0 ? since.Min(h => h.Price) : last;
        if (last > high) high = last;
        if (last < low) low = last;

        var volume = await _repository.GetFulfilledVolumeSinceAsync(symbol, cutoff, ct);

        return Ok(new
        {
            symbol = element.Symbol,
            last,
            bid,
            ask,
            spreadPct = spread,
            change24hPct = MarketMaker.ChangePct(last, first24),
            high24h = high,
            low24h = low,
            volume24hGrams = volume,
            sparkline = spark,
            availableStock = element.AvailableStock,
            currency = "KREDI",
            priceSource = "simulation",
            updatedAt = DateTime.UtcNow
        });
    }
}
