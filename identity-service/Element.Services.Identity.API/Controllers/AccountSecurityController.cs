using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Element.Services.Identity.Core.Entities;
using Element.Services.Identity.Infrastructure.Persistence;
using Element.Services.Identity.Infrastructure.Services;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Element.Services.Identity.API.Controllers;

[ApiController]
[Route("api/v1/auth")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class AccountSecurityController(UserManager<ApplicationUser> users, SignInManager<ApplicationUser> signIn, IAccountMailer mailer, IConfiguration configuration,
    IdentityAppDbContext database, ICaptchaVerifier captcha, ILogger<AccountSecurityController> logger) : ControllerBase
{
    // Bounds match RegisterRequest/LoginRequest (email 254, password 1024).
    public sealed record DeleteRequest([Required, MaxLength(1024)] string Password, [Required, MaxLength(64)] string Confirmation);
    public sealed record EmailRequest([Required, EmailAddress, MaxLength(254)] string Email);
    public sealed record VerifyRequest([Required, EmailAddress, MaxLength(254)] string Email, [Required, MaxLength(2048)] string Token);
    public sealed record ResetRequest([Required, EmailAddress, MaxLength(254)] string Email, [Required, MaxLength(2048)] string Token, [Required, MinLength(10), MaxLength(1024)] string Password);
    public sealed record ChangeRequest([Required, MaxLength(1024)] string CurrentPassword, [Required, MinLength(10), MaxLength(1024)] string Password);
    private string Site => (configuration["PUBLIC_WEB_ORIGIN"] ?? "http://localhost:5173").TrimEnd('/');
    private async Task<ApplicationUser?> Current() => await users.FindByIdAsync(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "");
    private async Task RevokeKeys(ApplicationUser user)
    {
        await database.ApiKeys.Where(k => k.UserId == user.Id && k.IsActive).ExecuteUpdateAsync(update => update.SetProperty(k => k.IsActive, false));
    }
    // Same 5-try lockout as login, so a stolen JWT is not an unlimited password oracle. Must run outside
    // any transaction that a failure rolls back, or the failed-attempt count is rolled back with it.
    private async Task<IActionResult?> ConfirmPassword(ApplicationUser user, string password, string wrong)
    {
        var check = await signIn.CheckPasswordSignInAsync(user, password, lockoutOnFailure: true);
        if (check.IsLockedOut) return StatusCode(StatusCodes.Status429TooManyRequests, new { message = "Çok fazla hatalı şifre denemesi. Yaklaşık 15 dakika sonra yeniden dene." });
        return check.Succeeded ? null : BadRequest(new { message = wrong });
    }
    // One mail per account and purpose per 2 minutes: caps mail-bombing a victim's inbox and SMTP quota burn.
    // Atomic upsert in the Identity token table (like learning); 0 rows = a mail already went out in the window.
    // Fixed-width tick strings compare correctly as text. Not exported (export reads ElementLearning.v1 only).
    private async Task<bool> MailSlot(ApplicationUser user, string purpose)
    {
        var now = DateTime.UtcNow;
        string stamp = now.Ticks.ToString("D19"), cutoff = now.AddMinutes(-2).Ticks.ToString("D19");
        return await database.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "AspNetUserTokens" ("UserId", "LoginProvider", "Name", "Value") VALUES ({user.Id}, 'ElementMail.v1', {purpose}, {stamp})
            ON CONFLICT ("UserId", "LoginProvider", "Name") DO UPDATE SET "Value" = EXCLUDED."Value" WHERE "AspNetUserTokens"."Value" < {cutoff}
            """) == 1;
    }
    [Authorize, HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var user = await Current();
        if (user is null) return Unauthorized();
        var learning = await database.UserTokens.AsNoTracking().Where(t => t.UserId == user.Id && t.LoginProvider == "ElementLearning.v1").Select(t => t.Name).ToArrayAsync();
        var apiKeys = await database.ApiKeys.AsNoTracking().Where(k => k.UserId == user.Id).Select(k => new { k.Description, k.MaskedKey, k.IsActive, k.CreatedAt }).ToArrayAsync();
        var webhooks = await database.WebhookSubscriptions.AsNoTracking().Where(w => w.UserId == user.Id).Select(w => new { w.Url, w.Events }).ToArrayAsync();
        return Ok(new { exportedAt = DateTimeOffset.UtcNow, profile = new { user.Email, user.FirstName, user.LastName, user.EmailConfirmed, user.CreatedAt }, learning, apiKeys, webhooks,
            scope = "Identity and learning data. Simulation wallet, orders and shipments are separate technical records." });
    }
    [Authorize, HttpPost("delete")]
    public async Task<IActionResult> Delete(DeleteRequest request)
    {
        var user = await Current();
        if (user is null) return Unauthorized();
        if (request.Confirmation != "HESABIMI SİL") return BadRequest(new { message = "Şifre veya silme onayı yanlış." });
        if (await ConfirmPassword(user, request.Password, "Şifre veya silme onayı yanlış.") is { } problem) return problem;
        var result = await users.DeleteAsync(user);
        if (!result.Succeeded) return Conflict(new { message = "Hesap silinemedi. Yeniden deneyebilirsin." });
        return Ok(new { message = "Hesabın ve öğrenme kayıtların silindi. Oturumların ve API anahtarların kapatıldı." });
    }
    [HttpGet("capabilities")]
    public IActionResult Capabilities() => Ok(new
    {
        passwordRecovery = mailer.Enabled,
        emailVerification = mailer.Enabled,
        captcha = captcha.Enabled,
    });

    [HttpPost("password/forgot")]
    public async Task<IActionResult> Forgot(EmailRequest request)
    {
        if (!mailer.Enabled) return StatusCode(503, new { message = "E-postasız beta: e-posta ile şifre kurtarma henüz yapılandırılmadı." });
        var user = await users.FindByEmailAsync(request.Email);
        if (user is not null && await MailSlot(user, "reset"))
        {
            var token = await users.GeneratePasswordResetTokenAsync(user);
            var url = $"{Site}/reset-password#email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(token)}";
            // Not awaited: SMTP latency or failure would otherwise tell which addresses have accounts.
            _ = mailer.SendAsync(user.Email!, "ElementAPI şifre yenileme", $"Şifreni yenilemek için bağlantıyı aç:\n{url}\n\nBu isteği sen yapmadıysan bağlantıyı kullanma.", CancellationToken.None)
                .ContinueWith(task => logger.LogWarning(task.Exception, "Password reset mail failed or timed out"), TaskContinuationOptions.NotOnRanToCompletion);
        }
        return Accepted(new { message = "Bu adresle bir hesap varsa şifre yenileme bağlantısı gönderildi." });
    }
    [HttpPost("password/reset")]
    public async Task<IActionResult> Reset(ResetRequest request)
    {
        var user = await users.FindByEmailAsync(request.Email);
        if (user is null) return BadRequest(new { message = "Bağlantı geçersiz veya süresi dolmuş." });
        await using var transaction = await database.Database.BeginTransactionAsync();
        var result = await users.ResetPasswordAsync(user, request.Token, request.Password);
        if (!result.Succeeded) return BadRequest(new { message = "Bağlantı geçersiz, süresi dolmuş veya şifre koşulları sağlanmıyor." });
        await users.ResetAccessFailedCountAsync(user);
        await users.SetLockoutEndDateAsync(user, null);
        await RevokeKeys(user);
        await transaction.CommitAsync();
        return Ok(new { message = "Şifren yenilendi. Yeniden giriş yapabilirsin." });
    }
    [Authorize, HttpPost("password/change")]
    public async Task<IActionResult> Change(ChangeRequest request)
    {
        var user = await Current();
        if (user is null) return Unauthorized();
        if (await ConfirmPassword(user, request.CurrentPassword, "Mevcut şifre yanlış veya yeni şifre koşulları sağlanmıyor.") is { } problem) return problem;
        await using var transaction = await database.Database.BeginTransactionAsync();
        var result = await users.ChangePasswordAsync(user, request.CurrentPassword, request.Password);
        if (!result.Succeeded) return BadRequest(new { message = "Mevcut şifre yanlış veya yeni şifre koşulları sağlanmıyor." });
        await RevokeKeys(user);
        await transaction.CommitAsync();
        return Ok(new { message = "Şifren değişti. Tüm cihazlarda yeniden giriş yapmalısın." });
    }
    [Authorize, HttpGet("profile")]
    public async Task<IActionResult> Profile()
    {
        var user = await Current();
        return user is null ? Unauthorized() : Ok(new { user.Email, user.FirstName, user.LastName, user.EmailConfirmed, user.CreatedAt });
    }
    [Authorize, HttpPost("email/send-verification")]
    public async Task<IActionResult> SendVerification(CancellationToken ct)
    {
        if (!mailer.Enabled) return StatusCode(503, new { message = "E-posta doğrulama bu kurulumda yapılandırılmadı." });
        var user = await Current();
        if (user is null) return Unauthorized();
        if (!user.EmailConfirmed && await MailSlot(user, "verify"))
        {
            var token = await users.GenerateEmailConfirmationTokenAsync(user);
            await mailer.SendAsync(user.Email!, "ElementAPI e-posta doğrulama", $"Adresini doğrulamak için bağlantıyı aç:\n{Site}/verify-email#email={Uri.EscapeDataString(user.Email!)}&token={Uri.EscapeDataString(token)}", ct);
        }
        return Accepted(new { message = "Doğrulama bağlantısı e-posta adresine gönderildi." });
    }
    [HttpPost("email/verify")]
    public async Task<IActionResult> Verify(VerifyRequest request)
    {
        var user = await users.FindByEmailAsync(request.Email);
        if (user is null || !(await users.ConfirmEmailAsync(user, request.Token)).Succeeded) return BadRequest(new { message = "Doğrulama bağlantısı geçersiz veya süresi dolmuş." });
        return Ok(new { message = "E-posta adresin doğrulandı." });
    }
}
