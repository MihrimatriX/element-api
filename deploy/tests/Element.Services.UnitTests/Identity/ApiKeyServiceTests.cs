using System.Text.Json;
using Element.Services.Identity.Core.Entities;
using Element.Services.Identity.Infrastructure.Persistence;
using Element.Services.Identity.Infrastructure.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using StackExchange.Redis;

namespace Element.Services.UnitTests.Identity;

public class ApiKeyServiceTests
{
    private static (ApiKeyService Service, IdentityAppDbContext Db, Mock<IDatabase> RedisDb) CreateSut()
    {
        var options = new DbContextOptionsBuilder<IdentityAppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new IdentityAppDbContext(options);

        var redisDb = new Mock<IDatabase>();
        redisDb.Setup(r => r.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(RedisValue.Null);
        redisDb.Setup(r => r.StringSetAsync(
                It.IsAny<RedisKey>(),
                It.IsAny<RedisValue>(),
                It.IsAny<TimeSpan?>(),
                It.IsAny<When>()))
            .ReturnsAsync(true);
        redisDb.Setup(r => r.KeyDeleteAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(true);

        var multiplexer = new Mock<IConnectionMultiplexer>();
        multiplexer.Setup(m => m.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(redisDb.Object);

        return (new ApiKeyService(db, multiplexer.Object), db, redisDb);
    }

    [Fact]
    public async Task GenerateKeyAsync_ReturnsValidFormatAndPersists()
    {
        var (service, db, _) = CreateSut();
        var userId = Guid.NewGuid();

        var (rawKey, record) = await service.GenerateKeyAsync(userId, "integration test");

        rawKey.Should().StartWith("ele_live_").And.HaveLength(41);
        record.UserId.Should().Be(userId);
        record.IsActive.Should().BeTrue();
        (await db.ApiKeys.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task ValidateKeyAsync_ReturnsKey_WhenActiveInDatabase()
    {
        var (service, _, redisDb) = CreateSut();
        var userId = Guid.NewGuid();

        var (rawKey, _) = await service.GenerateKeyAsync(userId, "test");

        redisDb.Setup(r => r.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(RedisValue.Null);

        var validated = await service.ValidateKeyAsync(rawKey);

        validated.Should().NotBeNull();
        validated!.UserId.Should().Be(userId);
        validated.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task RevokeKeyAsync_ReturnsFalse_WhenKeyNotOwned()
    {
        var (service, _, _) = CreateSut();
        var (rawKey, record) = await service.GenerateKeyAsync(Guid.NewGuid(), "owned");

        var result = await service.RevokeKeyAsync(Guid.NewGuid(), record.Id);

        result.Should().BeFalse();
    }

    [Fact]
    public async Task RevokeKeyAsync_DeactivatesKey_ForOwner()
    {
        var (service, db, _) = CreateSut();
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
        var (service, _, redisDb) = CreateSut();
        var userId = Guid.NewGuid();
        var (rawKey, record) = await service.GenerateKeyAsync(userId, "temp");

        await service.RevokeKeyAsync(userId, record.Id);

        redisDb.Setup(r => r.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(RedisValue.Null);

        var validated = await service.ValidateKeyAsync(rawKey);
        validated.Should().BeNull();
    }
}
