using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Element.Services.Element.Infrastructure.Persistence.Migrations;

/// <summary>
/// PriceHistories grew ~680k rows/day with no retention and no time index. Trim once (PriceSimulator keeps
/// it trimmed from now on), then index the exact shape every history query uses:
/// lower("ElementSymbol") = @s AND "Timestamp" ... ORDER BY "Timestamp".
/// </summary>
[DbContext(typeof(ElementDbContext))]
[Migration("20261001000000_PriceHistoryRetentionIndex")]
public partial class PriceHistoryRetentionIndex : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""DELETE FROM "PriceHistories" WHERE "Timestamp" < now() - interval '2 days';""");
        migrationBuilder.Sql("""CREATE INDEX IF NOT EXISTS "IX_PriceHistories_lower_ElementSymbol_Timestamp" ON "PriceHistories" (lower("ElementSymbol"), "Timestamp");""");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""DROP INDEX IF EXISTS "IX_PriceHistories_lower_ElementSymbol_Timestamp";""");
    }
}
