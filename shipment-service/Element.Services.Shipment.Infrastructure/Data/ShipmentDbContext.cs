using Element.Services.Shipment.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Shipment.Infrastructure.Data;

/// <summary>EF Core context for the shipment database; its single table holds one row per shipped or failed order.</summary>
public class ShipmentDbContext : DbContext
{
    /// <summary>Creates the context with options configured by the host (Npgsql in production, in-memory in tests).</summary>
    public ShipmentDbContext(DbContextOptions<ShipmentDbContext> options) : base(options) { }

    /// <summary>All shipment records, stored in the "Shipments" table.</summary>
    public DbSet<ShipmentRecord> Shipments => Set<ShipmentRecord>();

    /// <summary>
    /// Maps <see cref="ShipmentRecord"/> to the "Shipments" table with <c>Id</c> as primary key,
    /// a unique index on <c>OrderId</c> and a lookup index on <c>TrackingNumber</c>.
    /// </summary>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var shipment = modelBuilder.Entity<ShipmentRecord>();
        shipment.HasKey(s => s.Id);
        // One shipment per order: the database, not a read-then-insert, decides concurrent duplicates.
        shipment.HasIndex(s => s.OrderId).IsUnique();
        shipment.HasIndex(s => s.TrackingNumber);
        shipment.ToTable("Shipments");
    }
}
