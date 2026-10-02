using System.Text.Json;
using Element.Services.Identity.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Identity.API.Controllers;

/// <summary>
/// Stores a signed-in user's learning progress (discovered compounds, finished lessons) so it follows them across devices.
/// </summary>
[Authorize]
[ApiController]
[Route("api/v1/auth/learning")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class LearningController(IdentityAppDbContext database) : ControllerBase
{
    /// <summary>LoginProvider value that marks learning rows in the AspNetUserTokens table.</summary>
    public const string ProgressTokenProvider = "ElementLearning.v1";

    private const string DiscoveryPrefix = "discovery:";
    private const string LessonPrefix = "lesson:";

    // ponytail: allowlist is web-app JSON copied into the identity image (csproj Content). scientific-compounds.json is the compound-service snapshot, not a second allowlist.
    private static readonly HashSet<string> KnownDiscoverySlugs = LoadKnownDiscoverySlugs();

    // Lesson id -> the discovery slugs that lesson requires.
    private static readonly Dictionary<string, string[]> LessonRequirements = LoadLessonRequirements();

    /// <summary>Learning progress as the web app sends and receives it.</summary>
    public sealed record Progress(string[] Discoveries, string[] Lessons);

    private Guid CurrentUserId => Guid.Parse(User.GetUserIdValue()!);

    /// <summary>Returns the caller's stored progress.</summary>
    [HttpGet]
    public async Task<Progress> Get(CancellationToken ct) => await ReadProgressAsync(CurrentUserId, ct);

    /// <summary>Adds the given discoveries and lessons to the stored progress (never removes anything) and returns the result.</summary>
    [HttpPut]
    public async Task<ActionResult<Progress>> Merge(Progress progress, CancellationToken ct)
    {
        if (!IsKnownProgress(progress))
        {
            return BadRequest(new { message = "İlerleme kaydı geçersiz." });
        }

        var userId = CurrentUserId;
        await using var transaction = await database.Database.BeginTransactionAsync(ct);

        // Reuse the Identity user-token table: every achievement is its own row with a unique key,
        // so concurrent devices add to the progress instead of overwriting each other.
        // The web client re-sends its full set on every change: insert only what is new (one round trip each).
        var storedProgress = await ReadProgressAsync(userId, ct);
        foreach (var slug in progress.Discoveries.Except(storedProgress.Discoveries).Order())
        {
            await InsertAchievementAsync(userId, DiscoveryPrefix + slug, ct);
        }

        // A lesson only counts once every discovery it requires is stored.
        var progressWithNewDiscoveries = await ReadProgressAsync(userId, ct);
        foreach (var lessonId in progress.Lessons.Except(storedProgress.Lessons).Order())
        {
            var requiredSlugs = LessonRequirements[lessonId];
            if (requiredSlugs.All(progressWithNewDiscoveries.Discoveries.Contains))
            {
                await InsertAchievementAsync(userId, LessonPrefix + lessonId, ct);
            }
        }

        await transaction.CommitAsync(ct);
        return await ReadProgressAsync(userId, ct);
    }

    // Only slugs and lesson ids from the bundled catalogue are accepted, so clients cannot store made-up achievements.
    private static bool IsKnownProgress(Progress progress)
    {
        if (progress.Discoveries is null || progress.Lessons is null)
        {
            return false;
        }

        var tooManyItems = progress.Discoveries.Length > KnownDiscoverySlugs.Count
            || progress.Lessons.Length > LessonRequirements.Count;
        if (tooManyItems)
        {
            return false;
        }

        return progress.Discoveries.All(slug => KnownDiscoverySlugs.Contains(slug))
            && progress.Lessons.All(lessonId => lessonId is not null && LessonRequirements.ContainsKey(lessonId));
    }

    private static HashSet<string> LoadKnownDiscoverySlugs()
    {
        using var document = ReadBundledJson("known-compounds.json");
        return document.RootElement
            .EnumerateArray()
            .Select(compound => compound.GetProperty("slug").GetString()!)
            .ToHashSet(StringComparer.Ordinal);
    }

    private static Dictionary<string, string[]> LoadLessonRequirements()
    {
        using var document = ReadBundledJson("lessons.json");
        return document.RootElement.EnumerateArray().ToDictionary(
            lesson => lesson.GetProperty("id").GetString()!,
            lesson => lesson.GetProperty("discoveries").EnumerateArray().Select(slug => slug.GetString()!).ToArray(),
            StringComparer.Ordinal);
    }

    // The csproj copies these files from web-app/src/data into the Data folder next to the binary.
    private static JsonDocument ReadBundledJson(string fileName)
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Data", fileName);
        return JsonDocument.Parse(System.IO.File.ReadAllText(path));
    }

    // ON CONFLICT DO NOTHING makes the insert idempotent: sending known progress again is harmless.
    private Task InsertAchievementAsync(Guid userId, string achievementName, CancellationToken ct)
    {
        return database.Database.ExecuteSqlInterpolatedAsync(
            $"INSERT INTO \"AspNetUserTokens\" (\"UserId\", \"LoginProvider\", \"Name\", \"Value\") VALUES ({userId}, {ProgressTokenProvider}, {achievementName}, '1') ON CONFLICT DO NOTHING",
            ct);
    }

    private async Task<Progress> ReadProgressAsync(Guid userId, CancellationToken ct)
    {
        var achievementNames = await database.UserTokens
            .Where(token => token.UserId == userId && token.LoginProvider == ProgressTokenProvider)
            .Select(token => token.Name)
            .ToArrayAsync(ct);

        var discoveries = NamesWithoutPrefix(achievementNames, DiscoveryPrefix);
        var lessons = NamesWithoutPrefix(achievementNames, LessonPrefix);
        return new Progress(discoveries, lessons);
    }

    private static string[] NamesWithoutPrefix(IEnumerable<string> names, string prefix)
    {
        return names
            .Where(name => name.StartsWith(prefix))
            .Select(name => name[prefix.Length..])
            .Order()
            .ToArray();
    }
}
