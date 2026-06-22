using Element.Services.Shipment.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Shipment.Infrastructure.Data;

public class ShipmentDbContext : DbContext
{
    public ShipmentDbContext(DbContextOptions<ShipmentDbContext> options) : base(options) { }

    public DbSet<Core.Entities.Shipment> Shipments => Set<Core.Entities.Shipment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<Core.Entities.Shipment>().HasKey(s => s.Id);
    }
}
