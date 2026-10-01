using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Element.Shared.Science;

/// <summary>Read-only, versioned scientific records with strict, deterministic projection.</summary>
/// <remarks>
/// Shared by catalog-service (elements), compound-service (compounds) and the standalone science host.
/// The science host compiles this file directly, so it must not depend on anything else in shared-lib.
/// </remarks>
public sealed class ScientificCatalog
{
    private const int DefaultPageSize = 30;
    private const int MaxPageSize = 100;
    private const int MaxSearchLength = 120;
    private const int MaxProjectionLength = 2048;
    private const int MaxProjectionPaths = 32;
    private const int MaxPathDepth = 6;
    private const int ETagHashLength = 24;

    private static readonly string[] ElementSummaryPaths =
    [
        "id",
        "atomic_number",
        "symbol",
        "names",
        "classification",
        "layout",
        "atomic_properties.atomic_mass",
        "atomic_properties.electron_configuration.short",
        "atomic_properties.electronegativity.pauling",
        "thermodynamic_properties.standard_state",
        "thermodynamic_properties.melting_point",
        "thermodynamic_properties.boiling_point",
        "thermodynamic_properties.density_g_cm3",
        "history.discovered_year",
    ];

    private static readonly string[] CompoundSummaryPaths =
    [
        "id",
        "slug",
        "names",
        "identifiers.pubchem_cid",
        "molecular_properties.molecular_formula",
        "molecular_properties.molecular_weight_g_mol",
        "display_formula",
        "composition",
        "editorial.summary",
        "media",
    ];

    // Element-only list filters, matched against record.classification.<filter>.
    private static readonly string[] ClassificationFilters = ["category", "block", "group", "period"];

    // Keeps Turkish letters readable in the search text instead of \u escapes.
    private static readonly JsonSerializerOptions RelaxedJsonOptions = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private readonly JsonObject[] _records;
    private readonly string[] _searchText; // folded once (same index as _records): the snapshot is immutable, q requests are anonymous
    private readonly string[] _summaryPaths;
    private readonly bool _isElementCatalog;

    /// <summary>Loads <c>Data/{filename}</c> from the app folder; <paramref name="elements"/> selects element rules (symbol, atomic number, classification filters) instead of compound rules.</summary>
    public ScientificCatalog(string filename, bool elements)
    {
        _isElementCatalog = elements;

        var snapshotPath = Path.Combine(AppContext.BaseDirectory, "Data", filename);
        _records = JsonNode.Parse(File.ReadAllText(snapshotPath))!
            .AsArray()
            .Select(node => node!.AsObject())
            .ToArray();
        if (_records.Length == 0)
            throw new InvalidDataException("Scientific snapshot is empty.");

        _searchText = _records.Select(SearchText).ToArray();
        _summaryPaths = elements ? ElementSummaryPaths : CompoundSummaryPaths;
    }

    /// <summary>
    /// Answers a v2 catalog request: one record when <paramref name="identifier"/> is given, otherwise a filtered, paged list.
    /// Supports view, include, fields, q, page and pageSize (plus classification filters for elements),
    /// sets a weak ETag and returns 304 when the client already has the same representation.
    /// </summary>
    public IActionResult Read(HttpRequest request, HttpResponse response, string? identifier = null)
    {
        try
        {
            var query = request.Query;
            var view = ResolveView(query["view"].ToString(), identifier);
            var include = ParsePaths(query["include"].ToString());
            var fields = ParsePaths(query["fields"].ToString());
            EnsurePathsExist(include.Concat(fields));
            var paths = ChooseProjectionPaths(view, include, fields);

            JsonNode result;
            if (identifier != null)
            {
                var record = _records.FirstOrDefault(candidate => MatchesIdentifier(candidate, identifier));
                if (record == null)
                {
                    return new NotFoundObjectResult(new ProblemDetails
                    {
                        Status = 404,
                        Title = "Scientific record not found",
                        Detail = identifier,
                    });
                }

                result = Project(record, paths);
            }
            else
            {
                result = BuildPagedList(request, paths);
            }

            return CachedJson(request, response, result.ToJsonString());
        }
        catch (ArgumentException error)
        {
            return new BadRequestObjectResult(new ProblemDetails
            {
                Status = 400,
                Title = "Invalid scientific query",
                Detail = error.Message,
            });
        }
    }

    /// <summary>Copies only the requested dot paths from <paramref name="record"/> into a new object, keeping the nesting (missing values become null).</summary>
    public static JsonObject Project(JsonObject record, IEnumerable<string> paths)
    {
        var result = new JsonObject();

        // Shallow paths first, so a deeper path can add to an object a shallower path already copied.
        foreach (var path in paths.OrderBy(path => path.Count(character => character == '.')))
        {
            var parts = path.Split('.');

            JsonNode? sourceValue = record;
            foreach (var part in parts)
                sourceValue = sourceValue?[part];

            var target = result;
            for (var depth = 0; depth < parts.Length - 1; depth++)
            {
                if (target[parts[depth]] is not JsonObject)
                    target[parts[depth]] = new JsonObject();
                target = target[parts[depth]]!.AsObject();
            }

            target[parts[^1]] = sourceValue?.DeepClone();
        }

        return result;
    }

    // Default view: "full" for a single record, "summary" for lists.
    private static string ResolveView(string requestedView, string? identifier)
    {
        var view = requestedView;
        if (view == "")
            view = identifier == null ? "summary" : "full";

        if (view is not ("summary" or "full"))
            throw new ArgumentException("view must be summary or full.");

        return view;
    }

    // Every record shares the first record's shape, so it is the reference for valid paths.
    private void EnsurePathsExist(IEnumerable<string> paths)
    {
        foreach (var path in paths)
        {
            if (!PathExists(_records[0], path))
                throw new ArgumentException($"Unknown field '{path}'. Use dot paths to object properties; arrays are selected as a whole.");
        }
    }

    // fields wins; otherwise "full" means every top-level section, and "summary" means the summary list plus include.
    private string[] ChooseProjectionPaths(string view, string[] include, string[] fields)
    {
        if (fields.Length > 0)
            return fields;

        if (view == "full")
            return _records[0].Select(section => section.Key).ToArray();

        return _summaryPaths.Concat(include).Distinct().ToArray();
    }

    private JsonObject BuildPagedList(HttpRequest request, string[] paths)
    {
        var query = request.Query;
        var page = ParsePositiveInt(query["page"].ToString(), 1, int.MaxValue, "page");
        var pageSize = ParsePositiveInt(query["pageSize"].ToString(), DefaultPageSize, MaxPageSize, "pageSize");

        var matches = FilterRecords(query).ToArray();
        var pageCount = Math.Max(1, (int)Math.Ceiling(matches.Length / (double)pageSize));

        // Long math so a huge page number cannot overflow the skip count.
        var skipCount = (int)Math.Min((long)(page - 1) * pageSize, matches.Length);
        var pageItems = matches
            .Skip(skipCount)
            .Take(pageSize)
            .Select(record => (JsonNode)Project(record, paths))
            .ToArray();

        string? PageLink(int targetPage) =>
            targetPage < 1 || targetPage > pageCount ? null : BuildPageLink(request, targetPage, pageSize);

        return new JsonObject
        {
            ["info"] = new JsonObject
            {
                ["count"] = matches.Length,
                ["pages"] = pageCount,
                ["page"] = page,
                ["page_size"] = pageSize,
                ["next"] = page < pageCount ? PageLink(page + 1) : null,
                ["prev"] = page > 1 ? PageLink(page - 1) : null,
            },
            ["results"] = new JsonArray(pageItems),
        };
    }

    // Applies the free-text search (q) and, for elements, the classification filters.
    private IEnumerable<JsonObject> FilterRecords(IQueryCollection query)
    {
        IEnumerable<JsonObject> records = _records;

        var search = query["q"].ToString().Trim();
        if (search.Length > MaxSearchLength)
            throw new ArgumentException($"q must not exceed {MaxSearchLength} characters.");

        if (search.Length > 0)
        {
            var foldedSearch = Fold(search);
            records = _records.Where((_, index) => _searchText[index].Contains(foldedSearch, StringComparison.Ordinal));
        }

        foreach (var filter in ClassificationFilters)
        {
            var value = query[filter].ToString();
            if (value == "")
                continue;

            if (!_isElementCatalog)
                throw new ArgumentException($"{filter} applies to elements only.");

            records = records.Where(record => string.Equals(
                record["classification"]?[filter]?.ToString(), value, StringComparison.OrdinalIgnoreCase));
        }

        return records;
    }

    // Same query string (filters, fields ...) with only page and pageSize replaced.
    // Query keys are case-insensitive: echoing "Page=2" next to the new "page" made the link a 400.
    private static string BuildPageLink(HttpRequest request, int targetPage, int pageSize)
    {
        var keptParameters = request.Query
            .Where(parameter => !parameter.Key.Equals("page", StringComparison.OrdinalIgnoreCase)
                && !parameter.Key.Equals("pageSize", StringComparison.OrdinalIgnoreCase))
            .SelectMany(parameter => parameter.Value.Select(value => new KeyValuePair<string, string?>(parameter.Key, value)));

        KeyValuePair<string, string?>[] pagingParameters =
        [
            new("page", targetPage.ToString(CultureInfo.InvariantCulture)),
            new("pageSize", pageSize.ToString(CultureInfo.InvariantCulture)),
        ];

        return request.Path + QueryString.Create(keptParameters.Concat(pagingParameters));
    }

    // Sets ETag + Cache-Control and returns 304 when If-None-Match already names this exact body.
    private static IActionResult CachedJson(HttpRequest request, HttpResponse response, string json)
    {
        var bodyHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json)))[..ETagHashLength];
        var etag = "W/\"" + bodyHash + "\"";
        var quotedHash = etag[2..];

        response.Headers.ETag = etag;
        response.Headers.CacheControl = "public, max-age=3600";

        var clientTags = request.Headers.IfNoneMatch.ToString().Split(',');
        var clientHasThisVersion = clientTags.Any(tag =>
            tag.Trim() == "*" || tag.Trim().Replace("W/", "", StringComparison.Ordinal) == quotedHash);
        if (clientHasThisVersion)
            return new StatusCodeResult(304);

        return new ContentResult
        {
            Content = json,
            ContentType = "application/json; charset=utf-8",
            StatusCode = 200,
        };
    }

    // Elements: id, symbol or atomic number. Compounds: id, slug or PubChem CID. All case-insensitive.
    private bool MatchesIdentifier(JsonObject record, string identifier)
    {
        var naturalKey = _isElementCatalog ? record["symbol"] : record["slug"];
        if (EqualsIgnoreCase(record["id"], identifier) || EqualsIgnoreCase(naturalKey, identifier))
            return true;

        var numericKey = _isElementCatalog ? record["atomic_number"] : record["identifiers"]?["pubchem_cid"];
        return EqualsIgnoreCase(numericKey, identifier);
    }

    private static bool EqualsIgnoreCase(JsonNode? node, string value) =>
        string.Equals(node?.ToString(), value, StringComparison.OrdinalIgnoreCase);

    // Lower-cases and strips accents so "bakır", "bakir" and "BAKIR" all compare equal.
    private static string Fold(string value)
    {
        var decomposed = value
            .ToLowerInvariant()
            .Replace('ı', 'i')
            .Normalize(NormalizationForm.FormD);

        return string.Concat(decomposed.Where(character =>
            CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark));
    }

    // The searchable text of a record: ids, symbol, names in every language, formula and PubChem CID.
    private static string SearchText(JsonObject record)
    {
        var searchable = string.Join(
            " ",
            record["id"],
            record["symbol"],
            record["atomic_number"],
            record["names"]?.ToJsonString(RelaxedJsonOptions),
            record["molecular_properties"]?["molecular_formula"],
            record["identifiers"]?["pubchem_cid"]);

        return Fold(searchable);
    }

    // Empty means "use the default"; anything else must be an integer in 1..max.
    private static int ParsePositiveInt(string value, int fallback, int max, string name)
    {
        if (value == "")
            return fallback;

        if (int.TryParse(value, out var number) && number >= 1 && number <= max)
            return number;

        throw new ArgumentException($"{name} must be between 1 and {max}.");
    }

    // Parses a comma-separated list of dot paths (include / fields) with size limits against abuse.
    private static string[] ParsePaths(string value)
    {
        if (value.Length > MaxProjectionLength)
            throw new ArgumentException("Projection is too long.");

        if (value == "")
            return [];

        var paths = value.Split(',', StringSplitOptions.TrimEntries);
        var hasInvalidPath = paths.Any(path => path.Length == 0 || path.Split('.').Length > MaxPathDepth);
        if (paths.Length > MaxProjectionPaths || hasInvalidPath)
            throw new ArgumentException($"Select 1–{MaxProjectionPaths} nonempty field paths, at most {MaxPathDepth} levels deep.");

        return paths.Distinct().ToArray();
    }

    // True when every segment of the dot path is an object property (arrays cannot be entered).
    private static bool PathExists(JsonObject record, string path)
    {
        JsonNode? node = record;
        foreach (var part in path.Split('.'))
        {
            if (node is not JsonObject currentObject || !currentObject.TryGetPropertyValue(part, out node))
                return false;
        }

        return true;
    }
}
