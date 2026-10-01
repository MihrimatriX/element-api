using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Element.Services.Shipment.Infrastructure.Data.Migrations;

[DbContext(typeof(ShipmentDbContext))]
[Migration("20261001090000_AddShipmentIndexes")]
public partial class AddShipmentIndexes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Concurrent duplicate deliveries could already have created two rows for one order.
        // Keep the earliest (CreatedAt, then Id as tie-break) so the unique index can be built.
        migrationBuilder.Sql("""
            DELETE FROM "Shipments" s
            USING "Shipments" keep
            WHERE s."OrderId" = keep."OrderId"
              AND (keep."CreatedAt", keep."Id") < (s."CreatedAt", s."Id");
            """);

        migrationBuilder.CreateIndex(
            name: "IX_Shipments_OrderId",
            table: "Shipments",
            column: "OrderId",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Shipments_TrackingNumber",
            table: "Shipments",
            column: "TrackingNumber");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_Shipments_TrackingNumber", table: "Shipments");
        migrationBuilder.DropIndex(name: "IX_Shipments_OrderId", table: "Shipments");
    }
}
