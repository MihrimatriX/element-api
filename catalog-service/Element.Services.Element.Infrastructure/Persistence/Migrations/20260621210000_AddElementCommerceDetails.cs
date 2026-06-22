using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Element.Services.Element.Infrastructure.Persistence.Migrations;

public partial class AddElementCommerceDetails : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Appearance",
            table: "ChemicalElements",
            type: "character varying(300)",
            maxLength: 300,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Badge",
            table: "ChemicalElements",
            type: "character varying(40)",
            maxLength: 40,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "Block",
            table: "ChemicalElements",
            type: "character varying(2)",
            maxLength: 2,
            nullable: false,
            defaultValue: "s");

        migrationBuilder.AddColumn<decimal>(
            name: "Electronegativity",
            table: "ChemicalElements",
            type: "numeric(18,4)",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "ImageUrl",
            table: "ChemicalElements",
            type: "character varying(500)",
            maxLength: 500,
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "NameTr",
            table: "ChemicalElements",
            type: "character varying(100)",
            maxLength: 100,
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<decimal>(
            name: "Rating",
            table: "ChemicalElements",
            type: "numeric(18,2)",
            nullable: false,
            defaultValue: 4.5m);

        migrationBuilder.AddColumn<int>(
            name: "ReviewCount",
            table: "ChemicalElements",
            type: "integer",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<string>(
            name: "SellerName",
            table: "ChemicalElements",
            type: "character varying(120)",
            maxLength: 120,
            nullable: false,
            defaultValue: "Elemental Resmi");

        migrationBuilder.AddColumn<string>(
            name: "Summary",
            table: "ChemicalElements",
            type: "character varying(600)",
            maxLength: 600,
            nullable: false,
            defaultValue: "");

        migrationBuilder.AddColumn<string>(
            name: "Uses",
            table: "ChemicalElements",
            type: "character varying(300)",
            maxLength: 300,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Appearance", table: "ChemicalElements");
        migrationBuilder.DropColumn(name: "Badge", table: "ChemicalElements");
        migrationBuilder.DropColumn(name: "Block", table: "ChemicalElements");
        migrationBuilder.DropColumn(name: "Electronegativity", table: "ChemicalElements");
        migrationBuilder.DropColumn(name: "ImageUrl", table: "ChemicalElements");
        migrationBuilder.DropColumn(name: "NameTr", table: "ChemicalElements");
        migrationBuilder.DropColumn(name: "Rating", table: "ChemicalElements");
        migrationBuilder.DropColumn(name: "ReviewCount", table: "ChemicalElements");
        migrationBuilder.DropColumn(name: "SellerName", table: "ChemicalElements");
        migrationBuilder.DropColumn(name: "Summary", table: "ChemicalElements");
        migrationBuilder.DropColumn(name: "Uses", table: "ChemicalElements");
    }
}
