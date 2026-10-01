using Element.Services.Identity.Core.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Identity.Infrastructure.Persistence;

/// <summary>EF Core context of the identity database: the ASP.NET Identity tables plus API keys and webhook subscriptions.</summary>
public class IdentityAppDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    /// <summary>Creates the context with the options registered in Program.cs (PostgreSQL).</summary>
    public IdentityAppDbContext(DbContextOptions<IdentityAppDbContext> options) : base(options)
    {
    }

    /// <summary>Issued API keys (hashes only).</summary>
    public DbSet<ApiKey> ApiKeys => Set<ApiKey>();

    /// <summary>Webhook endpoints registered by users.</summary>
    public DbSet<WebhookSubscription> WebhookSubscriptions => Set<WebhookSubscription>();

    /// <summary>Adds column limits, indexes and cascade deletes for the custom tables on top of the Identity schema.</summary>
    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApiKey>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.KeyHash).IsRequired().HasMaxLength(256);
            entity.Property(e => e.MaskedKey).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Description).HasMaxLength(200);

            entity.HasIndex(e => e.KeyHash).IsUnique();

            entity.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<WebhookSubscription>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Url).IsRequired().HasMaxLength(2048);
            entity.Property(e => e.Secret).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Events).IsRequired().HasMaxLength(256);

            entity.HasIndex(e => e.UserId);

            entity.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
