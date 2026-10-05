using System.ComponentModel.DataAnnotations;
using Element.Services.Identity.Core.Entities;
using Element.Services.Identity.Infrastructure.Persistence;
using Element.Services.Identity.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Identity.API.Controllers;

/// <summary>
/// Self-service account endpoints: profile, data export, account deletion, password change/reset and e-mail verification.
/// </summary>
[ApiController]
[Route("api/v1/auth")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class AccountSecurityController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IAccountMailer mailer,
    IConfiguration configuration,
    IdentityAppDbContext database,
    ICaptchaVerifier captchaVerifier,
    ILogger<AccountSecurityController> logger) : ControllerBase
{
    private const string DefaultPublicWebOrigin = "http://localhost:5173";

    // The user has to type this phrase to confirm that the account should really be deleted.
    private const string DeleteConfirmationPhrase = "HESABIMI SİL";

    private const string ExportScopeNote =
        "Identity and learning data. Simulation wallet, orders and shipments are separate technical records.";

    private const string InvalidVerificationLinkMessage = "Doğrulama bağlantısı geçersiz veya süresi dolmuş.";
    private const string WrongDeleteConfirmationMessage = "Şifre veya silme onayı yanlış.";
    private const string WrongPasswordChangeMessage = "Mevcut şifre yanlış veya yeni şifre koşulları sağlanmıyor.";

    // Rows in AspNetUserTokens that remember when the last account mail went out (one row per purpose).
    private const string MailThrottleTokenProvider = "ElementMail.v1";
    private static readonly TimeSpan MailThrottleWindow = TimeSpan.FromMinutes(2);

    // Request bounds match RegisterRequest/LoginRequest (email 254, password 1024).

    /// <summary>Body of POST delete: the current password and the typed confirmation phrase.</summary>
    public sealed record DeleteRequest([Required, MaxLength(1024)] string Password, [Required, MaxLength(64)] string Confirmation);

    /// <summary>Body of POST password/forgot.</summary>
    public sealed record EmailRequest([Required, EmailAddress, MaxLength(254)] string Email);

    /// <summary>Body of POST email/verify: the address and the token from the verification link.</summary>
    public sealed record VerifyRequest([Required, EmailAddress, MaxLength(254)] string Email, [Required, MaxLength(2048)] string Token);

    /// <summary>Body of POST password/reset: the address, the token from the reset link and the new password.</summary>
    public sealed record ResetRequest(
        [Required, EmailAddress, MaxLength(254)] string Email,
        [Required, MaxLength(2048)] string Token,
        [Required, MinLength(10), MaxLength(1024)] string Password);

    /// <summary>Body of POST password/change.</summary>
    public sealed record ChangeRequest(
        [Required, MaxLength(1024)] string CurrentPassword,
        [Required, MinLength(10), MaxLength(1024)] string Password);

    /// <summary>Base URL of the web app; links in account e-mails point there.</summary>
    private string PublicWebOrigin => (configuration["PUBLIC_WEB_ORIGIN"] ?? DefaultPublicWebOrigin).TrimEnd('/');

    /// <summary>Returns everything this service stores about the caller, without password hash, security stamp or raw API keys.</summary>
    [Authorize, HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var user = await FindCurrentUserAsync();
        if (user is null)
        {
            return Unauthorized();
        }

        var learning = await database.UserTokens
            .AsNoTracking()
            .Where(token => token.UserId == user.Id && token.LoginProvider == LearningController.ProgressTokenProvider)
            .Select(token => token.Name)
            .ToArrayAsync();
        var apiKeys = await database.ApiKeys
            .AsNoTracking()
            .Where(key => key.UserId == user.Id)
            .Select(key => new { key.Description, key.MaskedKey, key.IsActive, key.CreatedAt })
            .ToArrayAsync();
        var webhooks = await database.WebhookSubscriptions
            .AsNoTracking()
            .Where(webhook => webhook.UserId == user.Id)
            .Select(webhook => new { webhook.Url, webhook.Events })
            .ToArrayAsync();

        return Ok(new
        {
            exportedAt = DateTimeOffset.UtcNow,
            profile = ToProfile(user),
            learning,
            apiKeys,
            webhooks,
            scope = ExportScopeNote,
        });
    }

    /// <summary>
    /// Deletes the account once the confirmation phrase and the password match; keys, webhooks and progress cascade with it.
    /// Wrong passwords count toward the login lockout (429 once locked).
    /// </summary>
    [Authorize, HttpPost("delete")]
    public async Task<IActionResult> Delete(DeleteRequest request)
    {
        var user = await FindCurrentUserAsync();
        if (user is null)
        {
            return Unauthorized();
        }

        if (request.Confirmation != DeleteConfirmationPhrase)
        {
            return BadRequest(new { message = WrongDeleteConfirmationMessage });
        }

        if (await ConfirmPasswordAsync(user, request.Password, WrongDeleteConfirmationMessage) is { } problem)
        {
            return problem;
        }

        var result = await userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            return Conflict(new { message = "Hesap silinemedi. Yeniden deneyebilirsin." });
        }

        return Ok(new { message = "Hesabın ve öğrenme kayıtların silindi. Oturumların ve API anahtarların kapatıldı." });
    }

    /// <summary>Tells the web app which optional features (mail recovery, e-mail verification, captcha) this deployment has.</summary>
    [HttpGet("capabilities")]
    public IActionResult Capabilities()
    {
        return Ok(new
        {
            passwordRecovery = mailer.Enabled,
            emailVerification = mailer.Enabled,
            captcha = captchaVerifier.Enabled,
        });
    }

    /// <summary>
    /// E-mails a password reset link (at most once per account per 2 minutes); the answer is the same
    /// whether or not the address has an account.
    /// </summary>
    [HttpPost("password/forgot")]
    public async Task<IActionResult> Forgot(EmailRequest request)
    {
        if (!mailer.Enabled)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new { message = "E-postasız beta: e-posta ile şifre kurtarma henüz yapılandırılmadı." });
        }

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is not null && await TryClaimMailSlotAsync(user, "reset"))
        {
            var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
            var resetLink = BuildEmailLink("reset-password", user.Email!, resetToken);
            var body = $"Şifreni yenilemek için bağlantıyı aç:\n{resetLink}\n\nBu isteği sen yapmadıysan bağlantıyı kullanma.";
            // Not awaited: SMTP latency or failure would otherwise tell which addresses have accounts.
            _ = mailer.SendAsync(user.Email!, "ElementAPI şifre yenileme", body, CancellationToken.None)
                .ContinueWith(
                    task => logger.LogWarning(task.Exception, "Password reset mail failed or timed out"),
                    TaskContinuationOptions.NotOnRanToCompletion);
        }

        return Accepted(new { message = "Bu adresle bir hesap varsa şifre yenileme bağlantısı gönderildi." });
    }

    /// <summary>Sets a new password from a reset link, clears any lockout and deactivates all API keys of the account.</summary>
    [HttpPost("password/reset")]
    public async Task<IActionResult> Reset(ResetRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return BadRequest(new { message = "Bağlantı geçersiz veya süresi dolmuş." });
        }

        await using var transaction = await database.Database.BeginTransactionAsync();

        var result = await userManager.ResetPasswordAsync(user, request.Token, request.Password);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = "Bağlantı geçersiz, süresi dolmuş veya şifre koşulları sağlanmıyor." });
        }

        await userManager.ResetAccessFailedCountAsync(user);
        await userManager.SetLockoutEndDateAsync(user, null);
        await DeactivateApiKeysAsync(user);
        await transaction.CommitAsync();

        return Ok(new { message = "Şifren yenilendi. Yeniden giriş yapabilirsin." });
    }

    /// <summary>
    /// Changes the password of the signed-in user; old sessions and all API keys stop working.
    /// Wrong current passwords count toward the login lockout (429 once locked).
    /// </summary>
    [Authorize, HttpPost("password/change")]
    public async Task<IActionResult> Change(ChangeRequest request)
    {
        var user = await FindCurrentUserAsync();
        if (user is null)
        {
            return Unauthorized();
        }

        // Checked before the transaction so a rollback cannot undo the failed-attempt count.
        if (await ConfirmPasswordAsync(user, request.CurrentPassword, WrongPasswordChangeMessage) is { } problem)
        {
            return problem;
        }

        await using var transaction = await database.Database.BeginTransactionAsync();

        var result = await userManager.ChangePasswordAsync(user, request.CurrentPassword, request.Password);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = WrongPasswordChangeMessage });
        }

        await DeactivateApiKeysAsync(user);
        await transaction.CommitAsync();

        return Ok(new { message = "Şifren değişti. Tüm cihazlarda yeniden giriş yapmalısın." });
    }

    /// <summary>Returns the signed-in user's profile.</summary>
    [Authorize, HttpGet("profile")]
    public async Task<IActionResult> Profile()
    {
        var user = await FindCurrentUserAsync();
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(ToProfile(user));
    }

    /// <summary>
    /// E-mails an address verification link to the signed-in user (nothing is sent when already verified,
    /// or when a verification mail already went out in the last 2 minutes).
    /// </summary>
    [Authorize, HttpPost("email/send-verification")]
    public async Task<IActionResult> SendVerification(CancellationToken ct)
    {
        if (!mailer.Enabled)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                new { message = "E-posta doğrulama bu kurulumda yapılandırılmadı." });
        }

        var user = await FindCurrentUserAsync();
        if (user is null)
        {
            return Unauthorized();
        }

        if (!user.EmailConfirmed && await TryClaimMailSlotAsync(user, "verify"))
        {
            var confirmationToken = await userManager.GenerateEmailConfirmationTokenAsync(user);
            var verificationLink = BuildEmailLink("verify-email", user.Email!, confirmationToken);
            var body = $"Adresini doğrulamak için bağlantıyı aç:\n{verificationLink}";
            await mailer.SendAsync(user.Email!, "ElementAPI e-posta doğrulama", body, ct);
        }

        return Accepted(new { message = "Doğrulama bağlantısı e-posta adresine gönderildi." });
    }

    /// <summary>Marks the e-mail address as verified using the token from the verification link.</summary>
    [HttpPost("email/verify")]
    public async Task<IActionResult> Verify(VerifyRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return BadRequest(new { message = InvalidVerificationLinkMessage });
        }

        var result = await userManager.ConfirmEmailAsync(user, request.Token);
        if (!result.Succeeded)
        {
            return BadRequest(new { message = InvalidVerificationLinkMessage });
        }

        return Ok(new { message = "E-posta adresin doğrulandı." });
    }

    /// <summary>Loads the account named in the JWT, or null when it no longer exists.</summary>
    private async Task<ApplicationUser?> FindCurrentUserAsync()
    {
        return await userManager.FindByIdAsync(User.GetUserIdValue() ?? "");
    }

    /// <summary>
    /// Checks the password with the same 5-try lockout as login, so a stolen JWT is not an unlimited password oracle.
    /// Returns null on success, 429 when the account is locked, otherwise 400 with <paramref name="wrongPasswordMessage"/>.
    /// Must run outside any transaction that a failure rolls back, or the failed-attempt count is rolled back with it.
    /// </summary>
    private async Task<IActionResult?> ConfirmPasswordAsync(ApplicationUser user, string password, string wrongPasswordMessage)
    {
        var check = await signInManager.CheckPasswordSignInAsync(user, password, lockoutOnFailure: true);
        if (check.IsLockedOut)
        {
            return StatusCode(
                StatusCodes.Status429TooManyRequests,
                new { message = "Çok fazla hatalı şifre denemesi. Yaklaşık 15 dakika sonra yeniden dene." });
        }

        return check.Succeeded ? null : BadRequest(new { message = wrongPasswordMessage });
    }

    /// <summary>
    /// Allows one mail per account and purpose per 2 minutes: caps mail-bombing a victim's inbox and SMTP quota burn.
    /// Atomic upsert in the Identity token table (like learning); 0 rows = a mail already went out in the window.
    /// Fixed-width tick strings compare correctly as text. Not exported (export reads learning rows only).
    /// </summary>
    private async Task<bool> TryClaimMailSlotAsync(ApplicationUser user, string purpose)
    {
        var now = DateTime.UtcNow;
        var stamp = now.Ticks.ToString("D19");
        var cutoff = (now - MailThrottleWindow).Ticks.ToString("D19");
        var claimedRows = await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "AspNetUserTokens" ("UserId", "LoginProvider", "Name", "Value") VALUES ({user.Id}, {MailThrottleTokenProvider}, {purpose}, {stamp})
            ON CONFLICT ("UserId", "LoginProvider", "Name") DO UPDATE SET "Value" = EXCLUDED."Value" WHERE "AspNetUserTokens"."Value" < {cutoff}
            """);
        return claimedRows == 1;
    }

    // A new password must also cut off scripts that still hold this account's API keys.
    private Task DeactivateApiKeysAsync(ApplicationUser user)
    {
        return database.ApiKeys
            .Where(key => key.UserId == user.Id && key.IsActive)
            .ExecuteUpdateAsync(update => update.SetProperty(key => key.IsActive, false));
    }

    // The token travels in the URL fragment (#), so it never reaches server logs or Referer headers.
    private string BuildEmailLink(string pagePath, string email, string token)
    {
        return $"{PublicWebOrigin}/{pagePath}#email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
    }

    private static object ToProfile(ApplicationUser user)
    {
        return new { user.Email, user.FirstName, user.LastName, user.EmailConfirmed, user.CreatedAt };
    }
}
