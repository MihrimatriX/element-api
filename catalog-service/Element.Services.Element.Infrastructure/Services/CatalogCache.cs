using System;
using System.Collections.Generic;
using StackExchange.Redis;

namespace Element.Services.Element.Infrastructure.Services;

public static class CatalogCache
{
    public const string ListIndexKey = "elements:list:keys";

    public static async Task TrackListKeyAsync(IDatabase db, string cacheKey)
    {
        if (cacheKey.StartsWith("elements:list:", StringComparison.Ordinal))
            await db.SetAddAsync(ListIndexKey, cacheKey);
    }

    public static async Task EvictElementAsync(IConnectionMultiplexer redis, string symbol)
    {
        var db = redis.GetDatabase();
        var sym = symbol.ToLowerInvariant();
        var keys = new List<RedisKey>
        {
            $"element:dto:{sym}",
            $"element:{sym}",
            ListIndexKey
        };
        var indexed = await db.SetMembersAsync(ListIndexKey);
        foreach (var member in indexed)
            keys.Add((string)member!);
        await db.KeyDeleteAsync(keys.ToArray());
    }
}
