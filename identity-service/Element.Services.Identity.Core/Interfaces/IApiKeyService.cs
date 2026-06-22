using System;
using System.Threading.Tasks;
using Element.Services.Identity.Core.Entities;

namespace Element.Services.Identity.Core.Interfaces;

public interface IApiKeyService
{
    /// <summary>
    /// Kullanıcı için yeni bir API Key üretir ve hash'lenmiş olarak DB ve Redis'e kaydeder.
    /// </summary>
    /// <returns>Ham (cleartext) üretilen API Key'i döner (Sadece bir kez gösterilir).</returns>
    Task<(string RawKey, ApiKey ApiKeyRecord)> GenerateKeyAsync(Guid userId, string description, int rateLimitTps = 10);

    /// <summary>
    /// Belirtilen API Key'i pasif hale getirir.
    /// </summary>
    Task<bool> RevokeKeyAsync(Guid userId, Guid keyId);

    /// <summary>
    /// API Key'in geçerli olup olmadığını kontrol eder.
    /// </summary>
    Task<ApiKey?> ValidateKeyAsync(string rawKey);
}
