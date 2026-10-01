using System.Net;
using System.Net.Mail;

namespace Element.Services.Identity.API;

/// <summary>Sends account e-mails (password reset, address verification) and reports whether mail is configured at all.</summary>
public interface IAccountMailer
{
    /// <summary>True when an SMTP host and a sender address are configured.</summary>
    bool Enabled { get; }

    /// <summary>Sends one plain-text e-mail.</summary>
    Task SendAsync(string email, string subject, string message, CancellationToken ct);
}

/// <summary>SMTP implementation of <see cref="IAccountMailer"/>, configured through the <c>Mail:*</c> settings.</summary>
public sealed class AccountMailer(IConfiguration configuration) : IAccountMailer
{
    private const int DefaultSmtpPort = 587;
    private static readonly TimeSpan SendTimeout = TimeSpan.FromSeconds(10);

    /// <inheritdoc />
    public bool Enabled =>
        !string.IsNullOrWhiteSpace(configuration["Mail:Host"])
        && !string.IsNullOrWhiteSpace(configuration["Mail:From"]);

    /// <inheritdoc />
    public async Task SendAsync(string email, string subject, string message, CancellationToken ct)
    {
        if (!Enabled)
        {
            throw new InvalidOperationException("Account email is not configured.");
        }

        var smtpPort = configuration.GetValue("Mail:Port", DefaultSmtpPort);
        using var smtpClient = new SmtpClient(configuration["Mail:Host"], smtpPort)
        {
            EnableSsl = configuration.GetValue("Mail:EnableSsl", true),
            Credentials = new NetworkCredential(configuration["Mail:Username"], configuration["Mail:Password"]),
        };

        using var mailMessage = new MailMessage(configuration["Mail:From"]!, email, subject, message);
        // SmtpClient.Timeout only applies to synchronous Send; bound the async send explicitly.
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(SendTimeout);
        await smtpClient.SendMailAsync(mailMessage, timeout.Token);
    }
}
