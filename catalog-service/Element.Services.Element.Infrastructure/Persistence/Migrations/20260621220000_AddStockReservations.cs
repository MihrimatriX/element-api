using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Element.Services.Element.Infrastructure.Persistence.Migrations;

public partial class AddStockReservations : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "StockReservations",
            columns: table => new
            {
                OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                ElementSymbol = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                Quantity = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_StockReservations", x => x.OrderId);
            });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "StockReservations");
    }
}
