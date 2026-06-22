function pad2(n) {
    return String(n).padStart(2, '0');
}
/** HealthChecks.UI TimeSpan format: HH:mm:ss.fffffff */
export function formatDuration(ms) {
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    const frac = Math.round((ms % 1000) * 10_000);
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}.${String(frac).padStart(7, '0')}`;
}
export function buildHealthUiResponse(checks) {
    const totalStart = performance.now();
    const entries = {};
    for (const check of checks) {
        entries[check.name] = {
            data: {},
            description: check.description ?? null,
            duration: formatDuration(check.durationMs),
            status: check.ok ? 'Healthy' : 'Unhealthy',
            tags: [],
        };
    }
    const allHealthy = checks.every((c) => c.ok);
    const totalMs = performance.now() - totalStart + checks.reduce((sum, c) => sum + c.durationMs, 0);
    return {
        status: allHealthy ? 'Healthy' : 'Unhealthy',
        totalDuration: formatDuration(totalMs),
        entries,
    };
}
