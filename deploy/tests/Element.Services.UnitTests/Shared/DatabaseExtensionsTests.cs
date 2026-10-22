using System.Net.Sockets;
using Element.Shared.Extensions;
using FluentAssertions;
using Npgsql;

namespace Element.Services.UnitTests.Shared;

/// <summary>
/// Startup waits for Postgres only on failures that waiting can fix; anything else must fail fast so the
/// error is visible instead of hidden behind 30 retries.
/// </summary>
public class DatabaseExtensionsTests
{
    [Fact]
    public void PostgresStillBooting_IsWorthWaitingFor()
    {
        // 57P03 cannot_connect_now: "the database system is starting up".
        var starting = new PostgresException("the database system is starting up", "FATAL", "FATAL", "57P03");

        DatabaseExtensions.IsTransientStartupError(starting).Should().BeTrue();
    }

    [Fact]
    public void ConnectionRefused_IsWorthWaitingFor_EvenWhenWrappedByEf()
    {
        var refused = new NpgsqlException("Failed to connect", new SocketException((int)SocketError.ConnectionRefused));
        var wrapped = new InvalidOperationException("An exception has been raised that is likely due to a transient failure.", refused);

        DatabaseExtensions.IsTransientStartupError(refused).Should().BeTrue();
        DatabaseExtensions.IsTransientStartupError(wrapped).Should().BeTrue();
    }

    [Fact]
    public void WrongPassword_FailsFast()
    {
        // 28P01 invalid_password: waiting will not fix it.
        var badPassword = new PostgresException("password authentication failed", "FATAL", "FATAL", "28P01");

        DatabaseExtensions.IsTransientStartupError(badPassword).Should().BeFalse();
    }

    [Fact]
    public void BrokenMigration_FailsFast()
    {
        // 42P07 duplicate_table, i.e. a migration bug.
        var broken = new PostgresException("relation already exists", "ERROR", "ERROR", "42P07");

        DatabaseExtensions.IsTransientStartupError(broken).Should().BeFalse();
        DatabaseExtensions.IsTransientStartupError(new InvalidOperationException("model mismatch")).Should().BeFalse();
    }
}
