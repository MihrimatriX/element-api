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
        modelBuilder.Entity<ShipmentRecord>().ToTable("Shipments");
    }
}
