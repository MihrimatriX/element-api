using Element.Services.Element.API.DTOs;
using Element.Services.Element.Core.Domain;
using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Element.Services.Element.API.Controllers;

/// <summary>
/// Chemical elements: catalogue listing, filtering, search, comparison, periodic
/// neighbours and price history. Data access goes through <see cref="EfElementRepository"/>;
/// all ranking/aggregation is delegated to the <see cref="ElementAnalytics"/> domain service.
/// Responses carry live prices (15 s tick): shared caches may keep them 5 s.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
[ResponseCache(Duration = 5)]
public class ElementsController : ControllerBase
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;
    private const int MaxSearchLength = 120;
    private const int MinCompareSymbols = 2;
    private const int MaxCompareSymbols = 6;
    private const int DefaultRelatedLimit = 6;
    private const int MaxRelatedLimit = 20;
    private const int DefaultHistoryLimit = 20;
    private const int MaxHistoryLimit = 365;
    private const int TickerWindowHours = 24;
    private const int SparklinePoints = 24;

    private readonly EfElementRepository _repository;
    private readonly MarketOptions _market;

    public ElementsController(EfElementRepository repository, IOptions<MarketOptions> market)
    {
        _repository = repository;
        _market = market.Value;
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
        [FromQuery] int pageSize = DefaultPageSize,
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
            Descending = string.Equals(order, "desc", StringComparison.OrdinalIgnoreCase)
        };

        var allElements = await _repository.GetAllAsync(ct);
        var matchingElements = ElementAnalytics.Query(allElements, filter);

        return Ok(Paginate(matchingElements, NormalizePage(page), NormalizePageSize(pageSize), "/api/v1/elements"));
    }

    /// <summary>Searches elements by name, Turkish name, symbol or atomic number.</summary>
    [HttpGet("search")]
    [ProducesResponseType(typeof(PaginatedResponse<ElementResponseDto>), 200)]
    public async Task<IActionResult> Search(
        [FromQuery] string q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = DefaultPageSize,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return BadRequest("Search query 'q' is required.");
        }

        if (q.Length > MaxSearchLength)
        {
            return BadRequest("Search query 'q' must not exceed 120 characters.");
        }

        var allElements = await _repository.GetAllAsync(ct);
        var matchingElements = ElementAnalytics.Query(allElements, new ElementFilter { Search = q });

        return Ok(Paginate(matchingElements, NormalizePage(page), NormalizePageSize(pageSize), "/api/v1/elements/search"));
    }

    /// <summary>Retrieves a specific element by symbol (e.g. 'Au').</summary>
    [HttpGet("{symbol}")]
    [ProducesResponseType(typeof(ElementResponseDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetBySymbol(string symbol, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            return BadRequest("Symbol is required.");
        }

        var element = await _repository.GetBySymbolAsync(symbol, ct);
        if (element is null)
        {
            return ElementNotFound(symbol);
        }

        return Ok(MapToDto(element));
    }

    /// <summary>Returns a random element from the periodic table.</summary>
    [HttpGet("random")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [ProducesResponseType(typeof(ElementResponseDto), 200)]
    public async Task<IActionResult> GetRandom(CancellationToken ct = default)
    {
        var allElements = await _repository.GetAllAsync(ct);
        if (allElements.Count == 0)
        {
            return NotFound("No elements found.");
        }

        var randomElement = allElements[Random.Shared.Next(allElements.Count)];
        return Ok(MapToDto(randomElement));
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
        if (string.IsNullOrWhiteSpace(symbols))
        {
            return BadRequest("Provide 'symbols' as a comma-separated list, e.g. ?symbols=au,ag,cu.");
        }

        var requestedSymbols = symbols.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (requestedSymbols.Length < MinCompareSymbols)
        {
            return BadRequest("Comparison needs at least two symbols.");
        }

        if (requestedSymbols.Length > MaxCompareSymbols)
        {
            return BadRequest("Comparison supports at most six symbols.");
        }

        var foundElements = await _repository.GetBySymbolsAsync(requestedSymbols, ct);
        if (foundElements.Count == 0)
        {
            return NotFound("None of the requested symbols were found.");
        }

        // Preserve the caller's requested order; unknown symbols are dropped.
        var orderedElements = requestedSymbols
            .Select(symbol => foundElements.FirstOrDefault(element =>
                string.Equals(element.Symbol, symbol, StringComparison.OrdinalIgnoreCase)))
            .OfType<ChemicalElement>()
            .ToList();

        return Ok(new ElementComparisonResponseDto
        {
            Elements = orderedElements.Select(MapToDto).ToList(),
            Comparison = ElementAnalytics.Compare(orderedElements)
        });
    }

    /// <summary>Returns the direct periodic-table neighbours of an element.</summary>
    [HttpGet("{symbol}/neighbors")]
    [ProducesResponseType(typeof(IEnumerable<ElementResponseDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetNeighbors(string symbol, CancellationToken ct = default)
    {
        var element = await _repository.GetBySymbolAsync(symbol, ct);
        if (element is null)
        {
            return ElementNotFound(symbol);
        }

        var allElements = await _repository.GetAllAsync(ct);
        var neighbors = ElementAnalytics.Neighbors(allElements, element)
            .Select(MapToDto)
            .ToList();
        return Ok(neighbors);
    }

    /// <summary>Returns same-category elements closest by atomic number.</summary>
    [HttpGet("{symbol}/related")]
    [ProducesResponseType(typeof(IEnumerable<ElementResponseDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetRelated(string symbol, [FromQuery] int limit = DefaultRelatedLimit, CancellationToken ct = default)
    {
        if (limit is < 1 or > MaxRelatedLimit)
        {
            limit = DefaultRelatedLimit;
        }

        var element = await _repository.GetBySymbolAsync(symbol, ct);
        if (element is null)
        {
            return ElementNotFound(symbol);
        }

        var allElements = await _repository.GetAllAsync(ct);
        var related = ElementAnalytics.Related(allElements, element, limit)
            .Select(MapToDto)
            .ToList();
        return Ok(related);
    }

    /// <summary>Retrieves the price history for an element (API key required at the gateway).</summary>
    [HttpGet("{symbol}/history")]
    [ResponseCache(Duration = 5, Location = ResponseCacheLocation.Client)] // key-gated: never from a shared cache
    [ProducesResponseType(typeof(IEnumerable<ElementPriceHistory>), 200)]
    public async Task<IActionResult> GetPriceHistory(string symbol, [FromQuery] int limit = DefaultHistoryLimit, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            return BadRequest("Symbol is required.");
        }

        if (limit is < 1 or > MaxHistoryLimit)
        {
            limit = DefaultHistoryLimit;
        }

        var history = await _repository.GetPriceHistoryAsync(symbol, limit, ct);
        return Ok(history);
    }

    /// <summary>Public ticker: last / bid / ask derived from house spread. No API key at the gateway.</summary>
    [HttpGet("{symbol}/ticker")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetTicker(string symbol, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            return BadRequest("Symbol is required.");
        }

        var element = await _repository.GetBySymbolAsync(symbol, ct);
        if (element is null)
        {
            return ElementNotFound(symbol);
        }

        var spread = _market.EffectiveSpreadPct;
        var lastPrice = element.PricePerGram;
        var (bid, ask) = MarketMaker.Quotes(lastPrice, spread);

        var windowStart = DateTime.UtcNow.AddHours(-TickerWindowHours);
        // Open/high/low are aggregated in SQL; the open is the oldest price in the window.
        var (windowOpenPrice, windowHigh, windowLow) = await _repository.GetPriceRangeSinceAsync(symbol, windowStart, ct);
        var newestPrices = await _repository.GetPriceHistoryAsync(symbol, SparklinePoints, ct);
        var sparkline = newestPrices
            .Reverse()
            .Select(point => new { t = point.Timestamp, price = point.Price })
            .ToList();

        // The current last price always counts, even when the window has no history.
        var high = Math.Max(windowHigh ?? lastPrice, lastPrice);
        var low = Math.Min(windowLow ?? lastPrice, lastPrice);

        var volume = await _repository.GetFulfilledVolumeSinceAsync(symbol, windowStart, ct);

        return Ok(new
        {
            symbol = element.Symbol,
            last = lastPrice,
            bid,
            ask,
            spreadPct = spread,
            change24hPct = MarketMaker.ChangePct(lastPrice, windowOpenPrice),
            high24h = high,
            low24h = low,
            volume24hGrams = volume,
            sparkline,
            availableStock = element.AvailableStock,
            currency = MarketMaker.Currency,
            priceSource = MarketMaker.SimulatedPriceSource,
            updatedAt = DateTime.UtcNow
        });
    }

    private string GetBaseUrl() => PublicBaseUrl.Resolve(Request);

    private ElementResponseDto MapToDto(ChemicalElement element) => ElementDtoMapper.ToDto(element, GetBaseUrl());

    private NotFoundObjectResult ElementNotFound(string symbol) =>
        NotFound($"Chemical element with symbol '{symbol}' was not found.");

    private static int NormalizePage(int page) => page < 1 ? 1 : page;

    /// <summary>Non-positive sizes fall back to the default; sizes above the maximum are capped.</summary>
    private static int NormalizePageSize(int pageSize)
    {
        if (pageSize < 1)
        {
            return DefaultPageSize;
        }

        return Math.Min(pageSize, MaxPageSize);
    }

    /// <summary>
    /// Slices one page out of an in-memory list and builds next/prev links for it. The links echo every
    /// other query parameter the caller sent (escaped), so filters and sort survive paging.
    /// </summary>
    private PaginatedResponse<ElementResponseDto> Paginate(
        IReadOnlyList<ChemicalElement> source,
        int page,
        int pageSize,
        string path)
    {
        var totalCount = source.Count;
        var totalPages = Math.Max(1, (int)Math.Ceiling((double)totalCount / pageSize));
        var pageItems = source
            // long math: (page - 1) * pageSize overflows for huge page values.
            .Skip((int)Math.Min((long)(page - 1) * pageSize, int.MaxValue))
            .Take(pageSize)
            .Select(MapToDto)
            .ToList();

        var linkPrefix = GetBaseUrl() + path;
        // Query keys are case-insensitive, so "Page"/"PAGESIZE" are dropped too before the new values are added.
        var keptParameters = Request.Query
            .Where(parameter => !IsPagingKey(parameter.Key))
            .SelectMany(parameter => parameter.Value.Select(value => KeyValuePair.Create(parameter.Key, value)));
        string PageLink(int targetPage) => linkPrefix + QueryString.Create(keptParameters.Concat(
        [
            KeyValuePair.Create("page", (string?)targetPage.ToString()),
            KeyValuePair.Create("pageSize", (string?)pageSize.ToString())
        ]));

        return new PaginatedResponse<ElementResponseDto>
        {
            Info = new PaginationInfo
            {
                Count = totalCount,
                Pages = totalPages,
                Next = page < totalPages ? PageLink(page + 1) : null,
                Prev = page > 1 ? PageLink(page - 1) : null
            },
            Results = pageItems
        };
    }

    private static bool IsPagingKey(string key) =>
        key.Equals("page", StringComparison.OrdinalIgnoreCase) || key.Equals("pageSize", StringComparison.OrdinalIgnoreCase);
}
