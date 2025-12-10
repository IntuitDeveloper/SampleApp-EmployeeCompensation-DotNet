using QuickBooks.EmployeeCompensation.API.Models;
using System.Text.Json;
using Intuit.Ipp.OAuth2PlatformClient;

namespace QuickBooks.EmployeeCompensation.API.Services
{
    public class TokenManagerService : ITokenManagerService
    {
        private readonly QuickBooksConfig _config;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<TokenManagerService> _logger;
        private OAuthToken? _currentToken;
        private readonly string _tokenFilePath;

        public TokenManagerService(QuickBooksConfig config, IHttpClientFactory httpClientFactory, ILogger<TokenManagerService> logger)
        {
            _config = config;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _tokenFilePath = Path.Combine(Directory.GetCurrentDirectory(), "token.json");
        }

        public async Task<OAuthToken?> GetCurrentTokenAsync()
        {
            if (_currentToken == null)
            {
                await LoadTokenFromFileAsync();
            }

            if (_currentToken == null)
            {
                _logger.LogWarning("No valid token available. Please authenticate first.");
                return null;
            }

            // Check if token is expired and refresh if needed
            if (_currentToken.ExpiresAt <= DateTime.UtcNow.AddMinutes(5))
            {
                var refreshed = await RefreshTokenAsync();
                if (!refreshed)
                {
                    _logger.LogError("Token expired and refresh failed. Please re-authenticate.");
                    return null;
                }
            }

            return _currentToken;
        }

        public async Task SaveTokenAsync(OAuthToken token)
        {
            _currentToken = token;
            await SaveTokenToFileAsync(token);
            _logger.LogInformation("Token saved successfully for realm: {RealmId}", token.RealmId);
        }

        public async Task<bool> RefreshTokenAsync()
        {
            if (_currentToken?.RefreshToken == null)
            {
                _logger.LogWarning("No refresh token available for token refresh");
                return false;
            }

            try
            {
                _logger.LogInformation("Attempting to refresh access token");
                var oauth2Client = new OAuth2Client(_config.ClientId, _config.ClientSecret, _config.RedirectUri, _config.Environment);
                
                var tokenResponse = await oauth2Client.RefreshTokenAsync(_currentToken.RefreshToken);
                
                if (tokenResponse?.AccessToken == null)
                {
                    _logger.LogError("Failed to refresh token: No access token received");
                    return false;
                }

                var newToken = new OAuthToken
                {
                    AccessToken = tokenResponse.AccessToken,
                    RefreshToken = tokenResponse.RefreshToken ?? _currentToken.RefreshToken,
                    RealmId = _currentToken.RealmId,
                    ExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.AccessTokenExpiresIn)
                };

                await SaveTokenAsync(newToken);
                _logger.LogInformation("Token refreshed successfully for realm: {RealmId}", newToken.RealmId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing token");
                return false;
            }
        }

        public async Task<bool> IsTokenValidAsync()
        {
            try
            {
                var token = await GetCurrentTokenAsync();
                return token != null && token.ExpiresAt > DateTime.UtcNow;
            }
            catch
            {
                return false;
            }
        }

        public async Task RevokeTokenAsync()
        {
            try
            {
                _logger.LogInformation("Attempting to revoke token");
                
                // Store refresh token before clearing current token
                var refreshToken = _currentToken?.RefreshToken;
                
                // Clear local state first
                _currentToken = null;
                
                // Delete token file if it exists
                if (File.Exists(_tokenFilePath))
                {
                    File.Delete(_tokenFilePath);
                    _logger.LogInformation("Token file deleted");
                }

                // Try to revoke with QuickBooks if we have a refresh token
                if (!string.IsNullOrEmpty(refreshToken))
                {
                    using var httpClient = _httpClientFactory.CreateClient();
                    
                    var requestBody = new FormUrlEncodedContent(new[]
                    {
                        new KeyValuePair<string, string>("token", refreshToken)
                    });

                    httpClient.DefaultRequestHeaders.Add("Authorization", $"Basic {Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{_config.ClientId}:{_config.ClientSecret}"))}");
                    
                    await httpClient.PostAsync("https://developer.api.intuit.com/v2/oauth2/tokens/revoke", requestBody);
                    _logger.LogInformation("Token revoked with QuickBooks API");
                }
                
                _logger.LogInformation("Token revocation completed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Token revocation failed, but local state cleared");
                // Even if API call fails, we've cleared local state
            }
        }

        private async Task LoadTokenFromFileAsync()
        {
            try
            {
                if (File.Exists(_tokenFilePath))
                {
                    var tokenJson = await File.ReadAllTextAsync(_tokenFilePath);
                    _currentToken = JsonSerializer.Deserialize<OAuthToken>(tokenJson);
                    _logger.LogInformation("Token loaded from file");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load token from file");
            }
        }

        private async Task SaveTokenToFileAsync(OAuthToken token)
        {
            try
            {
                var tokenJson = JsonSerializer.Serialize(token, new JsonSerializerOptions { WriteIndented = true });
                await File.WriteAllTextAsync(_tokenFilePath, tokenJson);
                _logger.LogDebug("Token saved to file");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save token to file");
            }
        }
    }
}
