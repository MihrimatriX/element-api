using Element.Services.Element.Core.Entities;
using Element.Services.Element.Infrastructure.Persistence;

namespace Element.Services.UnitTests.Element;

public class ElementBlockTests
{
    [Theory]
    [InlineData(1, 1, "diatomic nonmetal", "s")]
    [InlineData(2, 18, "noble gas", "s")]
    [InlineData(13, 13, "post-transition metal", "p")]
    [InlineData(26, 8, "transition metal", "d")]
    [InlineData(57, 3, "lanthanide", "f")]
    [InlineData(118, 18, "noble gas", "p")]
    public void BlockFollowsPositionAndHeliumException(int number, int group, string category, string expected)
    {
        Assert.Equal(expected, ElementDetailSeeder.ResolveBlock(new ChemicalElement {
            AtomicNumber = number, Group = group, Category = category
        }));
    }
}
