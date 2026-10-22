using Element.Services.Shipment.Infrastructure.Entities;
using FluentAssertions;

namespace Element.Services.UnitTests.Shipment;

/// <summary>The shipment aggregate decides once, on opening, whether an order ships or fails.</summary>
public class ShipmentRecordTests
{
    private static readonly DateTime Now = new(2026, 10, 22, 12, 0, 0, DateTimeKind.Utc);
    private static readonly Guid OrderId = Guid.NewGuid();

    private static ShipmentRecord Open(decimal quantity, decimal carrierLimit) =>
        ShipmentRecord.Open(OrderId, "customer-1", "Au", quantity, carrierLimit, "TRK-0123456789ABCDEF", Now);

    [Fact]
    public void Open_UnderTheCarrierLimit_Ships_WithTrackingNumberAndDispatchTime()
    {
        var shipment = Open(quantity: 25m, carrierLimit: 100m);

        shipment.Id.Should().NotBeEmpty();
        shipment.OrderId.Should().Be(OrderId);
        shipment.CustomerId.Should().Be("customer-1");
        shipment.ElementSymbol.Should().Be("Au");
        shipment.Quantity.Should().Be(25m);
        shipment.Status.Should().Be(ShipmentRecord.ShippedStatus);
        shipment.IsShipped.Should().BeTrue();
        shipment.TrackingNumber.Should().Be("TRK-0123456789ABCDEF");
        shipment.CreatedAt.Should().Be(Now);
        shipment.DispatchedAt.Should().Be(Now);
    }

    [Theory]
    [InlineData(100)]
    [InlineData(250)]
    public void Open_AtOrOverTheCarrierLimit_Fails_WithoutTrackingNumber(decimal quantity)
    {
        var shipment = Open(quantity, carrierLimit: 100m);

        shipment.Status.Should().Be(ShipmentRecord.FailedStatus);
        shipment.IsShipped.Should().BeFalse();
        shipment.TrackingNumber.Should().BeNull();
        shipment.DispatchedAt.Should().BeNull();
    }

    [Fact]
    public void Open_WithLimitZero_HasNoCarrierLimit()
    {
        Open(quantity: 1_000_000m, carrierLimit: 0m).IsShipped.Should().BeTrue();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public void Open_AShipment_RequiresATrackingNumber(string? trackingNumber)
    {
        var act = () => ShipmentRecord.Open(OrderId, "customer-1", "Au", 1m, 0m, trackingNumber!, Now);

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void ExceedsCarrierLimit_IsTheSameRuleOpenUses()
    {
        ShipmentRecord.ExceedsCarrierLimit(99.9999m, 100m).Should().BeFalse();
        ShipmentRecord.ExceedsCarrierLimit(100m, 100m).Should().BeTrue();
        ShipmentRecord.ExceedsCarrierLimit(100m, 0m).Should().BeFalse();
    }
}
