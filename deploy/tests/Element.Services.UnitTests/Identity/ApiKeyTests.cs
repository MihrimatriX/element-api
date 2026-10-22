using Element.Services.Identity.Core.Entities;
using FluentAssertions;

namespace Element.Services.UnitTests.Identity;

/// <summary>API key rules that live on the entity: issuing, hashing, rate-limit bounds, revocation and the per-account cap.</summary>
public class ApiKeyTests
{
    private static readonly DateTime Now = new(2026, 10, 22, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Issue_creates_an_active_key_that_stores_only_hash_and_mask()
    {
        var userId = Guid.NewGuid();

        var (rawKey, key) = ApiKey.Issue(userId, "my script", 5, Now);

        rawKey.Should().MatchRegex("^ele_live_[0-9a-f]{32}$");
        key.Id.Should().NotBeEmpty();
        key.UserId.Should().Be(userId);
        key.Description.Should().Be("my script");
        key.CreatedAt.Should().Be(Now);
        key.IsActive.Should().BeTrue();
        key.RateLimitTps.Should().Be(5);
        key.KeyHash.Should().Be(ApiKey.Hash(rawKey)).And.NotContain(rawKey);
        key.MaskedKey.Should().Be($"{rawKey[..13]}...{rawKey[^4..]}");
    }

    [Fact]
    public void Issue_never_returns_the_same_raw_key_twice()
    {
        var first = ApiKey.Issue(Guid.NewGuid(), "a", 10, Now).RawKey;
        var second = ApiKey.Issue(Guid.NewGuid(), "b", 10, Now).RawKey;

        first.Should().NotBe(second);
    }

    [Theory]
    [InlineData(-5, 1)]
    [InlineData(0, 1)]
    [InlineData(1, 1)]
    [InlineData(7, 7)]
    [InlineData(10, 10)]
    [InlineData(50, 10)]
    public void Issue_clamps_the_rate_limit_to_the_platform_bounds(int requested, int stored) =>
        ApiKey.Issue(Guid.NewGuid(), "tps", requested, Now).Key.RateLimitTps.Should().Be(stored);

    [Fact]
    public void Hash_is_lowercase_sha256_hex_and_deterministic()
    {
        var hash = ApiKey.Hash("ele_live_00000000000000000000000000000000");

        hash.Should().MatchRegex("^[0-9a-f]{64}$");
        ApiKey.Hash("ele_live_00000000000000000000000000000000").Should().Be(hash);
        ApiKey.Hash("ele_live_00000000000000000000000000000001").Should().NotBe(hash);
    }

    [Fact]
    public void Revoke_deactivates_the_key_and_is_idempotent()
    {
        var key = ApiKey.Issue(Guid.NewGuid(), "old", 10, Now).Key;

        key.Revoke();
        key.Revoke();

        key.IsActive.Should().BeFalse();
    }

    [Theory]
    [InlineData(0, true)]
    [InlineData(19, true)]
    [InlineData(20, false)]
    [InlineData(25, false)]
    public void An_account_may_hold_at_most_twenty_active_keys(int activeKeys, bool allowed) =>
        ApiKey.CanIssueAnother(activeKeys).Should().Be(allowed);
}
