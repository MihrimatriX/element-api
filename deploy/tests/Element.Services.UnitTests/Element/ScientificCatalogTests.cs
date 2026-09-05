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
    private static JsonNode Json(IActionResult result) => JsonNode.Parse(Assert.IsType<ContentResult>(result).Content!)!;

    [Theory]
    [InlineData("Fe")]
    [InlineData("FE")]
    [InlineData("26")]
    [InlineData("fe-26")]
    public void IdentifiersResolveToIronWithAccurateIsotopes(string identifier)
    {
        var c = Context();
        var r = Json(Elements.Read(c.Request, c.Response, identifier));
        Assert.Equal("Fe", r["symbol"]!.GetValue<string>());
        Assert.Equal(4, r["isotopes"]!.AsArray().Count);
        Assert.Equal(55.93493633, r["isotopes"]![1]!["exact_mass_da"]!.GetValue<double>());
        Assert.Null(r["isotopes"]![0]!["decay_mode"]);
    }
    [Fact]
    public void ProjectionPreservesNullAndDoesNotMutateFullRecord()
    {
        var c = Context("?fields=symbol,atomic_properties.term_symbol");
        var projected = Json(Elements.Read(c.Request, c.Response, "fe"));
        Assert.Equal(2, projected.AsObject().Count);
        Assert.Single(projected["atomic_properties"]!.AsObject());
        Assert.Null(projected["atomic_properties"]!["term_symbol"]);
        var full = Context();
        Assert.NotNull(Json(Elements.Read(full.Request, full.Response, "fe"))["atomic_properties"]!["atomic_mass"]);
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
        var c = Context(query);
        Assert.IsType<BadRequestObjectResult>(Elements.Read(c.Request, c.Response));
    }
    [Fact]
    public void PaginationRetainsFiltersAndProjection()
    {
        var c = Context("?category=transition&block=d&pageSize=2&fields=symbol,names");
        var result = Json(Elements.Read(c.Request, c.Response));
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
        var c = Context("?view=summary&include=isotopes");
        var result = Json(Elements.Read(c.Request, c.Response, "fe"));
        Assert.NotNull(result["isotopes"]);
        Assert.Null(result["mechanical_properties"]);
        Assert.Equal("Fe", result["symbol"]!.GetValue<string>());
    }
    [Fact]
    public void EtagRevalidatesOnlySameRepresentation()
    {
        var c = Context("?fields=symbol");
        Elements.Read(c.Request, c.Response, "fe");
        c.Request.Headers.IfNoneMatch = c.Response.Headers.ETag;
        Assert.Equal(304, Assert.IsType<StatusCodeResult>(Elements.Read(c.Request, c.Response, "fe")).StatusCode);
        c.Request.QueryString = new QueryString("?fields=symbol,names");
        Assert.IsType<ContentResult>(Elements.Read(c.Request, c.Response, "fe"));
    }
    [Fact]
    public void SearchFindsTurkishAndAsciiNames()
    {
        foreach (var q in new[] { "bakır", "bakir", "copper" })
        {
            var c = Context("?q=" + Uri.EscapeDataString(q));
            var result = Json(Elements.Read(c.Request, c.Response));
            Assert.Equal("Cu", result["results"]![0]!["symbol"]!.GetValue<string>());
        }
    }
    [Fact]
    public void AspirinHasScientificIdentityAndNoSimulatedPrices()
    {
        var c = Context();
        var result = Json(Compounds.Read(c.Request, c.Response, "2244"));
        Assert.Equal("aspirin", result["slug"]!.GetValue<string>());
        Assert.Equal("C9H8O4", result["molecular_properties"]!["molecular_formula"]!.GetValue<string>());
        Assert.Null(result["priceMult"]);
        Assert.NotEmpty(result["provenance"]!["sources"]!.AsArray());
    }
}
