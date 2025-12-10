using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace QuickBooks.EmployeeCompensation.API.Models
{
    public class OAuthToken
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public string RealmId { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }

    public class QuickBooksConfig
    {
        public string ClientId { get; set; } = string.Empty;
        public string ClientSecret { get; set; } = string.Empty;
        public string RedirectUri { get; set; } = string.Empty;
        public string DiscoveryDocument { get; set; } = string.Empty;
        public string BaseUrl { get; set; } = string.Empty;
        public string GraphQLEndpoint { get; set; } = "https://public.api.intuit.com/2020-04/graphql";
        public string Environment { get; set; } = "sandbox"; // "sandbox" or "production"
        public List<string> CompensationScopes { get; set; } = new List<string>();
    }

    public class ErrorResponse
    {
        public string Message { get; set; } = string.Empty;
        public string? Details { get; set; }
        public string? Code { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class ApiResponse<T>
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("data")]
        public T? Data { get; set; }

        [JsonPropertyName("errorMessage")]
        public string? ErrorMessage { get; set; }

        [JsonPropertyName("validationErrors")]
        public List<string>? ValidationErrors { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? ExtensionData { get; set; }
    }
}