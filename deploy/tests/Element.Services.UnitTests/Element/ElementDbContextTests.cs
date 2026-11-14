using Element.Services.Element.Infrastructure.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.UnitTests.Element;

public class ElementDbContextTests
{
    [Fact]
    public void Migrations_MatchTheModel()
    {
        // Migrations here are hand-written SQL; the snapshot must still follow the model so the next scaffold is clean.
        using var db = new ElementDbContext(new DbContextOptionsBuilder<ElementDbContext>()
            .UseNpgsql("Host=unused").Options);
        db.Database.HasPendingModelChanges().Should().BeFalse();
    }

    [Fact]
    public void SeedPrices_ReadsEveryElementsSeededPrice_IncludingTheHandSetOnes()
    {
        using var db = new ElementDbContext(new DbContextOptionsBuilder<ElementDbContext>()
            .UseNpgsql("Host=unused").Options);

        var seedPrices = db.SeedPrices();

        seedPrices.Should().HaveCount(119);       // 118 elements plus the hidden predicted element 119
        seedPrices["H"].Should().Be(9.0909m);     // the 10 / (Z + 0.1) rule most seeds follow
        seedPrices["Au"].Should().Be(75.25m);     // hand-set: a formula could not serve as the anchor
    }
}
