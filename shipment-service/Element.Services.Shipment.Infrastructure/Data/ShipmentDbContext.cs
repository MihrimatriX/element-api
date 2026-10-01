using Element.Services.Shipment.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Shipment.Infrastructure.Data;

public class ShipmentDbContext : DbContext
{
    public ShipmentDbContext(DbContextOptions<ShipmentDbContext> options) : base(options) { }

    public DbSet<ShipmentRecord> Shipments => Set<ShipmentRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<ShipmentRecord>().HasKey(s => s.Id);
        // One shipment per order: the database, not a read-then-insert, decides concurrent duplicates.
        modelBuilder.Entity<ShipmentRecord>().HasIndex(s => s.OrderId).IsUnique();
        modelBuilder.Entity<ShipmentRecord>().HasIndex(s => s.TrackingNumber);
        modelBuilder.Entity<ShipmentRecord>().ToTable("Shipments");
    }
}
