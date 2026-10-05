using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Element.Services.Compound.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Compounds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Formula = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    NameTr = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ElementSymbol = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    GramsPerUnit = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    PriceMult = table.Column<decimal>(type: "numeric(18,4)", nullable: false),
                    Summary = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Compounds", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Compounds_ElementSymbol",
                table: "Compounds",
                column: "ElementSymbol");

            migrationBuilder.CreateIndex(
                name: "IX_Compounds_Kind",
                table: "Compounds",
                column: "Kind");

            migrationBuilder.CreateIndex(
                name: "IX_Compounds_Slug",
                table: "Compounds",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "Compounds");
        }
    }
}
