using System.Net;
using System.Net.Mail;

namespace Element.Services.Identity.API;

public interface IAccountMailer
{
    bool Enabled { get; }
    Task SendAsync(string email, string subject, string message, CancellationToken ct);
}
public sealed class AccountMailer(IConfiguration configuration) : IAccountMailer
{
    public bool Enabled => !string.IsNullOrWhiteSpace(configuration["Mail:Host"]) && !string.IsNullOrWhiteSpace(configuration["Mail:From"]);
    public async Task SendAsync(string email, string subject, string message, CancellationToken ct)
    {
        if (!Enabled) throw new InvalidOperationException("Account email is not configured.");
        using var client = new SmtpClient(configuration["Mail:Host"], configuration.GetValue("Mail:Port", 587))
        {
            EnableSsl = configuration.GetValue("Mail:EnableSsl", true),
            Credentials = new NetworkCredential(configuration["Mail:Username"], configuration["Mail:Password"]),
            Timeout = 10000,
        };
        using var mail = new MailMessage(configuration["Mail:From"]!, email, subject, message);
        await client.SendMailAsync(mail, ct);
    }
}
