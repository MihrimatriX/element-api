using System.Security.Claims;
using System.Text.Json;
using Element.Services.Identity.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Identity.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/auth/learning")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class LearningController(IdentityAppDbContext database) : ControllerBase
{
    private const string Provider = "ElementLearning.v1";
    // ponytail: allowlist is web-app JSON copied into the identity image (csproj Content). scientific-compounds.json is the compound-service snapshot, not a second allowlist.
    private static readonly HashSet<string> Discoveries = LoadDiscoveries();
    private static readonly Dictionary<string, string[]> Lessons = LoadLessons();
    public sealed record Progress(string[] Discoveries, string[] Lessons);
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);

    [HttpGet]
    public async Task<Progress> Get(CancellationToken ct) => await Read(UserId, ct);

    [HttpPut]
    public async Task<ActionResult<Progress>> Merge(Progress progress, CancellationToken ct)
    {
        if (progress.Discoveries is null || progress.Lessons is null || progress.Discoveries.Length > Discoveries.Count || progress.Lessons.Length > Lessons.Count
            || progress.Discoveries.Any(id => !Discoveries.Contains(id)) || progress.Lessons.Any(id => id is null || !Lessons.ContainsKey(id)))
            return BadRequest(new { message = "İlerleme kaydı geçersiz." });
        var userId = UserId;
        await using var transaction = await database.Database.BeginTransactionAsync(ct);
        // Reuse the existing Identity user-token table. Each achievement has its
        // own unique key; concurrent devices cannot overwrite one another.
        foreach (var id in progress.Discoveries.Distinct().Order()) await Insert(userId, "discovery:" + id, ct);
        var merged = await Read(userId, ct);
        foreach (var id in progress.Lessons.Distinct().Order())
            if (Lessons[id].All(merged.Discoveries.Contains)) await Insert(userId, "lesson:" + id, ct);
        await transaction.CommitAsync(ct);
        return await Read(userId, ct);
    }
    private static HashSet<string> LoadDiscoveries()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Data", "known-compounds.json");
        using var doc = JsonDocument.Parse(System.IO.File.ReadAllText(path));
        return doc.RootElement.EnumerateArray().Select(item => item.GetProperty("slug").GetString()!).ToHashSet(StringComparer.Ordinal);
    }
    private static Dictionary<string, string[]> LoadLessons()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Data", "lessons.json");
        using var doc = JsonDocument.Parse(System.IO.File.ReadAllText(path));
        return doc.RootElement.EnumerateArray().ToDictionary(
            item => item.GetProperty("id").GetString()!,
            item => item.GetProperty("discoveries").EnumerateArray().Select(value => value.GetString()!).ToArray(),
            StringComparer.Ordinal);
    }
    private Task Insert(Guid userId, string name, CancellationToken ct) => database.Database.ExecuteSqlInterpolatedAsync(
        $"INSERT INTO \"AspNetUserTokens\" (\"UserId\", \"LoginProvider\", \"Name\", \"Value\") VALUES ({userId}, {Provider}, {name}, '1') ON CONFLICT DO NOTHING", ct);
    private async Task<Progress> Read(Guid userId, CancellationToken ct)
    {
        var names = await database.UserTokens.Where(t => t.UserId == userId && t.LoginProvider == Provider).Select(t => t.Name).ToArrayAsync(ct);
        return new(names.Where(n => n.StartsWith("discovery:")).Select(n => n[10..]).Order().ToArray(),
            names.Where(n => n.StartsWith("lesson:")).Select(n => n[7..]).Order().ToArray());
    }
}
