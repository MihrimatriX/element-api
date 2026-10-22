using Element.Services.Element.Core.Entities;
using FluentAssertions;

namespace Element.Services.UnitTests.Element;

/// <summary>The per-order marker that lets the price move at most once per completed order or desk sale.</summary>
public class StockReservationTests
{
    private static readonly DateTime Now = new(2026, 10, 22, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void CompletedOrderMarker_IsPriced()
    {
        var orderId = Guid.NewGuid();

        var marker = StockReservation.ForCompletedOrder(orderId, "Au", 5m, Now);

        marker.OrderId.Should().Be(orderId);
        marker.ElementSymbol.Should().Be("Au");
        marker.Quantity.Should().Be(5m);
        marker.Status.Should().Be(StockReservationStatus.Priced);
        marker.CreatedAt.Should().Be(Now);
        marker.IsPriced.Should().BeTrue();
    }

    [Fact]
    public void DeskSaleMarker_IsPriced()
    {
        var marker = StockReservation.ForDeskSale(Guid.NewGuid(), "Ag", 2m, Now);

        marker.Status.Should().Be(StockReservationStatus.SoldPriced);
        marker.IsPriced.Should().BeTrue();
    }

    [Fact]
    public void MarkPriced_OnAnAlreadyPricedOrder_Throws()
    {
        var marker = StockReservation.ForCompletedOrder(Guid.NewGuid(), "Au", 5m, Now);

        var act = () => marker.MarkPriced();

        act.Should().Throw<InvalidOperationException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public void Marker_RejectsNonPositiveQuantity(decimal quantity)
    {
        var act = () => StockReservation.ForCompletedOrder(Guid.NewGuid(), "Au", quantity, Now);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}
