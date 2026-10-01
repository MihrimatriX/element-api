using Element.Services.Shipment.API.Controllers;
using Element.Services.Shipment.Infrastructure.Data;
using Element.Services.Shipment.Infrastructure.Entities;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Element.Services.UnitTests.Shipment;

public class ShipmentsControllerTests
{
    private const string Key = "test-internal-key";
    private static readonly Guid Owner = Guid.NewGuid();

    [Fact]
    public async Task Track_AnotherCustomersNumber_LooksExactlyLikeAnUnknownOne()
    {
        var controller = await ControllerAsync(Key, Key, Guid.NewGuid().ToString());

        (await controller.Track("TRK-OWNED", default)).Should().BeOfType<NotFoundResult>();
        (await controller.Track("TRK-NOPE", default)).Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Track_Owner_GetsTheShipment_RegardlessOfGuidCase()
    {
        var controller = await ControllerAsync(Key, Key, Owner.ToString().ToUpperInvariant());

        var result = await controller.Track("TRK-OWNED", default);

        result.Should().BeOfType<OkObjectResult>()
            .Which.Value.Should().BeOfType<ShipmentRecord>().Which.TrackingNumber.Should().Be("TRK-OWNED");
    }

    [Theory]
    [InlineData(Key, null)]          // caller skipped the gateway
    [InlineData(Key, "wrong-key")]
    [InlineData(null, null)]         // key not configured: fail closed
    public async Task EveryEndpoint_RequiresTheInternalKey(string? configured, string? presented)
    {
        var controller = await ControllerAsync(configured, presented, Owner.ToString());

        (await controller.Track("TRK-OWNED", default)).Should().BeOfType<UnauthorizedResult>();
        (await controller.Search(null, null, null, null)).Should().BeOfType<UnauthorizedResult>();
        (await controller.GetById(Guid.NewGuid(), default)).Should().BeOfType<UnauthorizedResult>();
    }

    private static async Task<ShipmentsController> ControllerAsync(string? configuredKey, string? presentedKey, string userId)
    {
        var db = new ShipmentDbContext(new DbContextOptionsBuilder<ShipmentDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.Shipments.Add(new ShipmentRecord
        {
            Id = Guid.NewGuid(), OrderId = Guid.NewGuid(), CustomerId = Owner.ToString(), ElementSymbol = "Au",
            Quantity = 1, Status = "Shipped", TrackingNumber = "TRK-OWNED", CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["INTERNAL_API_KEY"] = configuredKey })
            .Build();
        var http = new DefaultHttpContext();
        http.Request.Headers["X-User-Id"] = userId;
        if (presentedKey is not null) http.Request.Headers["INTERNAL_API_KEY"] = presentedKey;
        return new ShipmentsController(db, config) { ControllerContext = new ControllerContext { HttpContext = http } };
    }
}
