using Microsoft.AspNetCore.Mvc;
using QuickBooks.EmployeeCompensation.API.Models;
using QuickBooks.EmployeeCompensation.API.Services;
using ApiEmployee = QuickBooks.EmployeeCompensation.API.Models.Employee;

namespace QuickBooks.EmployeeCompensation.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeeCompensationController : ControllerBase
    {
        private readonly IEmployeeCompensationService _compensationService;
        private readonly ITokenManagerService _tokenManager;
        private readonly ILogger<EmployeeCompensationController> _logger;

        public EmployeeCompensationController(
            IEmployeeCompensationService compensationService,
            ITokenManagerService tokenManager,
            ILogger<EmployeeCompensationController> logger)
        {
            _compensationService = compensationService;
            _tokenManager = tokenManager;
            _logger = logger;
        }

        #region TimeActivity Endpoints

        /// <summary>
        /// Create a new TimeActivity using selected wizard data
        /// </summary>
        [HttpPost("timeactivity")]
        public async Task<ActionResult<ApiResponse<object>>> CreateTimeActivity([FromBody] TimeActivityRequest request)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return BadRequest(new ApiResponse<object>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required. Please authenticate with QuickBooks first."
                    });
                }

                var result = await _compensationService.CreateTimeActivityAsync(token, request);
                
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating TimeActivity");
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                });
            }
        }

        #endregion

        #region Health Check Endpoints

        /// <summary>
        /// Check if the API is authenticated and ready to serve requests
        /// </summary>
        [HttpGet("health")]
        public async Task<ActionResult<ApiResponse<object>>> GetHealth()
        {
            try
            {
                var isAuthenticated = await _tokenManager.IsTokenValidAsync();
                var token = await _tokenManager.GetCurrentTokenAsync();

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = new
                    {
                        Status = "Healthy",
                        IsAuthenticated = isAuthenticated,
                        RealmId = token?.RealmId,
                        TokenExpiresAt = token?.ExpiresAt,
                        Timestamp = DateTime.UtcNow
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Health check failed");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    ErrorMessage = "Health check failed"
                });
            }
        }

        #endregion
    }
}
