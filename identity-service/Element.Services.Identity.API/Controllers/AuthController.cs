using Element.Services.Identity.Core.DTOs;
using Element.Services.Identity.Core.Entities;
using Element.Services.Identity.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Element.Services.Identity.API.Controllers;

/// <summary>Public sign-up and sign-in. Sign-in returns the JWT the web app sends with every later request.</summary>
[ApiController]
[Route("api/v1/[controller]")]
public class AuthController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    TokenService tokenService,
    ICaptchaVerifier captchaVerifier) : ControllerBase
{
    private const string CaptchaFailedMessage = "Robot olmadığını doğrula (captcha eksik veya geçersiz).";
    private const string InvalidCredentialsMessage = "Invalid credentials.";

    /// <summary>Creates an account after the captcha check; Identity enforces unique e-mail and password length.</summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        if (!await captchaVerifier.VerifyAsync(request.CaptchaToken, ct))
        {
            return BadRequest(new { message = CaptchaFailedMessage });
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(error.Code, error.Description);
            }

            return BadRequest(ModelState);
        }

        return Ok(new { Message = "User registered successfully." });
    }

    /// <summary>Checks e-mail and password (with lockout) and returns a signed JWT.</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        if (!await captchaVerifier.VerifyAsync(request.CaptchaToken, ct))
        {
            return BadRequest(new { message = CaptchaFailedMessage });
        }

        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            return Unauthorized(InvalidCredentialsMessage);
        }

        // Five failed attempts lock the account for 15 minutes (Identity options in Program.cs).
        // The gateway additionally limits auth POSTs to 15 per minute per IP.
        var signInResult = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (signInResult.IsLockedOut)
        {
            return StatusCode(
                StatusCodes.Status429TooManyRequests,
                "Too many failed sign-in attempts. Try again in about 15 minutes.");
        }

        if (!signInResult.Succeeded)
        {
            return Unauthorized(InvalidCredentialsMessage);
        }

        var token = tokenService.GenerateJwtToken(user);
        return Ok(new AuthResponse(
            Token: token,
            Email: user.Email ?? string.Empty,
            FullName: $"{user.FirstName} {user.LastName}"));
    }
}
