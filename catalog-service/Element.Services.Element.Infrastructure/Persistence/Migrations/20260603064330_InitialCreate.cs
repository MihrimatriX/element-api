using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Element.Services.Element.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ChemicalElements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Symbol = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AtomicNumber = table.Column<int>(type: "integer", nullable: false),
                    PricePerGram = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    StockWeightGrams = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    ReservedWeightGrams = table.Column<decimal>(type: "numeric(18,4)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChemicalElements", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PriceHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ElementSymbol = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Price = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PriceHistories", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "ChemicalElements",
                columns: new[] { "Id", "AtomicNumber", "Name", "PricePerGram", "ReservedWeightGrams", "StockWeightGrams", "Symbol" },
                values: new object[,]
                {
                    { new Guid("0a2b56e4-4a4b-4b13-b5bb-76226f3cbca1"), 79, "Gold", 75.25m, 0m, 1000m, "Au" },
                    { new Guid("1a2b56e4-4a4b-4b13-b5bb-76226f3cbca2"), 47, "Silver", 1.15m, 0m, 10000m, "Ag" },
                    { new Guid("2a2b56e4-4a4b-4b13-b5bb-76226f3cbca3"), 3, "Lithium", 0.18m, 0m, 50000m, "Li" },
                    { new Guid("3a2b56e4-4a4b-4b13-b5bb-76226f3cbca4"), 78, "Platinum", 35.80m, 0m, 500m, "Pt" },
                    { new Guid("4a2b56e4-4a4b-4b13-b5bb-76226f3cbca5"), 29, "Copper", 0.009m, 0m, 1000000m, "Cu" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChemicalElements_Symbol",
                table: "ChemicalElements",
                column: "Symbol",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PriceHistories_ElementSymbol",
                table: "PriceHistories",
                column: "ElementSymbol");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChemicalElements");

            migrationBuilder.DropTable(
                name: "PriceHistories");
        }
    }
}
