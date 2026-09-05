using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Element.Shared.Science;

/// <summary>Read-only, versioned scientific records with strict, deterministic projection.</summary>
public sealed class ScientificCatalog
{
    private readonly JsonObject[] _records;
    private readonly string[] _summary;
    private readonly bool _elements;

    public ScientificCatalog(string filename, bool elements)
    {
        _elements = elements;
        _records = JsonNode.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Data", filename)))!
            .AsArray().Select(n => n!.AsObject()).ToArray();
        if (_records.Length == 0) throw new InvalidDataException("Scientific snapshot is empty.");
        _summary = elements
            ? ["id", "atomic_number", "symbol", "names", "classification", "layout", "atomic_properties.atomic_mass", "atomic_properties.electron_configuration.short", "atomic_properties.electronegativity.pauling", "thermodynamic_properties.standard_state", "thermodynamic_properties.melting_point", "thermodynamic_properties.boiling_point", "thermodynamic_properties.density_g_cm3", "history.discovered_year"]
            : ["id", "slug", "names", "identifiers.pubchem_cid", "molecular_properties.molecular_formula", "molecular_properties.molecular_weight_g_mol"];
    }

    public IActionResult Read(HttpRequest request, HttpResponse response, string? identifier = null)
    {
        try
        {
            var query = request.Query;
            var view = query["view"].ToString();
            if (view == "") view = identifier == null ? "summary" : "full";
            if (view is not ("summary" or "full")) throw new ArgumentException("view must be summary or full.");
            var include = ParsePaths(query["include"].ToString());
            var fields = ParsePaths(query["fields"].ToString());
            foreach (var path in include.Concat(fields))
                if (!Exists(_records[0], path)) throw new ArgumentException($"Unknown field '{path}'. Use dot paths to object properties; arrays are selected as a whole.");
            var paths = fields.Length > 0 ? fields : view == "full" ? _records[0].Select(kv => kv.Key).ToArray() : _summary.Concat(include).Distinct().ToArray();
            JsonNode result;
            if (identifier != null)
            {
                var record = _records.FirstOrDefault(r => MatchId(r, identifier));
                if (record == null) return new NotFoundObjectResult(new ProblemDetails { Status = 404, Title = "Scientific record not found", Detail = identifier });
                result = Project(record, paths);
            }
            else
            {
                var page = PositiveInt(query["page"].ToString(), 1, int.MaxValue, "page");
                var size = PositiveInt(query["pageSize"].ToString(), 30, 100, "pageSize");
                IEnumerable<JsonObject> records = _records;
                var search = query["q"].ToString().Trim();
                if (search.Length > 120) throw new ArgumentException("q must not exceed 120 characters.");
                if (search.Length > 0) records = records.Where(r => SearchText(r).Contains(Fold(search), StringComparison.Ordinal));
                foreach (var filter in new[] { "category", "block", "group", "period" })
                {
                    var value = query[filter].ToString();
                    if (value == "") continue;
                    if (!_elements) throw new ArgumentException($"{filter} applies to elements only.");
                    records = records.Where(r => string.Equals(r["classification"]?[filter]?.ToString(), value, StringComparison.OrdinalIgnoreCase));
                }
                var array = records.ToArray();
                var pages = Math.Max(1, (int)Math.Ceiling(array.Length / (double)size));
                string? Link(int p) => p < 1 || p > pages ? null : request.Path + QueryString.Create(query.Where(k => k.Key is not ("page" or "pageSize"))
                    .SelectMany(k => k.Value.Select(v => new KeyValuePair<string, string?>(k.Key, v)))
                    .Concat([new("page", p.ToString(CultureInfo.InvariantCulture)), new("pageSize", size.ToString(CultureInfo.InvariantCulture))])).ToString();
                result = new JsonObject
                {
                    ["info"] = new JsonObject { ["count"] = array.Length, ["pages"] = pages, ["page"] = page, ["page_size"] = size, ["next"] = page < pages ? Link(page + 1) : null, ["prev"] = page > 1 ? Link(page - 1) : null },
                    ["results"] = new JsonArray(array.Skip((int)Math.Min((long)(page - 1) * size, array.Length)).Take(size).Select(r => (JsonNode)Project(r, paths)).ToArray())
                };
            }
            var json = result.ToJsonString();
            var etag = "W/\"" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(json)))[..24] + "\"";
            response.Headers.ETag = etag;
            response.Headers.CacheControl = "public, max-age=3600";
            if (request.Headers.IfNoneMatch.ToString().Split(',').Any(tag => tag.Trim() == "*" || tag.Trim().Replace("W/", "", StringComparison.Ordinal) == etag[2..]))
                return new StatusCodeResult(304);
            return new ContentResult { Content = json, ContentType = "application/json; charset=utf-8", StatusCode = 200 };
        }
        catch (ArgumentException error)
        {
            return new BadRequestObjectResult(new ProblemDetails { Status = 400, Title = "Invalid scientific query", Detail = error.Message });
        }
    }

    private bool MatchId(JsonObject r, string id) => new[] { r["id"], r[_elements ? "symbol" : "slug"] }
        .Any(v => string.Equals(v?.ToString(), id, StringComparison.OrdinalIgnoreCase))
        || string.Equals((_elements ? r["atomic_number"] : r["identifiers"]?["pubchem_cid"])?.ToString(), id, StringComparison.OrdinalIgnoreCase);

    private static string Fold(string value) => string.Concat(value.ToLowerInvariant().Replace('ı', 'i').Normalize(NormalizationForm.FormD).Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark));
    private static string SearchText(JsonObject r) => Fold(string.Join(" ", r["id"], r["symbol"], r["atomic_number"], r["names"]?.ToJsonString(new System.Text.Json.JsonSerializerOptions { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping }), r["molecular_properties"]?["molecular_formula"], r["identifiers"]?["pubchem_cid"]));
    private static int PositiveInt(string value, int fallback, int max, string name) => value == "" ? fallback : int.TryParse(value, out var n) && n >= 1 && n <= max ? n : throw new ArgumentException($"{name} must be between 1 and {max}.");
    private static string[] ParsePaths(string value)
    {
        if (value.Length > 2048) throw new ArgumentException("Projection is too long.");
        if (value == "") return [];
        var paths = value.Split(',', StringSplitOptions.TrimEntries);
        if (paths.Length > 32 || paths.Any(p => p.Length == 0 || p.Split('.').Length > 6)) throw new ArgumentException("Select 1–32 nonempty field paths, at most 6 levels deep.");
        return paths.Distinct().ToArray();
    }
    private static bool Exists(JsonObject record, string path)
    {
        JsonNode? node = record;
        foreach (var part in path.Split('.')) { if (node is not JsonObject obj || !obj.TryGetPropertyValue(part, out node)) return false; }
        return true;
    }
    public static JsonObject Project(JsonObject record, IEnumerable<string> paths)
    {
        var result = new JsonObject();
        foreach (var path in paths.OrderBy(p => p.Count(c => c == '.')))
        {
            var parts = path.Split('.');
            JsonNode? current = record;
            foreach (var part in parts) current = current?[part];
            var target = result;
            for (var i = 0; i < parts.Length - 1; i++)
            {
                if (target[parts[i]] is not JsonObject) target[parts[i]] = new JsonObject();
                target = target[parts[i]]!.AsObject();
            }
            target[parts[^1]] = current?.DeepClone();
        }
        return result;
    }
}
