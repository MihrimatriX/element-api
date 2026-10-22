using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Element.Services.Element.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddChemicalProperties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AtomicMass",
                table: "ChemicalElements",
                type: "numeric(18,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "BoilingPoint",
                table: "ChemicalElements",
                type: "numeric(18,4)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "ChemicalElements",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "ChemicalElements",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Density",
                table: "ChemicalElements",
                type: "numeric(18,4)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DiscoveredBy",
                table: "ChemicalElements",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ElectronConfiguration",
                table: "ChemicalElements",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Group",
                table: "ChemicalElements",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "MeltingPoint",
                table: "ChemicalElements",
                type: "numeric(18,4)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Period",
                table: "ChemicalElements",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Phase",
                table: "ChemicalElements",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "YearDiscovered",
                table: "ChemicalElements",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Slug = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "Description", "Name", "Slug" },
                values: new object[,]
                {
                    { 1, "actinide group elements.", "actinide", "actinide" },
                    { 2, "alkali metal group elements.", "alkali metal", "alkali-metal" },
                    { 3, "alkaline earth metal group elements.", "alkaline earth metal", "alkaline-earth-metal" },
                    { 4, "diatomic nonmetal group elements.", "diatomic nonmetal", "diatomic-nonmetal" },
                    { 5, "lanthanide group elements.", "lanthanide", "lanthanide" },
                    { 6, "metalloid group elements.", "metalloid", "metalloid" },
                    { 7, "noble gas group elements.", "noble gas", "noble-gas" },
                    { 8, "polyatomic nonmetal group elements.", "polyatomic nonmetal", "polyatomic-nonmetal" },
                    { 9, "post-transition metal group elements.", "post-transition metal", "post-transition-metal" },
                    { 10, "transition metal group elements.", "transition metal", "transition-metal" },
                    { 11, "unknown, but predicted to be an alkali metal group elements.", "unknown, but predicted to be an alkali metal", "unknown-but-predicted-to-be-an-alkali-metal" },
                    { 12, "unknown, predicted to be noble gas group elements.", "unknown, predicted to be noble gas", "unknown-predicted-to-be-noble-gas" },
                    { 13, "unknown, probably metalloid group elements.", "unknown, probably metalloid", "unknown-probably-metalloid" },
                    { 14, "unknown, probably post-transition metal group elements.", "unknown, probably post-transition metal", "unknown-probably-post-transition-metal" },
                    { 15, "unknown, probably transition metal group elements.", "unknown, probably transition metal", "unknown-probably-transition-metal" }
                });

            migrationBuilder.UpdateData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("0a2b56e4-4a4b-4b13-b5bb-76226f3cbca1"),
                columns: new[] { "AtomicMass", "BoilingPoint", "Category", "Color", "Density", "DiscoveredBy", "ElectronConfiguration", "Group", "MeltingPoint", "Period", "Phase", "YearDiscovered" },
                values: new object[] { 196.9665695m, 3243m, "transition metal", null, 19.3m, "Middle East", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s1 4f14 5d10", 11, 1337.33m, 6, "Solid", null });

            migrationBuilder.UpdateData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("1a2b56e4-4a4b-4b13-b5bb-76226f3cbca2"),
                columns: new[] { "AtomicMass", "BoilingPoint", "Category", "Color", "Density", "DiscoveredBy", "ElectronConfiguration", "Group", "MeltingPoint", "Period", "Phase", "YearDiscovered" },
                values: new object[] { 107.86822m, 2435m, "transition metal", null, 10.49m, "unknown, before 5000 BC", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s1 4d10", 11, 1234.93m, 5, "Solid", null });

            migrationBuilder.UpdateData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("2a2b56e4-4a4b-4b13-b5bb-76226f3cbca3"),
                columns: new[] { "AtomicMass", "BoilingPoint", "Category", "Color", "Density", "DiscoveredBy", "ElectronConfiguration", "Group", "MeltingPoint", "Period", "Phase", "YearDiscovered" },
                values: new object[] { 6.94m, 1603m, "alkali metal", null, 0.534m, "Johan August Arfwedson", "1s2 2s1", 1, 453.65m, 2, "Solid", null });

            migrationBuilder.UpdateData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("3a2b56e4-4a4b-4b13-b5bb-76226f3cbca4"),
                columns: new[] { "AtomicMass", "BoilingPoint", "Category", "Color", "Density", "DiscoveredBy", "ElectronConfiguration", "Group", "MeltingPoint", "Period", "Phase", "YearDiscovered" },
                values: new object[] { 195.0849m, 4098m, "transition metal", null, 21.45m, "Antonio de Ulloa", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s1 4f14 5d9", 10, 2041.4m, 6, "Solid", null });

            migrationBuilder.UpdateData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("4a2b56e4-4a4b-4b13-b5bb-76226f3cbca5"),
                columns: new[] { "AtomicMass", "BoilingPoint", "Category", "Color", "Density", "DiscoveredBy", "ElectronConfiguration", "Group", "MeltingPoint", "Period", "Phase", "YearDiscovered" },
                values: new object[] { 63.5463m, 2835m, "transition metal", null, 8.96m, "Middle East", "1s2 2s2 2p6 3s2 3p6 4s1 3d10", 11, 1357.77m, 4, "Solid", null });

            migrationBuilder.InsertData(
                table: "ChemicalElements",
                columns: new[] { "Id", "AtomicMass", "AtomicNumber", "BoilingPoint", "Category", "Color", "Density", "DiscoveredBy", "ElectronConfiguration", "Group", "MeltingPoint", "Name", "Period", "Phase", "PricePerGram", "ReservedWeightGrams", "StockWeightGrams", "Symbol", "YearDiscovered" },
                values: new object[,]
                {
                    { new Guid("02c0258d-c69c-55b1-921b-214b4d366208"), 145m, 61, 3273m, "lanthanide", null, 7.26m, "Chien Shiung Wu", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f5", 3, 1315m, "Promethium", 6, "Solid", 0.1637m, 0m, 1636.66m, "Pm", null },
                    { new Guid("032ba9d1-0b52-53a9-90bc-a8a6d69affab"), 112.4144m, 48, 1040m, "transition metal", null, 8.65m, "Karl Samuel Leberecht Hermann", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10", 12, 594.22m, "Cadmium", 5, "Solid", 0.2079m, 0m, 2079.0m, "Cd", null },
                    { new Guid("03bc62ba-ae02-58f1-afb9-107e54c83d27"), 140.1161m, 58, 3716m, "lanthanide", null, 6.77m, "Martin Heinrich Klaproth", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 5d1 4f1", 3, 1068m, "Cerium", 6, "Solid", 0.1721m, 0m, 1721.17m, "Ce", null },
                    { new Guid("043e2fe9-e57a-5572-a2d1-b4986394cf3f"), 91.2242m, 40, 4650m, "transition metal", null, 6.52m, "Martin Heinrich Klaproth", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d2", 4, 2128m, "Zirconium", 5, "Solid", 0.2494m, 0m, 2493.77m, "Zr", null },
                    { new Guid("05b2b365-9de6-5866-856e-b48f53169a0f"), 121.7601m, 51, 1908m, "metalloid", null, 6.697m, "unknown, before 3000 BC", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p3", 15, 903.78m, "Antimony", 5, "Solid", 0.1957m, 0m, 1956.95m, "Sb", null },
                    { new Guid("0964bd19-3d1b-5558-b9fd-2110b45afb29"), 106.421m, 46, 3236m, "transition metal", null, 12.023m, "William Hyde Wollaston", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 4d10", 10, 1828.05m, "Palladium", 5, "Solid", 0.2169m, 0m, 2169.2m, "Pd", null },
                    { new Guid("0c33aadc-1a51-5807-9eb9-c89d443c3869"), 231.035882m, 91, 4300m, "actinide", null, 15.37m, "William Crookes", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f2 6d1", 3, 1841m, "Protactinium", 7, "Solid", 0.1098m, 0m, 1097.69m, "Pa", null },
                    { new Guid("0ec5a2df-ecaf-533f-ab82-f2fd4cb9c78c"), 267m, 104, 5800m, "transition metal", null, 23.2m, "Joint Institute for Nuclear Research", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d2", 4, 2400m, "Rutherfordium", 7, "Solid", 0.0961m, 0m, 960.61m, "Rf", null },
                    { new Guid("140adcda-6c91-5ac2-8705-8740d634766c"), 208.980401m, 83, 1837m, "post-transition metal", null, 9.78m, "Claude François Geoffroy", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p3", 15, 544.7m, "Bismuth", 6, "Solid", 0.1203m, 0m, 1203.37m, "Bi", null },
                    { new Guid("1a097f65-028a-5040-aba8-7542e8712a4d"), 294m, 117, 883m, "unknown, probably metalloid", null, 7.17m, "Joint Institute for Nuclear Research", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d10 7p5", 17, 723m, "Tennessine", 7, "Solid", 0.0854m, 0m, 853.97m, "Ts", null },
                    { new Guid("1e89951c-964a-5f89-b0d7-0bc36c4c3023"), 247m, 97, 2900m, "actinide", null, 14.78m, "Lawrence Berkeley National Laboratory", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f9", 3, 1259m, "Berkelium", 7, "Solid", 0.103m, 0m, 1029.87m, "Bk", null },
                    { new Guid("1f674dd8-1153-5501-9de0-67c83d4f5e44"), 186.2071m, 75, 5869m, "transition metal", null, 21.02m, "Masataka Ogawa", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d5", 7, 3459m, "Rhenium", 6, "Solid", 0.1332m, 0m, 1331.56m, "Re", null },
                    { new Guid("2019f3f9-76d7-5e23-8cbe-118c28054aeb"), 162.5001m, 66, 2840m, "lanthanide", null, 8.54m, "Lecoq de Boisbaudran", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f10", 3, 1680m, "Dysprosium", 6, "Solid", 0.1513m, 0m, 1512.86m, "Dy", null },
                    { new Guid("225c108d-25f9-5884-ad89-16a6303b47db"), 140.907662m, 59, 3403m, "lanthanide", null, 6.77m, "Carl Auer von Welsbach", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f3", 3, 1208m, "Praseodymium", 6, "Solid", 0.1692m, 0m, 1692.05m, "Pr", null },
                    { new Guid("29d2c3fa-940f-503f-847c-e21b5bc6867d"), 15.999m, 8, 90.188m, "diatomic nonmetal", null, 1.429m, "Carl Wilhelm Scheele", "1s2 2s2 2p4", 16, 54.36m, "Oxygen", 2, "Gas", 1.2346m, 0m, 12345.68m, "O", null },
                    { new Guid("2aabd701-2326-578d-8155-b256f5447423"), 158.925352m, 65, 3396m, "lanthanide", null, 8.23m, "Carl Gustaf Mosander", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f9", 3, 1629m, "Terbium", 6, "Solid", 0.1536m, 0m, 1536.1m, "Tb", null },
                    { new Guid("2baef8e1-eaae-5adb-a3e0-2a094eeebda6"), 257m, 100, null, "actinide", null, null, "Lawrence Berkeley National Laboratory", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f12", 3, 1800m, "Fermium", 7, "Solid", 0.0999m, 0m, 999.0m, "Fm", null },
                    { new Guid("2c86cd31-2aa3-5eff-96a0-0eba7a634be4"), 269m, 108, null, "transition metal", null, 40.7m, "Gesellschaft für Schwerionenforschung", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d6", 8, 126m, "Hassium", 7, "Solid", 0.0925m, 0m, 925.07m, "Hs", null },
                    { new Guid("2e9b96dd-fc46-5a13-9c0f-bbec8b8273b3"), 238.028913m, 92, 4404m, "actinide", null, 19.1m, "Martin Heinrich Klaproth", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f3 6d1", 3, 1405.3m, "Uranium", 7, "Solid", 0.1086m, 0m, 1085.78m, "U", null },
                    { new Guid("31da598e-de2e-5843-95a8-c62caa45e4a2"), 39.9481m, 18, 87.302m, "noble gas", null, 1.784m, "Lord Rayleigh", "1s2 2s2 2p6 3s2 3p6", 18, 83.81m, "Argon", 3, "Gas", 0.5525m, 0m, 5524.86m, "Ar", null },
                    { new Guid("33343aaf-0b27-544e-8f0a-bd7d41a1daec"), 95.951m, 42, 4912m, "transition metal", null, 10.28m, "Carl Wilhelm Scheele", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s1 4d5", 6, 2896m, "Molybdenum", 5, "Solid", 0.2375m, 0m, 2375.3m, "Mo", null },
                    { new Guid("3731c1f7-414d-5589-ab5d-c38b35236720"), 150.362m, 62, 2173m, "lanthanide", null, 7.52m, "Lecoq de Boisbaudran", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f6", 3, 1345m, "Samarium", 6, "Solid", 0.161m, 0m, 1610.31m, "Sm", null },
                    { new Guid("40dbcde2-28fd-5f0f-bef2-27d94ed74f9d"), 132.905451966m, 55, 944m, "alkali metal", null, 1.93m, "Robert Bunsen", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s1", 1, 301.7m, "Cesium", 6, "Solid", 0.1815m, 0m, 1814.88m, "Cs", null },
                    { new Guid("40f7b563-9d8e-5e45-a786-4064aa67f489"), 222m, 86, 211.5m, "noble gas", null, 9.73m, "Friedrich Ernst Dorn", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6", 18, 202m, "Radon", 6, "Gas", 0.1161m, 0m, 1161.44m, "Rn", null },
                    { new Guid("412f8648-fa64-56e3-b1e1-64da94f80c56"), 50.94151m, 23, 3680m, "transition metal", null, 6m, "Andrés Manuel del Río", "1s2 2s2 2p6 3s2 3p6 4s2 3d3", 5, 2183m, "Vanadium", 4, "Solid", 0.4329m, 0m, 4329.0m, "V", null },
                    { new Guid("41449be7-6e04-53b1-9279-4387eb18ac6f"), 192.2173m, 77, 4403m, "transition metal", null, 22.56m, "Smithson Tennant", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d7", 9, 2719m, "Iridium", 6, "Solid", 0.1297m, 0m, 1297.02m, "Ir", null },
                    { new Guid("42e626ea-cf36-516d-a305-be1a5075ba53"), 12.011m, 6, null, "polyatomic nonmetal", null, 1.821m, "Ancient Egypt", "1s2 2s2 2p2", 14, null, "Carbon", 2, "Solid", 1.6393m, 0m, 16393.44m, "C", null },
                    { new Guid("4546ac96-b288-5eb2-a070-ef648edbb8da"), 243m, 95, 2880m, "actinide", null, 12m, "Glenn T. Seaborg", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f7", 3, 1449m, "Americium", 7, "Solid", 0.1052m, 0m, 1051.52m, "Am", null },
                    { new Guid("4b788e76-fe2b-57a6-a38d-94f2815b4ec3"), 85.46783m, 37, 961m, "alkali metal", null, 1.532m, "Robert Bunsen", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s1", 1, 312.45m, "Rubidium", 5, "Solid", 0.2695m, 0m, 2695.42m, "Rb", null },
                    { new Guid("4c8e8b94-ebc5-5d1f-a97f-cd5c42850aa1"), 227m, 89, 3500m, "actinide", null, 10m, "Friedrich Oskar Giesel", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 6d1", 3, 1500m, "Actinium", 7, "Solid", 0.1122m, 0m, 1122.33m, "Ac", null },
                    { new Guid("4d04879a-e64f-5ad0-9e1d-14d637d2fe51"), 47.8671m, 22, 3560m, "transition metal", null, 4.506m, "William Gregor", "1s2 2s2 2p6 3s2 3p6 4s2 3d2", 4, 1941m, "Titanium", 4, "Solid", 0.4525m, 0m, 4524.89m, "Ti", null },
                    { new Guid("4dad723a-58a5-5165-bddd-77d936dc504e"), 54.9380443m, 25, 2334m, "transition metal", null, 7.21m, "Torbern Olof Bergman", "1s2 2s2 2p6 3s2 3p6 4s2 3d5", 7, 1519m, "Manganese", 4, "Solid", 0.3984m, 0m, 3984.06m, "Mn", null },
                    { new Guid("513037a9-649b-5b2b-b831-7b14ad5086a2"), 289m, 114, 420m, "post-transition metal", null, 14m, "Joint Institute for Nuclear Research", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d10 7p2", 14, 340m, "Flerovium", 7, "Solid", 0.0876m, 0m, 876.42m, "Fl", null },
                    { new Guid("5248be94-5f55-5f69-9540-e47559828915"), 126.904473m, 53, 457.4m, "diatomic nonmetal", null, 4.933m, "Bernard Courtois", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p5", 17, 386.85m, "Iodine", 5, "Solid", 0.1883m, 0m, 1883.24m, "I", null },
                    { new Guid("5a6befe5-d3af-5333-8220-56cf363c4484"), 232.03774m, 90, 5061m, "actinide", null, 11.724m, "Jöns Jakob Berzelius", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 6d2", 3, 2023m, "Thorium", 7, "Solid", 0.111m, 0m, 1109.88m, "Th", null },
                    { new Guid("5c147fd9-1031-52e5-a479-beac2d83db0b"), 151.9641m, 63, 1802m, "lanthanide", null, 5.264m, "Eugène-Anatole Demarçay", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f7", 3, 1099m, "Europium", 6, "Solid", 0.1585m, 0m, 1584.79m, "Eu", null },
                    { new Guid("65829710-a119-51d9-bd04-46e482895570"), 18.9984031636m, 9, 85.03m, "diatomic nonmetal", null, 1.696m, "André-Marie Ampère", "1s2 2s2 2p5", 17, 53.48m, "Fluorine", 2, "Gas", 1.0989m, 0m, 10989.01m, "F", null },
                    { new Guid("65cbb62c-2e86-58f3-81de-7bdce4c927f8"), 204.38m, 81, 1746m, "post-transition metal", null, 11.85m, "William Crookes", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p1", 13, 577m, "Thallium", 6, "Solid", 0.1233m, 0m, 1233.05m, "Tl", null },
                    { new Guid("6a0077d9-8bd6-56a1-bd93-eb1d941904ed"), 14.007m, 7, 77.355m, "diatomic nonmetal", null, 1.251m, "Daniel Rutherford", "1s2 2s2 2p3", 15, 63.15m, "Nitrogen", 2, "Gas", 1.4085m, 0m, 14084.51m, "N", null },
                    { new Guid("6c88aee6-8d74-570c-98d4-cdf829c038c3"), 252m, 99, 1269m, "actinide", null, 8.84m, "Lawrence Berkeley National Laboratory", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f11", 3, 1133m, "Einsteinium", 7, "Solid", 0.1009m, 0m, 1009.08m, "Es", null },
                    { new Guid("6d094479-ecb3-50aa-85bf-f403b45cb23d"), 44.9559085m, 21, 3109m, "transition metal", null, 2.985m, "Lars Fredrik Nilson", "1s2 2s2 2p6 3s2 3p6 4s2 3d1", 3, 1814m, "Scandium", 4, "Solid", 0.4739m, 0m, 4739.34m, "Sc", null },
                    { new Guid("6e340d54-5c2c-5ec8-9a14-a654a1974d3f"), 173.0451m, 70, 1469m, "lanthanide", null, 6.9m, "Jean Charles Galissard de Marignac", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14", 3, 1097m, "Ytterbium", 6, "Solid", 0.1427m, 0m, 1426.53m, "Yb", null },
                    { new Guid("702e7092-6d46-59a1-95bc-c332988b9205"), 92.906372m, 41, 5017m, "transition metal", null, 8.57m, "Charles Hatchett", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s1 4d4", 5, 2750m, "Niobium", 5, "Solid", 0.2433m, 0m, 2433.09m, "Nb", null },
                    { new Guid("7209c16b-718a-5832-a8d0-c4c360587f4f"), 282m, 111, null, "unknown, probably transition metal", null, 28.7m, "Gesellschaft für Schwerionenforschung", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d9", 11, null, "Roentgenium", 7, "Solid", 0.09m, 0m, 900.09m, "Rg", null },
                    { new Guid("7553d570-cedc-5772-9bfd-3e844413cda8"), 22.989769282m, 11, 1156.09m, "alkali metal", null, 0.968m, "Humphry Davy", "1s2 2s2 2p6 3s1", 1, 370.944m, "Sodium", 3, "Solid", 0.9009m, 0m, 9009.01m, "Na", null },
                    { new Guid("75d60e81-8551-57d5-a399-4767f24e8a56"), 39.09831m, 19, 1032m, "alkali metal", null, 0.862m, "Humphry Davy", "1s2 2s2 2p6 3s2 3p6 4s1", 1, 336.7m, "Potassium", 4, "Solid", 0.5236m, 0m, 5235.6m, "K", null },
                    { new Guid("75f225fe-75ed-53a7-a499-751b9a796ccf"), 164.930332m, 67, 2873m, "lanthanide", null, 8.79m, "Marc Delafontaine", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f11", 3, 1734m, "Holmium", 6, "Solid", 0.149m, 0m, 1490.31m, "Ho", null },
                    { new Guid("7d2e5285-98b9-5268-a6b0-18394ef610fd"), 30.9737619985m, 15, null, "polyatomic nonmetal", null, 1.823m, "Hennig Brand", "1s2 2s2 2p6 3s2 3p3", 15, null, "Phosphorus", 3, "Solid", 0.6623m, 0m, 6622.52m, "P", null },
                    { new Guid("822999d6-ff98-5477-8165-fbf1c7c8a689"), 4.0026022m, 2, 4.222m, "noble gas", null, 0.1786m, "Pierre Janssen", "1s2", 18, 0.95m, "Helium", 1, "Gas", 4.7619m, 0m, 47619.05m, "He", null },
                    { new Guid("841ad9de-6f37-5ecc-bdea-2a2e9f769b34"), 270m, 107, null, "transition metal", null, 37.1m, "Gesellschaft für Schwerionenforschung", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d5", 7, null, "Bohrium", 7, "Solid", 0.0934m, 0m, 933.71m, "Bh", null },
                    { new Guid("84748e5d-b933-5fb2-96c1-666f3ad23da0"), 144.2423m, 60, 3347m, "lanthanide", null, 7.01m, "Carl Auer von Welsbach", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f4", 3, 1297m, "Neodymium", 6, "Solid", 0.1664m, 0m, 1663.89m, "Nd", null },
                    { new Guid("8784450e-80f7-5c19-9c60-937ead948601"), 266m, 103, null, "actinide", null, null, "Lawrence Berkeley National Laboratory", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 7p1", 3, 1900m, "Lawrencium", 7, "Solid", 0.097m, 0m, 969.93m, "Lr", null },
                    { new Guid("8ae776da-61c0-513c-a9a2-8efadce2ae2f"), 281m, 110, null, "unknown, probably transition metal", null, 34.8m, "Gesellschaft für Schwerionenforschung", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d8", 10, null, "Darmstadtium", 7, "Solid", 0.0908m, 0m, 908.27m, "Ds", null },
                    { new Guid("8bc1bf9c-3e26-5cdc-a396-570cba5a6c49"), 258m, 101, null, "actinide", null, null, "Lawrence Berkeley National Laboratory", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f13", 3, 1100m, "Mendelevium", 7, "Solid", 0.0989m, 0m, 989.12m, "Md", null },
                    { new Guid("8c280733-a046-51ed-b399-bc59c664610a"), 127.603m, 52, 1261m, "metalloid", null, 6.24m, "Franz-Joseph Müller von Reichenstein", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p4", 16, 722.66m, "Tellurium", 5, "Solid", 0.1919m, 0m, 1919.39m, "Te", null },
                    { new Guid("8eefbc09-62bd-559b-83fd-bcf92fb919f7"), 98m, 43, 4538m, "transition metal", null, 11m, "Emilio Segrè", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d5", 7, 2430m, "Technetium", 5, "Solid", 0.232m, 0m, 2320.19m, "Tc", null },
                    { new Guid("9172d1bf-a031-540e-b40b-88d3356c4556"), 72.6308m, 32, 3106m, "metalloid", null, 5.323m, "Clemens Winkler", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p2", 14, 1211.4m, "Germanium", 4, "Solid", 0.3115m, 0m, 3115.26m, "Ge", null },
                    { new Guid("9355de6f-1544-55a2-b188-0c089a579610"), 51.99616m, 24, 2944m, "transition metal", null, 7.19m, "Louis Nicolas Vauquelin", "1s2 2s2 2p6 3s2 3p6 4s1 3d5", 6, 2180m, "Chromium", 4, "Solid", 0.4149m, 0m, 4149.38m, "Cr", null },
                    { new Guid("959c8c68-42fa-5e22-a1fa-3965b2494b96"), 259m, 102, null, "actinide", null, null, "Joint Institute for Nuclear Research", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14", 3, 1100m, "Nobelium", 7, "Solid", 0.0979m, 0m, 979.43m, "No", null },
                    { new Guid("9790cc78-3fab-5642-abb2-a62caf2dfe55"), 138.905477m, 57, 3737m, "lanthanide", null, 6.162m, "Carl Gustaf Mosander", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 5d1", 3, 1193m, "Lanthanum", 6, "Solid", 0.1751m, 0m, 1751.31m, "La", null },
                    { new Guid("991df461-a72f-51c2-8c68-0a34ada90e61"), 200.5923m, 80, 629.88m, "transition metal", null, 13.534m, "unknown, before 2000 BCE", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10", 12, 234.321m, "Mercury", 6, "Liquid", 0.1248m, 0m, 1248.44m, "Hg", null },
                    { new Guid("9a86c288-3c2d-59ff-9af4-4618706c960f"), 65.382m, 30, 1180m, "transition metal", null, 7.14m, "India", "1s2 2s2 2p6 3s2 3p6 4s2 3d10", 12, 692.68m, "Zinc", 4, "Solid", 0.3322m, 0m, 3322.26m, "Zn", null },
                    { new Guid("a00c67e2-b8aa-544a-afc6-d5339eef2cae"), 183.841m, 74, 6203m, "transition metal", null, 19.25m, "Carl Wilhelm Scheele", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d4", 6, 3695m, "Tungsten", 6, "Solid", 0.135m, 0m, 1349.53m, "W", null },
                    { new Guid("a06c9891-c1aa-5f0c-b644-c5a9c7797bff"), 131.2936m, 54, 165.051m, "noble gas", null, 5.894m, "William Ramsay", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6", 18, 161.4m, "Xenon", 5, "Gas", 0.1848m, 0m, 1848.43m, "Xe", null },
                    { new Guid("a1bf47e8-baa2-5ebd-a6ee-6a7fc7b1d376"), 88.905842m, 39, 3203m, "transition metal", null, 4.472m, "Johan Gadolin", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d1", 3, 1799m, "Yttrium", 5, "Solid", 0.2558m, 0m, 2557.54m, "Y", null },
                    { new Guid("a324593a-d621-599b-aab7-475c609940c3"), 28.085m, 14, 3538m, "metalloid", null, 2.329m, "Jöns Jacob Berzelius", "1s2 2s2 2p6 3s2 3p2", 14, 1687m, "Silicon", 3, "Solid", 0.7092m, 0m, 7092.2m, "Si", null },
                    { new Guid("a39db5d9-b89d-5969-a1b5-7f5c6714ad27"), 278m, 109, null, "unknown, probably transition metal", null, 37.4m, "Gesellschaft für Schwerionenforschung", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d7", 9, null, "Meitnerium", 7, "Solid", 0.0917m, 0m, 916.59m, "Mt", null },
                    { new Guid("a66c895a-b79d-5f6b-85c6-cdafc28e5229"), 10.81m, 5, 4200m, "metalloid", null, 2.08m, "Joseph Louis Gay-Lussac", "1s2 2s2 2p1", 13, 2349m, "Boron", 2, "Solid", 1.9608m, 0m, 19607.84m, "B", null },
                    { new Guid("a7cd476d-4e1a-5c6e-8989-d1a7b722f949"), 285m, 112, 3570m, "transition metal", null, 14.0m, "Gesellschaft für Schwerionenforschung", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d10", 12, null, "Copernicium", 7, "Liquid", 0.0892m, 0m, 892.06m, "Cn", null },
                    { new Guid("a7dd2cde-55e9-5839-814a-64e7cc4694ad"), 289m, 115, 1400m, "unknown, probably post-transition metal", null, 13.5m, "Joint Institute for Nuclear Research", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d10 7p3", 15, 670m, "Moscovium", 7, "Solid", 0.0869m, 0m, 868.81m, "Mc", null },
                    { new Guid("a7e4b189-5e66-503f-8129-1446f0e89c90"), 137.3277m, 56, 2118m, "alkaline earth metal", null, 3.51m, "Carl Wilhelm Scheele", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2", 2, 1000m, "Barium", 6, "Solid", 0.1783m, 0m, 1782.53m, "Ba", null },
                    { new Guid("aa969113-fc64-57ef-84a4-48de4073b9be"), 237m, 93, 4447m, "actinide", null, 20.45m, "Edwin McMillan", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f4 6d1", 3, 912m, "Neptunium", 7, "Solid", 0.1074m, 0m, 1074.11m, "Np", null },
                    { new Guid("aba161a9-29fb-520e-9102-4fedbccbdc34"), 244m, 94, 3505m, "actinide", null, 19.816m, "Glenn T. Seaborg", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f6", 3, 912.5m, "Plutonium", 7, "Solid", 0.1063m, 0m, 1062.7m, "Pu", null },
                    { new Guid("abd7f613-1704-5fd7-b773-f83c0447bc1a"), 35.45m, 17, 239.11m, "diatomic nonmetal", null, 3.2m, "Carl Wilhelm Scheele", "1s2 2s2 2p6 3s2 3p5", 17, 171.6m, "Chlorine", 3, "Gas", 0.5848m, 0m, 5847.95m, "Cl", null },
                    { new Guid("ac0a4c14-a942-5bd6-99de-41bfe8d9c52f"), 293m, 116, 1085m, "unknown, probably post-transition metal", null, 12.9m, "Joint Institute for Nuclear Research", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d10 7p4", 16, 709m, "Livermorium", 7, "Solid", 0.0861m, 0m, 861.33m, "Lv", null },
                    { new Guid("b1da1e7a-4f57-543b-8a51-e24c8817b56a"), 190.233m, 76, 5285m, "transition metal", null, 22.59m, "Smithson Tennant", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d6", 8, 3306m, "Osmium", 6, "Solid", 0.1314m, 0m, 1314.06m, "Os", null },
                    { new Guid("b208224a-de2d-560c-943f-0bb2c7ba2af6"), 9.01218315m, 4, 2742m, "alkaline earth metal", null, 1.85m, "Louis Nicolas Vauquelin", "1s2 2s2", 2, 1560m, "Beryllium", 2, "Solid", 2.439m, 0m, 24390.24m, "Be", null },
                    { new Guid("b4a209fa-9223-5c4e-afba-86859a889d46"), 74.9215956m, 33, null, "metalloid", null, 5.727m, "Bronze Age", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p3", 15, null, "Arsenic", 4, "Solid", 0.3021m, 0m, 3021.15m, "As", null },
                    { new Guid("b6716c5d-0bba-5c36-941c-749dc99c5d50"), 315m, 119, 630m, "unknown, but predicted to be an alkali metal", null, 3m, "GSI Helmholtz Centre for Heavy Ion Research", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d10 7p6 8s1", 1, null, "Ununennium", 8, "Solid", 0.084m, 0m, 839.63m, "Uue", null },
                    { new Guid("b7226f48-a69a-53ec-a4ba-198d2b326583"), 118.7107m, 50, 2875m, "post-transition metal", null, 7.365m, "unknown, before 3500 BC", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p2", 14, 505.08m, "Tin", 5, "Solid", 0.1996m, 0m, 1996.01m, "Sn", null },
                    { new Guid("b82e439f-5571-59ff-96fd-7c56768ba6b6"), 87.621m, 38, 1650m, "alkaline earth metal", null, 2.64m, "William Cruickshank (chemist)", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2", 2, 1050m, "Strontium", 5, "Solid", 0.2625m, 0m, 2624.67m, "Sr", null },
                    { new Guid("b9342ab2-521f-598e-88bf-07d0f2d6c639"), 167.2593m, 68, 3141m, "lanthanide", null, 9.066m, "Carl Gustaf Mosander", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f12", 3, 1802m, "Erbium", 6, "Solid", 0.1468m, 0m, 1468.43m, "Er", null },
                    { new Guid("badc7272-2a84-57a7-aeac-008d7957f779"), 79.904m, 35, 332m, "diatomic nonmetal", null, 3.1028m, "Antoine Jérôme Balard", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p5", 17, 265.8m, "Bromine", 4, "Liquid", 0.2849m, 0m, 2849.0m, "Br", null },
                    { new Guid("be376254-5589-5a32-9969-124a3399d1e8"), 226m, 88, 2010m, "alkaline earth metal", null, 5.5m, "Pierre Curie", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2", 2, 1233m, "Radium", 7, "Solid", 0.1135m, 0m, 1135.07m, "Ra", null },
                    { new Guid("be486576-bc22-5f06-b958-63e796074dd4"), 247m, 96, 3383m, "actinide", null, 13.51m, "Glenn T. Seaborg", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f7 6d1", 3, 1613m, "Curium", 7, "Solid", 0.1041m, 0m, 1040.58m, "Cm", null },
                    { new Guid("c1f802ab-d256-5485-9291-20f4166cee2a"), 69.7231m, 31, 2673m, "post-transition metal", null, 5.91m, "Lecoq de Boisbaudran", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p1", 13, 302.9146m, "Gallium", 4, "Solid", 0.3215m, 0m, 3215.43m, "Ga", null },
                    { new Guid("c24f5f0a-ba72-53f3-9d53-260242c40d09"), 210m, 85, 610m, "metalloid", null, 6.35m, "Dale R. Corson", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p5", 17, 575m, "Astatine", 6, "Solid", 0.1175m, 0m, 1175.09m, "At", null },
                    { new Guid("c29f59b3-833b-5f74-b5bc-170307b2ed3a"), 26.98153857m, 13, 2743m, "post-transition metal", null, 2.7m, null, "1s2 2s2 2p6 3s2 3p1", 13, 933.47m, "Aluminium", 3, "Solid", 0.7634m, 0m, 7633.59m, "Al", null },
                    { new Guid("c4207939-1228-5d7a-b9c9-b5bfd1447c43"), 174.96681m, 71, 3675m, "lanthanide", null, 9.841m, "Georges Urbain", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d1", 3, 1925m, "Lutetium", 6, "Solid", 0.1406m, 0m, 1406.47m, "Lu", null },
                    { new Guid("c55bc9f0-5191-5e83-a669-2bd276ceee42"), 178.492m, 72, 4876m, "transition metal", null, 13.31m, "Dirk Coster", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d2", 4, 2506m, "Hafnium", 6, "Solid", 0.1387m, 0m, 1386.96m, "Hf", null },
                    { new Guid("c9ee7651-9eb0-5f60-b027-2889facc6f40"), 40.0784m, 20, 1757m, "alkaline earth metal", null, 1.55m, "Humphry Davy", "1s2 2s2 2p6 3s2 3p6 4s2", 2, 1115m, "Calcium", 4, "Solid", 0.4975m, 0m, 4975.12m, "Ca", null },
                    { new Guid("ca23d8c1-e270-5836-923c-5f253a1ba4e7"), 168.934222m, 69, 2223m, "lanthanide", null, 9.32m, "Per Teodor Cleve", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f13", 3, 1818m, "Thulium", 6, "Solid", 0.1447m, 0m, 1447.18m, "Tm", null },
                    { new Guid("cfcc2167-b123-5859-96c1-c4fe22d76179"), 114.8181m, 49, 2345m, "post-transition metal", null, 7.31m, "Ferdinand Reich", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p1", 13, 429.7485m, "Indium", 5, "Solid", 0.2037m, 0m, 2036.66m, "In", null },
                    { new Guid("d1e5704b-09e3-50fa-8ad3-ca64303ca51b"), 58.69344m, 28, 3003m, "transition metal", null, 8.908m, "Axel Fredrik Cronstedt", "1s2 2s2 2p6 3s2 3p6 4s2 3d8", 10, 1728m, "Nickel", 4, "Solid", 0.3559m, 0m, 3558.72m, "Ni", null },
                    { new Guid("d2085f7e-f759-5e76-84f5-28837fd9995b"), 101.072m, 44, 4423m, "transition metal", null, 12.45m, "Karl Ernst Claus", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s1 4d7", 8, 2607m, "Ruthenium", 5, "Solid", 0.2268m, 0m, 2267.57m, "Ru", null },
                    { new Guid("d59ee2c7-2779-5631-9040-9e2c57a0add3"), 55.8452m, 26, 3134m, "transition metal", null, 7.874m, "5000 BC", "1s2 2s2 2p6 3s2 3p6 4s2 3d6", 8, 1811m, "Iron", 4, "Solid", 0.3831m, 0m, 3831.42m, "Fe", null },
                    { new Guid("d5f48658-d542-59f2-9d60-57339eb33c13"), 223m, 87, 950m, "alkali metal", null, 1.87m, "Marguerite Perey", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s1", 1, 300m, "Francium", 7, "Solid", 0.1148m, 0m, 1148.11m, "Fr", null },
                    { new Guid("d6bc4431-6e51-5aa7-8de6-fb9e9a81361f"), 157.253m, 64, 3273m, "lanthanide", null, 7.9m, "Jean Charles Galissard de Marignac", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f7 5d1", 3, 1585m, "Gadolinium", 6, "Solid", 0.156m, 0m, 1560.06m, "Gd", null },
                    { new Guid("daa6cc56-db73-5254-b543-3d0b40aa5b9c"), 24.305m, 12, 1363m, "alkaline earth metal", null, 1.738m, "Joseph Black", "1s2 2s2 2p6 3s2", 2, 923m, "Magnesium", 3, "Solid", 0.8264m, 0m, 8264.46m, "Mg", null },
                    { new Guid("dfb482a7-bceb-5dc0-bb2c-734322ad0813"), 180.947882m, 73, 5731m, "transition metal", null, 16.69m, "Anders Gustaf Ekeberg", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d3", 5, 3290m, "Tantalum", 6, "Solid", 0.1368m, 0m, 1367.99m, "Ta", null },
                    { new Guid("e7ae3973-9688-5fc4-ab88-0511f61183f6"), 269m, 106, null, "transition metal", null, 35m, "Lawrence Berkeley National Laboratory", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d4", 6, null, "Seaborgium", 7, "Solid", 0.0943m, 0m, 942.51m, "Sg", null },
                    { new Guid("e7e485f6-bb6e-5cc3-874d-1f102d2a592c"), 1.008m, 1, 20.271m, "diatomic nonmetal", null, 0.08988m, "Henry Cavendish", "1s1", 1, 13.99m, "Hydrogen", 1, "Gas", 9.0909m, 0m, 90909.09m, "H", null },
                    { new Guid("ea191efe-efc8-53bb-b639-bd4776399c36"), 294m, 118, 350m, "unknown, predicted to be noble gas", null, 4.95m, "Joint Institute for Nuclear Research", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d10 7p6", 18, null, "Oganesson", 7, "Solid", 0.0847m, 0m, 846.74m, "Og", null },
                    { new Guid("ea98b048-0000-5a4c-9bcb-9423d8278cad"), 268m, 105, null, "transition metal", null, 29.3m, "Joint Institute for Nuclear Research", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d3", 5, null, "Dubnium", 7, "Solid", 0.0951m, 0m, 951.47m, "Db", null },
                    { new Guid("eaade5bc-6b78-50be-bb57-455d4f00b4c2"), 83.7982m, 36, 119.93m, "noble gas", null, 3.749m, "William Ramsay", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6", 18, 115.78m, "Krypton", 4, "Gas", 0.277m, 0m, 2770.08m, "Kr", null },
                    { new Guid("edab2a6c-d9a7-50a7-b45a-57ad7c941b84"), 209m, 84, 1235m, "post-transition metal", null, 9.196m, "Pierre Curie", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p4", 16, 527m, "Polonium", 6, "Solid", 0.1189m, 0m, 1189.06m, "Po", null },
                    { new Guid("eefc0920-07cc-51c2-b939-b35532b0a2e7"), 20.17976m, 10, 27.104m, "noble gas", null, 0.9002m, "Morris Travers", "1s2 2s2 2p6", 18, 24.56m, "Neon", 2, "Gas", 0.9901m, 0m, 9900.99m, "Ne", null },
                    { new Guid("f43b7ebd-0b99-5f29-b141-3ffca7caff4e"), 32.06m, 16, 717.8m, "polyatomic nonmetal", null, 2.07m, "Ancient china", "1s2 2s2 2p6 3s2 3p4", 16, 388.36m, "Sulfur", 3, "Solid", 0.6211m, 0m, 6211.18m, "S", null },
                    { new Guid("f5999610-b245-5e27-a342-a9e76c1d7d54"), 78.9718m, 34, 958m, "polyatomic nonmetal", null, 4.81m, "Jöns Jakob Berzelius", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p4", 16, 494m, "Selenium", 4, "Solid", 0.2933m, 0m, 2932.55m, "Se", null },
                    { new Guid("f7519831-b73d-5595-9ef0-19044627d824"), 286m, 113, 1430m, "unknown, probably transition metal", null, 16m, "RIKEN", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f14 6d10 7p1", 13, 700m, "Nihonium", 7, "Solid", 0.0884m, 0m, 884.17m, "Nh", null },
                    { new Guid("f798d835-ae2a-5d52-9cfd-6bf278894ab5"), 207.21m, 82, 2022m, "post-transition metal", null, 11.34m, "Middle East", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p2", 14, 600.61m, "Lead", 6, "Solid", 0.1218m, 0m, 1218.03m, "Pb", null },
                    { new Guid("f902330f-503b-5a0e-82a9-ad9e9df8dbe1"), 251m, 98, 1743m, "actinide", null, 15.1m, "Lawrence Berkeley National Laboratory", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6 6s2 4f14 5d10 6p6 7s2 5f10", 3, 1173m, "Californium", 7, "Solid", 0.1019m, 0m, 1019.37m, "Cf", null },
                    { new Guid("f921d27d-3455-5a6e-a817-75e1433945f4"), 102.905502m, 45, 3968m, "transition metal", null, 12.41m, "William Hyde Wollaston", "1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s1 4d8", 9, 2237m, "Rhodium", 5, "Solid", 0.2217m, 0m, 2217.29m, "Rh", null },
                    { new Guid("f9b013f8-f521-5edd-8d1a-fa9aef108660"), 58.9331944m, 27, 3200m, "transition metal", null, 8.9m, "Georg Brandt", "1s2 2s2 2p6 3s2 3p6 4s2 3d7", 9, 1768m, "Cobalt", 4, "Solid", 0.369m, 0m, 3690.04m, "Co", null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Slug",
                table: "Categories",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("02c0258d-c69c-55b1-921b-214b4d366208"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("032ba9d1-0b52-53a9-90bc-a8a6d69affab"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("03bc62ba-ae02-58f1-afb9-107e54c83d27"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("043e2fe9-e57a-5572-a2d1-b4986394cf3f"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("05b2b365-9de6-5866-856e-b48f53169a0f"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("0964bd19-3d1b-5558-b9fd-2110b45afb29"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("0c33aadc-1a51-5807-9eb9-c89d443c3869"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("0ec5a2df-ecaf-533f-ab82-f2fd4cb9c78c"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("140adcda-6c91-5ac2-8705-8740d634766c"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("1a097f65-028a-5040-aba8-7542e8712a4d"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("1e89951c-964a-5f89-b0d7-0bc36c4c3023"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("1f674dd8-1153-5501-9de0-67c83d4f5e44"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("2019f3f9-76d7-5e23-8cbe-118c28054aeb"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("225c108d-25f9-5884-ad89-16a6303b47db"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("29d2c3fa-940f-503f-847c-e21b5bc6867d"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("2aabd701-2326-578d-8155-b256f5447423"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("2baef8e1-eaae-5adb-a3e0-2a094eeebda6"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("2c86cd31-2aa3-5eff-96a0-0eba7a634be4"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("2e9b96dd-fc46-5a13-9c0f-bbec8b8273b3"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("31da598e-de2e-5843-95a8-c62caa45e4a2"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("33343aaf-0b27-544e-8f0a-bd7d41a1daec"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("3731c1f7-414d-5589-ab5d-c38b35236720"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("40dbcde2-28fd-5f0f-bef2-27d94ed74f9d"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("40f7b563-9d8e-5e45-a786-4064aa67f489"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("412f8648-fa64-56e3-b1e1-64da94f80c56"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("41449be7-6e04-53b1-9279-4387eb18ac6f"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("42e626ea-cf36-516d-a305-be1a5075ba53"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("4546ac96-b288-5eb2-a070-ef648edbb8da"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("4b788e76-fe2b-57a6-a38d-94f2815b4ec3"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("4c8e8b94-ebc5-5d1f-a97f-cd5c42850aa1"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("4d04879a-e64f-5ad0-9e1d-14d637d2fe51"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("4dad723a-58a5-5165-bddd-77d936dc504e"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("513037a9-649b-5b2b-b831-7b14ad5086a2"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("5248be94-5f55-5f69-9540-e47559828915"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("5a6befe5-d3af-5333-8220-56cf363c4484"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("5c147fd9-1031-52e5-a479-beac2d83db0b"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("65829710-a119-51d9-bd04-46e482895570"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("65cbb62c-2e86-58f3-81de-7bdce4c927f8"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("6a0077d9-8bd6-56a1-bd93-eb1d941904ed"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("6c88aee6-8d74-570c-98d4-cdf829c038c3"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("6d094479-ecb3-50aa-85bf-f403b45cb23d"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("6e340d54-5c2c-5ec8-9a14-a654a1974d3f"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("702e7092-6d46-59a1-95bc-c332988b9205"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("7209c16b-718a-5832-a8d0-c4c360587f4f"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("7553d570-cedc-5772-9bfd-3e844413cda8"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("75d60e81-8551-57d5-a399-4767f24e8a56"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("75f225fe-75ed-53a7-a499-751b9a796ccf"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("7d2e5285-98b9-5268-a6b0-18394ef610fd"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("822999d6-ff98-5477-8165-fbf1c7c8a689"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("841ad9de-6f37-5ecc-bdea-2a2e9f769b34"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("84748e5d-b933-5fb2-96c1-666f3ad23da0"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("8784450e-80f7-5c19-9c60-937ead948601"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("8ae776da-61c0-513c-a9a2-8efadce2ae2f"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("8bc1bf9c-3e26-5cdc-a396-570cba5a6c49"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("8c280733-a046-51ed-b399-bc59c664610a"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("8eefbc09-62bd-559b-83fd-bcf92fb919f7"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("9172d1bf-a031-540e-b40b-88d3356c4556"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("9355de6f-1544-55a2-b188-0c089a579610"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("959c8c68-42fa-5e22-a1fa-3965b2494b96"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("9790cc78-3fab-5642-abb2-a62caf2dfe55"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("991df461-a72f-51c2-8c68-0a34ada90e61"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("9a86c288-3c2d-59ff-9af4-4618706c960f"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("a00c67e2-b8aa-544a-afc6-d5339eef2cae"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("a06c9891-c1aa-5f0c-b644-c5a9c7797bff"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("a1bf47e8-baa2-5ebd-a6ee-6a7fc7b1d376"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("a324593a-d621-599b-aab7-475c609940c3"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("a39db5d9-b89d-5969-a1b5-7f5c6714ad27"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("a66c895a-b79d-5f6b-85c6-cdafc28e5229"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("a7cd476d-4e1a-5c6e-8989-d1a7b722f949"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("a7dd2cde-55e9-5839-814a-64e7cc4694ad"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("a7e4b189-5e66-503f-8129-1446f0e89c90"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("aa969113-fc64-57ef-84a4-48de4073b9be"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("aba161a9-29fb-520e-9102-4fedbccbdc34"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("abd7f613-1704-5fd7-b773-f83c0447bc1a"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("ac0a4c14-a942-5bd6-99de-41bfe8d9c52f"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("b1da1e7a-4f57-543b-8a51-e24c8817b56a"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("b208224a-de2d-560c-943f-0bb2c7ba2af6"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("b4a209fa-9223-5c4e-afba-86859a889d46"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("b6716c5d-0bba-5c36-941c-749dc99c5d50"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("b7226f48-a69a-53ec-a4ba-198d2b326583"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("b82e439f-5571-59ff-96fd-7c56768ba6b6"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("b9342ab2-521f-598e-88bf-07d0f2d6c639"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("badc7272-2a84-57a7-aeac-008d7957f779"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("be376254-5589-5a32-9969-124a3399d1e8"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("be486576-bc22-5f06-b958-63e796074dd4"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("c1f802ab-d256-5485-9291-20f4166cee2a"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("c24f5f0a-ba72-53f3-9d53-260242c40d09"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("c29f59b3-833b-5f74-b5bc-170307b2ed3a"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("c4207939-1228-5d7a-b9c9-b5bfd1447c43"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("c55bc9f0-5191-5e83-a669-2bd276ceee42"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("c9ee7651-9eb0-5f60-b027-2889facc6f40"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("ca23d8c1-e270-5836-923c-5f253a1ba4e7"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("cfcc2167-b123-5859-96c1-c4fe22d76179"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("d1e5704b-09e3-50fa-8ad3-ca64303ca51b"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("d2085f7e-f759-5e76-84f5-28837fd9995b"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("d59ee2c7-2779-5631-9040-9e2c57a0add3"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("d5f48658-d542-59f2-9d60-57339eb33c13"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("d6bc4431-6e51-5aa7-8de6-fb9e9a81361f"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("daa6cc56-db73-5254-b543-3d0b40aa5b9c"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("dfb482a7-bceb-5dc0-bb2c-734322ad0813"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("e7ae3973-9688-5fc4-ab88-0511f61183f6"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("e7e485f6-bb6e-5cc3-874d-1f102d2a592c"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("ea191efe-efc8-53bb-b639-bd4776399c36"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("ea98b048-0000-5a4c-9bcb-9423d8278cad"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("eaade5bc-6b78-50be-bb57-455d4f00b4c2"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("edab2a6c-d9a7-50a7-b45a-57ad7c941b84"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("eefc0920-07cc-51c2-b939-b35532b0a2e7"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("f43b7ebd-0b99-5f29-b141-3ffca7caff4e"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("f5999610-b245-5e27-a342-a9e76c1d7d54"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("f7519831-b73d-5595-9ef0-19044627d824"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("f798d835-ae2a-5d52-9cfd-6bf278894ab5"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("f902330f-503b-5a0e-82a9-ad9e9df8dbe1"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("f921d27d-3455-5a6e-a817-75e1433945f4"));

            migrationBuilder.DeleteData(
                table: "ChemicalElements",
                keyColumn: "Id",
                keyValue: new Guid("f9b013f8-f521-5edd-8d1a-fa9aef108660"));

            migrationBuilder.DropColumn(
                name: "AtomicMass",
                table: "ChemicalElements");

            migrationBuilder.DropColumn(
                name: "BoilingPoint",
                table: "ChemicalElements");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "ChemicalElements");

            migrationBuilder.DropColumn(
                name: "Color",
                table: "ChemicalElements");

            migrationBuilder.DropColumn(
                name: "Density",
                table: "ChemicalElements");

            migrationBuilder.DropColumn(
                name: "DiscoveredBy",
                table: "ChemicalElements");

            migrationBuilder.DropColumn(
                name: "ElectronConfiguration",
                table: "ChemicalElements");

            migrationBuilder.DropColumn(
                name: "Group",
                table: "ChemicalElements");

            migrationBuilder.DropColumn(
                name: "MeltingPoint",
                table: "ChemicalElements");

            migrationBuilder.DropColumn(
                name: "Period",
                table: "ChemicalElements");

            migrationBuilder.DropColumn(
                name: "Phase",
                table: "ChemicalElements");

            migrationBuilder.DropColumn(
                name: "YearDiscovered",
                table: "ChemicalElements");
        }
    }
}
