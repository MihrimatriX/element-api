using Element.Services.Identity.Core.Entities;
using Element.Services.Identity.Infrastructure.Persistence;
using Element.Services.Identity.Infrastructure.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.UnitTests.Identity;

/// <summary>
/// Lookup and revocation on the in-memory provider. IssueKeyAsync locks the account row (FOR UPDATE), so it is
/// covered against real PostgreSQL in LearningIntegrationTests (20-key cap under concurrency, revoked-history pruning).
/// </summary>
public class ApiKeyServiceTests
{
    private static (ApiKeyService Service, IdentityAppDbContext Db) CreateSut()
    {
        var options = new DbContextOptionsBuilder<IdentityAppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new IdentityAppDbContext(options);

        return (new ApiKeyService(db), db);
    }

    private static async Task<(string RawKey, ApiKey Key)> StoreKeyAsync(IdentityAppDbContext db, Guid userId, DateTime? createdAt = null)
    {
        var issued = ApiKey.Issue(userId, "test", 10, createdAt ?? DateTime.UtcNow);
        db.ApiKeys.Add(issued.Key);
        await db.SaveChangesAsync();
        return issued;
    }

    [Fact]
    public async Task ValidateKeyAsync_ReturnsKey_WhenActiveInDatabase()
    {
        var (service, db) = CreateSut();
        var userId = Guid.NewGuid();
        var (rawKey, _) = await StoreKeyAsync(db, userId);

        var validated = await service.ValidateKeyAsync(rawKey);

        validated.Should().NotBeNull();
        validated!.UserId.Should().Be(userId);
        validated.IsActive.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("ele_live_ffffffffffffffffffffffffffffffff")]
    public async Task ValidateKeyAsync_ReturnsNull_ForBlankOrUnknownKey(string rawKey)
    {
        var (service, db) = CreateSut();
        await StoreKeyAsync(db, Guid.NewGuid());

        (await service.ValidateKeyAsync(rawKey)).Should().BeNull();
    }

    [Fact]
    public async Task RevokeKeyAsync_ReturnsFalse_WhenKeyNotOwned()
    {
        var (service, db) = CreateSut();
        var (_, key) = await StoreKeyAsync(db, Guid.NewGuid());

        var result = await service.RevokeKeyAsync(Guid.NewGuid(), key.Id);

        result.Should().BeFalse();
        (await db.ApiKeys.FindAsync(key.Id))!.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task RevokeKeyAsync_DeactivatesKey_ForOwner()
    {
        var (service, db) = CreateSut();
        var userId = Guid.NewGuid();
        var (_, key) = await StoreKeyAsync(db, userId);

        var revoked = await service.RevokeKeyAsync(userId, key.Id);

        revoked.Should().BeTrue();
        (await db.ApiKeys.FindAsync(key.Id))!.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task ValidateKeyAsync_ReturnsNull_WhenKeyRevoked()
    {
        var (service, db) = CreateSut();
        var userId = Guid.NewGuid();
        var (rawKey, key) = await StoreKeyAsync(db, userId);

        await service.RevokeKeyAsync(userId, key.Id);
        var validated = await service.ValidateKeyAsync(rawKey);

        validated.Should().BeNull();
    }

    [Fact]
    public async Task ListAsync_ReturnsOnlyTheUsersKeys_NewestFirst_WithoutHashes()
    {
        var (service, db) = CreateSut();
        var userId = Guid.NewGuid();
        var (_, older) = await StoreKeyAsync(db, userId, DateTime.UtcNow.AddMinutes(-5));
        var (_, newer) = await StoreKeyAsync(db, userId);
        await StoreKeyAsync(db, Guid.NewGuid());

        var keys = await service.ListAsync(userId);

        keys.Select(key => key.Id).Should().Equal(newer.Id, older.Id);
        keys[0].MaskedKey.Should().Be(newer.MaskedKey);
    }
}
