using Element.Services.Identity.Core.Entities;
using FluentAssertions;

namespace Element.Services.UnitTests.Identity;

/// <summary>Webhook rules that live on the entity: supported events, the per-account cap and a valid subscription on creation.</summary>
public class WebhookSubscriptionTests
{
    private static readonly DateTime Now = new(2026, 10, 22, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void SupportedEventsIn_normalises_and_drops_unknown_names()
    {
        var events = WebhookSubscription.SupportedEventsIn([" PRICE.updated ", "price.updated", "order.updated", "stock.updated", null, ""]);

        events.Should().Equal("price.updated", "order.updated");
    }

    [Fact]
    public void SupportedEventsIn_returns_empty_for_missing_list() =>
        WebhookSubscription.SupportedEventsIn(null).Should().BeEmpty();

    [Theory]
    [InlineData(0, true)]
    [InlineData(9, true)]
    [InlineData(10, false)]
    public void An_account_may_hold_at_most_ten_active_subscriptions(int active, bool allowed) =>
        WebhookSubscription.CanAddAnother(active).Should().Be(allowed);

    [Fact]
    public void Create_trims_the_url_and_stores_normalised_events()
    {
        var userId = Guid.NewGuid();

        var subscription = WebhookSubscription.Create(
            userId, "  https://hooks.example.com/element  ", "s3cret", ["Order.Updated", "price.updated", "order.updated"], Now);

        subscription.Id.Should().NotBeEmpty();
        subscription.UserId.Should().Be(userId);
        subscription.Url.Should().Be("https://hooks.example.com/element");
        subscription.Secret.Should().Be("s3cret");
        subscription.Events.Should().Be("order.updated,price.updated");
        subscription.CreatedAt.Should().Be(Now);
        subscription.IsActive.Should().BeTrue();
    }

    [Theory]
    [InlineData("https://127.0.0.1/hook", "s", "order.updated")]
    [InlineData("https://hooks.example.com/hook", " ", "order.updated")]
    [InlineData("https://hooks.example.com/hook", "s", "stock.updated")]
    public void Create_refuses_an_invalid_subscription(string url, string secret, string eventName)
    {
        var create = () => WebhookSubscription.Create(Guid.NewGuid(), url, secret, [eventName], Now);

        create.Should().Throw<ArgumentException>();
    }
}
