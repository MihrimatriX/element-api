using System.Text.Json;
using Element.Services.Identity.Core.Entities;
using Element.Services.Identity.Infrastructure.Persistence;
using Element.Services.Identity.Infrastructure.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.UnitTests.Identity;

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

    [Fact]
    public async Task GenerateKeyAsync_ReturnsValidFormatAndPersists()
    {
        var (service, db) = CreateSut();
        var userId = Guid.NewGuid();

        var (rawKey, record) = await service.GenerateKeyAsync(userId, "integration test", 50);

        rawKey.Should().StartWith("ele_live_").And.HaveLength(41);
        record.UserId.Should().Be(userId);
        record.IsActive.Should().BeTrue();
        record.RateLimitTps.Should().Be(10);
        (await db.ApiKeys.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task ValidateKeyAsync_ReturnsKey_WhenActiveInDatabase()
    {
        var (service, _) = CreateSut();
        var userId = Guid.NewGuid();

        var (rawKey, _) = await service.GenerateKeyAsync(userId, "test");

        var validated = await service.ValidateKeyAsync(rawKey);

        validated.Should().NotBeNull();
        validated!.UserId.Should().Be(userId);
        validated.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task RevokeKeyAsync_ReturnsFalse_WhenKeyNotOwned()
    {
        var (service, _) = CreateSut();
        var (rawKey, record) = await service.GenerateKeyAsync(Guid.NewGuid(), "owned");

        var result = await service.RevokeKeyAsync(Guid.NewGuid(), record.Id);

        result.Should().BeFalse();
    }

    [Fact]
    public async Task RevokeKeyAsync_DeactivatesKey_ForOwner()
    {
        var (service, db) = CreateSut();
        var userId = Guid.NewGuid();
        var (_, record) = await service.GenerateKeyAsync(userId, "revoke me");

        var revoked = await service.RevokeKeyAsync(userId, record.Id);

        revoked.Should().BeTrue();
        var fromDb = await db.ApiKeys.FindAsync(record.Id);
        fromDb!.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task ValidateKeyAsync_ReturnsNull_WhenKeyRevoked()
    {
        var (service, _) = CreateSut();
        var userId = Guid.NewGuid();
        var (rawKey, record) = await service.GenerateKeyAsync(userId, "temp");

        await service.RevokeKeyAsync(userId, record.Id);

        var validated = await service.ValidateKeyAsync(rawKey);
        validated.Should().BeNull();
    }
}
