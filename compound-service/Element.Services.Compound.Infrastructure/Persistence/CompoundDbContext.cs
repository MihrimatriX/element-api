using Element.Services.Compound.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Compound.Infrastructure.Persistence;

public class CompoundDbContext : DbContext
{
    public CompoundDbContext(DbContextOptions<CompoundDbContext> options) : base(options)
    {
    }

    public DbSet<ChemicalCompound> Compounds => Set<ChemicalCompound>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ChemicalCompound>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.HasIndex(e => e.ElementSymbol);
            entity.HasIndex(e => e.Kind);
            entity.Property(e => e.Slug).IsRequired().HasMaxLength(80);
            entity.Property(e => e.Formula).IsRequired().HasMaxLength(40);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(120);
            entity.Property(e => e.NameTr).IsRequired().HasMaxLength(120);
            entity.Property(e => e.Kind).IsRequired().HasMaxLength(20);
            entity.Property(e => e.ElementSymbol).IsRequired().HasMaxLength(10);
            entity.Property(e => e.GramsPerUnit).HasColumnType("numeric(18,4)");
            entity.Property(e => e.PriceMult).HasColumnType("numeric(18,4)");
            entity.Property(e => e.Summary).HasMaxLength(600);
            entity.Property(e => e.ImageUrl).HasMaxLength(500);
        });
    }
}
