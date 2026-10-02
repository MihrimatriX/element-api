using System.Text.Json.Nodes;
using Element.Shared.Science;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Element.Services.UnitTests.Element;

public class ScientificCatalogTests
{
    private static readonly ScientificCatalog Elements = new("scientific-elements.json", true);
    private static readonly ScientificCatalog Compounds = new("scientific-compounds.json", false);

    private static DefaultHttpContext Context(string query = "")
    {
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/v2/elements";
        context.Request.QueryString = new QueryString(query);
        return context;
    }

    private static JsonNode Json(IActionResult result) =>
        JsonNode.Parse(Assert.IsType<ContentResult>(result).Content!)!;

    [Theory]
    [InlineData("Fe")]
    [InlineData("FE")]
    [InlineData("26")]
    [InlineData("fe-26")]
    public void IdentifiersResolveToIronWithAccurateIsotopes(string identifier)
    {
        var context = Context();

        var iron = Json(Elements.Read(context.Request, context.Response, identifier));

        Assert.Equal("Fe", iron["symbol"]!.GetValue<string>());
        Assert.Equal(4, iron["isotopes"]!.AsArray().Count);
        Assert.Equal(55.93493633, iron["isotopes"]![1]!["exact_mass_da"]!.GetValue<double>());
        Assert.Null(iron["isotopes"]![0]!["decay_mode"]);
    }

    [Fact]
    public void ProjectionPreservesNullAndDoesNotMutateFullRecord()
    {
        var projectedContext = Context("?fields=symbol,atomic_properties.term_symbol");
        var projected = Json(Elements.Read(projectedContext.Request, projectedContext.Response, "fe"));

        Assert.Equal(2, projected.AsObject().Count);
        Assert.Single(projected["atomic_properties"]!.AsObject());
        Assert.Null(projected["atomic_properties"]!["term_symbol"]);

        var fullContext = Context();
        var full = Json(Elements.Read(fullContext.Request, fullContext.Response, "fe"));
        Assert.NotNull(full["atomic_properties"]!["atomic_mass"]);
    }

    [Theory]
    [InlineData("?fields=unknown&q=no-match")]
    [InlineData("?fields=symbol,,names")]
    [InlineData("?include=isotopes.mass_number")]
    [InlineData("?pageSize=101")]
    [InlineData("?page=-1")]
    [InlineData("?view=everything")]
    public void InvalidQueriesAreRejectedEvenWhenNoResults(string query)
    {
        var context = Context(query);

        Assert.IsType<BadRequestObjectResult>(Elements.Read(context.Request, context.Response));
    }

    [Fact]
    public void PaginationRetainsFiltersAndProjection()
    {
        var context = Context("?category=transition&block=d&pageSize=2&fields=symbol,names");

        var result = Json(Elements.Read(context.Request, context.Response));
        var next = result["info"]!["next"]!.GetValue<string>();

        Assert.Contains("category=transition", next);
        Assert.Contains("block=d", next);
        Assert.Contains("fields=", next);
        Assert.Contains("page=2", next);
        Assert.Equal(2, result["results"]!.AsArray().Count);
    }

    [Fact]
    public void SummaryIsSmallerAndIncludeAddsRequestedSection()
    {
        var context = Context("?view=summary&include=isotopes");

        var result = Json(Elements.Read(context.Request, context.Response, "fe"));

        Assert.NotNull(result["isotopes"]);
        Assert.Null(result["mechanical_properties"]);
        Assert.Equal("Fe", result["symbol"]!.GetValue<string>());
    }

    [Fact]
    public void EtagRevalidatesOnlySameRepresentation()
    {
        var context = Context("?fields=symbol");
        Elements.Read(context.Request, context.Response, "fe");

        // Same representation + matching ETag -> 304 Not Modified, still publicly cacheable.
        context.Request.Headers.IfNoneMatch = context.Response.Headers.ETag;
        var revalidated = Elements.Read(context.Request, context.Response, "fe");
        Assert.Equal(304, Assert.IsType<StatusCodeResult>(revalidated).StatusCode);
        Assert.Equal("public, max-age=3600", context.Response.Headers.CacheControl.ToString());

        // A different projection is a different representation -> full body again.
        context.Request.QueryString = new QueryString("?fields=symbol,names");
        Assert.IsType<ContentResult>(Elements.Read(context.Request, context.Response, "fe"));
    }

    [Fact]
    public void SearchFindsTurkishAndAsciiNames()
    {
        foreach (var query in new[] { "bakır", "bakir", "copper" })
        {
            var context = Context("?q=" + Uri.EscapeDataString(query));

            var result = Json(Elements.Read(context.Request, context.Response));

            Assert.Equal("Cu", result["results"]![0]!["symbol"]!.GetValue<string>());
        }
    }

    [Fact]
    public void SearchCombinesWithFilters()
    {
        var context = Context("?q=demir&block=d");

        var results = Json(Elements.Read(context.Request, context.Response))["results"]!.AsArray();

        Assert.Equal("Fe", Assert.Single(results)!["symbol"]!.GetValue<string>());
    }

    [Fact]
    public void NextLinkStaysValidWhenCallerUsedOtherPageKeyCase()
    {
        var context = Context("?Page=1&PageSize=2&block=d");
        var next = Json(Elements.Read(context.Request, context.Response))["info"]!["next"]!.GetValue<string>();

        // Following the link must not 400 on a duplicated "Page"/"page" key.
        var followContext = Context(next[next.IndexOf('?')..]);
        var followed = Json(Elements.Read(followContext.Request, followContext.Response));

        Assert.Equal(2, followed["info"]!["page"]!.GetValue<int>());
    }

    [Fact]
    public void AspirinHasScientificIdentityAndNoSimulatedPrices()
    {
        var context = Context();

        var aspirin = Json(Compounds.Read(context.Request, context.Response, "2244"));

        Assert.Equal("aspirin", aspirin["slug"]!.GetValue<string>());
        Assert.Equal("C9H8O4", aspirin["molecular_properties"]!["molecular_formula"]!.GetValue<string>());
        Assert.Null(aspirin["priceMult"]);
        Assert.NotEmpty(aspirin["provenance"]!["sources"]!.AsArray());
    }
}
