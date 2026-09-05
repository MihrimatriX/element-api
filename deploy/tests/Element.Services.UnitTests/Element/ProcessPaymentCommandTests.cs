using Element.Shared.Events;
using FluentAssertions;

namespace Element.Services.UnitTests.Element;

public class ProcessPaymentCommandTests
{
    [Fact]
    public void ProcessPaymentCommand_IncludesCustomerId()
    {
        var orderId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var cmd = new ProcessPaymentCommand(orderId, 75.25m, customerId);
        cmd.OrderId.Should().Be(orderId);
        cmd.CustomerId.Should().Be(customerId);
        cmd.Amount.Should().Be(75.25m);
    }
}
