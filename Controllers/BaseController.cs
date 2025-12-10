using Microsoft.AspNetCore.Mvc;
using QuickBooks.EmployeeCompensation.API.Models;
using QuickBooks.EmployeeCompensation.API.Services;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace QuickBooks.EmployeeCompensation.API.Controllers
{
    /// <summary>
    /// Base controller providing common functionality for all API controllers
    /// Handles authentication, error handling, and GraphQL response validation
    /// </summary>
    public abstract class BaseController : ControllerBase
    {
        protected readonly ITokenManagerService _tokenManager;
        protected readonly ILogger _logger;
        protected readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            WriteIndented = true
        };

        /// <summary>
        /// Initializes a new instance of the BaseController
        /// </summary>
        protected BaseController(ITokenManagerService tokenManager, ILogger logger)
        {
            _tokenManager = tokenManager;
            _logger = logger;
        }

        /// <summary>
        /// Validates the current OAuth token and ensures user is authenticated
        /// </summary>
        protected async Task<OAuthToken?> ValidateToken()
        {
            var token = await _tokenManager.GetCurrentTokenAsync();
            if (token == null)
            {
                throw new UnauthorizedException("Authentication required. Please authenticate with QuickBooks first.");
            }
            return token;
        }

        /// <summary>
        /// Handles exceptions and converts them to appropriate HTTP responses
        /// </summary>
        protected ActionResult<ApiResponse<T>> HandleException<T>(Exception ex, string operation)
        {
            _logger.LogError(ex, "Error during {Operation}: {Message}", operation, ex.Message);

            if (ex is UnauthorizedException)
            {
                return BadRequest(new ApiResponse<T>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                });
            }

            return StatusCode(500, new ApiResponse<T>
            {
                Success = false,
                ErrorMessage = $"An error occurred during {operation}: {ex.Message}"
            });
        }

        /// <summary>
        /// Extracts error messages from a GraphQL response
        /// </summary>
        protected List<string> ExtractGraphQLErrors(JsonElement root)
        {
            var errorMessages = new List<string>();
            
            if (root.TryGetProperty("errors", out var errorsElement))
            {
                foreach (var error in errorsElement.EnumerateArray())
                {
                    if (error.TryGetProperty("message", out var msgProp))
                    {
                        var message = msgProp.GetString() ?? "Unknown GraphQL error";
                        errorMessages.Add(message);
                    }
                }
            }

            return errorMessages;
        }

        /// <summary>
        /// Validates a GraphQL response for errors and data presence
        /// </summary>
        protected bool ValidateGraphQLResponse(JsonElement root, out List<string> errors)
        {
            errors = ExtractGraphQLErrors(root);
            if (errors.Any())
            {
                var fullErrorMessage = "GraphQL request failed with errors: " + string.Join("; ", errors);
                _logger.LogError("GraphQL errors: {Errors}", fullErrorMessage);
                return false;
            }

            if (!root.TryGetProperty("data", out var dataElement) ||
                dataElement.ValueKind == JsonValueKind.Null)
            {
                errors.Add("GraphQL response contains no data");
                _logger.LogWarning("GraphQL returned null data without errors. Projects may not be available.");
                return false;
            }

            return true;
        }
    }

    /// <summary>
    /// Exception thrown when authentication is required but not provided
    /// </summary>
    public class UnauthorizedException : Exception
    {
        /// <summary>
        /// Initializes a new instance of the UnauthorizedException
        /// </summary>
        /// <param name="message">The error message</param>
        public UnauthorizedException(string message) : base(message) { }
    }
}
