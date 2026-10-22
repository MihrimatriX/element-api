using Element.Services.Compound.API.Controllers;
using Element.Services.Compound.API.DTOs;
using Element.Services.Compound.Infrastructure.Entities;
using Element.Services.Compound.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Element.Compound.Tests;

/// <summary>
/// v1 compound reads on the in-memory provider: filters, ordering, search bound, page normalisation,
/// next/prev links that keep the filters, slug lookup and the sourced-properties join.
/// </summary>
public class CompoundsControllerTests
{
    private const string BaseUrl = "https://api.test";

    [Fact]
    public async Task List_filters_by_element_case_insensitively_ordered_by_symbol_then_slug()
    {
        var page = await ListAsync(element: "au");

        page.Results.Select(compound => compound.Slug).Should().Equal("au2o3", "aucl3", "elemental-au");
        page.Info.Count.Should().Be(3);
    }

    [Fact]
    public async Task List_filters_by_kind_and_searches_slug_formula_and_both_names()
    {
        (await ListAsync(kind: "PREPARATION")).Results.Select(compound => compound.Slug).Should().Equal("elemental-au");
        (await ListAsync(q: "cl3")).Results.Select(compound => compound.Slug).Should().Equal("aucl3");
        (await ListAsync(q: "WATER")).Results.Select(compound => compound.Slug).Should().Equal("h2o");
        (await ListAsync(q: "klorür")).Results.Select(compound => compound.Slug).Should().Equal("aucl3");
    }

    [Fact]
    public async Task List_rejects_a_search_longer_than_120_characters()
    {
        var result = await CreateController().List(null, null, new string('a', 121));

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task List_links_keep_the_filters_and_page_size()
    {
        var page = await ListAsync(element: "au", kind: "compound", pageSize: 1, page: 2);

        page.Info.Count.Should().Be(2);
        page.Info.Pages.Should().Be(2);
        page.Results.Select(compound => compound.Slug).Should().Equal("aucl3");
        page.Info.Next.Should().BeNull();
        page.Info.Prev.Should().Be($"{BaseUrl}/api/v1/compounds?element=au&kind=compound&page=1&pageSize=1");
    }

    [Fact]
    public async Task List_links_escape_the_search_text()
    {
        var page = await ListAsync(q: "altın (", page: 2, pageSize: 1);

        page.Info.Prev.Should().Be($"{BaseUrl}/api/v1/compounds?q=alt%C4%B1n%20%28&page=1&pageSize=1");
    }

    [Theory]
    [InlineData(0, 40)]
    [InlineData(-5, 40)]
    [InlineData(2, 2)]
    [InlineData(1000, 100)]
    public async Task List_normalises_the_page_size(int requested, int used)
    {
        var page = await ListAsync(page: -3, pageSize: requested);

        page.Info.Prev.Should().BeNull();
        page.Results.Count().Should().Be(Math.Min(used, 5));
        page.Info.Pages.Should().Be((int)Math.Ceiling(5 / (double)used));
    }

    [Fact]
    public async Task List_far_past_the_last_page_is_empty_without_overflow()
    {
        var page = await ListAsync(page: int.MaxValue, pageSize: 100);

        page.Results.Should().BeEmpty();
        page.Info.Next.Should().BeNull();
        page.Info.Prev.Should().Contain($"page={int.MaxValue - 1}");
    }

    [Fact]
    public async Task List_without_filters_links_with_page_parameters_only()
    {
        var page = await ListAsync(pageSize: 2);

        page.Info.Next.Should().Be($"{BaseUrl}/api/v1/compounds?page=2&pageSize=2");
    }

    [Fact]
    public async Task Get_finds_a_slug_case_insensitively_with_sourced_properties()
    {
        var result = await CreateController().Get(" H2O ");

        var compound = result.Should().BeOfType<OkObjectResult>().Which.Value.Should().BeOfType<CompoundResponseDto>().Subject;
        compound.Slug.Should().Be("h2o");
        compound.Properties!.PubChemId.Should().Be(962);
        compound.PriceSource.Should().Be("simulation");
        compound.Currency.Should().Be("KREDI");
    }

    [Fact]
    public async Task Get_unknown_slug_is_404() =>
        (await CreateController().Get("nope")).Should().BeOfType<NotFoundObjectResult>();

    [Fact]
    public async Task ForElement_returns_every_compound_of_the_element_unpaged()
    {
        var result = await CreateController().ForElement("AU");

        var compounds = result.Should().BeOfType<OkObjectResult>().Which.Value.Should().BeAssignableTo<IEnumerable<CompoundResponseDto>>().Subject;
        compounds.Should().HaveCount(3).And.OnlyContain(compound => compound.ElementSymbol == "Au");
    }

    private static async Task<PaginatedResponse<CompoundResponseDto>> ListAsync(
        string? element = null, string? kind = null, string? q = null, int page = 1, int pageSize = 40)
    {
        var result = await CreateController().List(element, kind, q, page, pageSize);
        return (PaginatedResponse<CompoundResponseDto>)result.Should().BeOfType<OkObjectResult>().Subject.Value!;
    }

    private static CompoundsController CreateController()
    {
        var options = new DbContextOptionsBuilder<CompoundDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new CompoundDbContext(options);
        db.Compounds.AddRange(
            Compound("aucl3", "AuCl3", "Gold(III) chloride", "Altın(III) klorür", "compound", "Au"),
            Compound("elemental-au", "Au", "Gold (elemental gram)", "Altın (saf gram)", "preparation", "Au"),
            Compound("au2o3", "Au2O3", "Gold(III) oxide", "Altın(III) oksit", "compound", "Au"),
            Compound("h2o", "H2O", "Water", "Su", "compound", "H"),
            Compound("fe2o3", "Fe2O3", "Iron(III) oxide", "Demir(III) oksit", "compound", "Fe"));
        db.SaveChanges();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["PUBLIC_API_BASE"] = BaseUrl + "/" })
            .Build();
        return new CompoundsController(new EfCompoundRepository(db), configuration)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
        };
    }

    private static ChemicalCompound Compound(string slug, string formula, string name, string nameTr, string kind, string symbol) => new()
    {
        Id = Guid.NewGuid(),
        Slug = slug,
        Formula = formula,
        Name = name,
        NameTr = nameTr,
        Kind = kind,
        ElementSymbol = symbol,
    };
}
