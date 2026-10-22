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
}
