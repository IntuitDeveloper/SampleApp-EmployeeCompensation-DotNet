using QuickBooks.EmployeeCompensation.API.Models;

namespace QuickBooks.EmployeeCompensation.API.Services
{
    public interface ITokenManagerService
    {
        Task<OAuthToken?> GetCurrentTokenAsync();
        Task SaveTokenAsync(OAuthToken token);
        Task<bool> RefreshTokenAsync();
        Task<bool> IsTokenValidAsync();
        Task RevokeTokenAsync();
    }
}
