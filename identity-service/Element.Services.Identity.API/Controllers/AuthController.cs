using System.Threading.Tasks;
using Element.Services.Identity.Core.DTOs;
using Element.Services.Identity.Core.Entities;
using Element.Services.Identity.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Element.Services.Identity.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly TokenService _tokenService;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ICaptchaVerifier _captcha;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        TokenService tokenService,
        SignInManager<ApplicationUser> signInManager,
        ICaptchaVerifier captcha)
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _signInManager = signInManager;
        _captcha = captcha;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        if (!await _captcha.VerifyAsync(request.CaptchaToken, ct))
            return BadRequest(new { message = "Robot olmadığını doğrula (captcha eksik veya geçersiz)." });

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName
        };

        var result = await _userManager.CreateAsync(user, request.Password);
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

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        if (!await _captcha.VerifyAsync(request.CaptchaToken, ct))
            return BadRequest(new { message = "Robot olmadığını doğrula (captcha eksik veya geçersiz)." });

        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
            return Unauthorized("Invalid credentials.");

        // Lockout: 5 failed attempts → 15 min (Identity options). Gateway also caps auth POST at 15/min/IP.
        var signIn = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (signIn.IsLockedOut)
            return StatusCode(StatusCodes.Status429TooManyRequests,
                "Too many failed sign-in attempts. Try again in about 15 minutes.");
        if (!signIn.Succeeded)
            return Unauthorized("Invalid credentials.");

        var token = _tokenService.GenerateJwtToken(user);
        return Ok(new AuthResponse(
            Token: token,
            Email: user.Email ?? string.Empty,
            FullName: $"{user.FirstName} {user.LastName}"
        ));
    }
}
