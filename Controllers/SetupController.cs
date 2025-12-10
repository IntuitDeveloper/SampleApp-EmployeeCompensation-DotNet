using Microsoft.AspNetCore.Mvc;
using QuickBooks.EmployeeCompensation.API.Models;
using QuickBooks.EmployeeCompensation.API.Services;
using Intuit.Ipp.Core;
using Intuit.Ipp.DataService;
using Intuit.Ipp.Security;
using Intuit.Ipp.Data;
using System.Text.Json;
using System.Text.Json.Serialization;
using ApiReferenceType = QuickBooks.EmployeeCompensation.API.Models.ReferenceType;
using QuickBooksReferenceType = Intuit.Ipp.Data.ReferenceType;
using Task = System.Threading.Tasks.Task;

namespace QuickBooks.EmployeeCompensation.API.Controllers
{
    [ApiController]
    [Route("api/setup")]
    public class SetupController : BaseController
    {
        private readonly QuickBooksConfig _config;

        public SetupController(QuickBooksConfig config, ITokenManagerService tokenManager, ILogger<SetupController> logger)
            : base(tokenManager, logger)
        {
            _config = config;
        }

        /// <summary>
        /// Get employees for the setup wizard with pagination
        /// </summary>
        [HttpGet("employees")]
        public async Task<ActionResult<ApiResponse<object>>> GetEmployees([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return BadRequest(new ApiResponse<List<object>>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required. Please authenticate with QuickBooks first."
                    });
                }

                var dataService = CreateDataService(token);
                var allEmployees = dataService.FindAll(new Intuit.Ipp.Data.Employee()).ToList();
                
                // Filter active employees only
                var activeEmployees = allEmployees.Where(emp => emp.Active).ToList();
                
                // Calculate pagination
                var totalCount = activeEmployees.Count;
                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
                var skip = (page - 1) * pageSize;
                
                var pagedEmployees = activeEmployees
                    .Skip(skip)
                    .Take(pageSize)
                    .Select(emp => new
                    {
                        id = emp.Id,
                        displayName = emp.DisplayName,
                        givenName = emp.GivenName,
                        familyName = emp.FamilyName,
                        active = emp.Active,
                        email = emp.PrimaryEmailAddr?.Address,
                        phone = emp.PrimaryPhone?.FreeFormNumber,
                        employeeNumber = emp.EmployeeNumber,
                        hireDate = emp.HiredDate != default(DateTime) ? emp.HiredDate.ToString("yyyy-MM-dd") : null
                    }).ToList();

                var result = new
                {
                    employees = pagedEmployees,
                    pagination = new
                    {
                        currentPage = page,
                        pageSize = pageSize,
                        totalCount = totalCount,
                        totalPages = totalPages,
                        hasNextPage = page < totalPages,
                        hasPreviousPage = page > 1
                    }
                };

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting employees");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    ErrorMessage = "An error occurred while retrieving employees."
                });
            }
        }

        /// <summary>
        /// Perform all pre-checks required for the setup wizard
        /// </summary>
        [HttpGet("precheck")]
        public async Task<ActionResult<ApiResponse<object>>> PerformPreChecks()
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

                // Perform all checks
                var projectsEnabled = await CheckProjectsEnabledInQuickBooks(token);
                var timeTrackingEnabled = await CheckTimeTrackingEnabledInQuickBooks(token);
                var preferencesAccessible = await CheckPreferencesAccessible(token);

                var results = new
                {
                    ProjectsEnabled = projectsEnabled,
                    TimeTrackingEnabled = timeTrackingEnabled,
                    PreferencesAccessible = preferencesAccessible,
                    AllChecksPassed = projectsEnabled && timeTrackingEnabled && preferencesAccessible
                };

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = results,
                    ErrorMessage = results.AllChecksPassed ? null : "Some pre-checks failed. Please review your QuickBooks settings."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error performing pre-checks");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    ErrorMessage = "An error occurred while performing pre-checks."
                });
            }
        }

        /// <summary>
        /// Check if projects are enabled in QuickBooks preferences
        /// </summary>
        [HttpGet("precheck/projects")]
        public async Task<ActionResult<ApiResponse<object>>> CheckProjectsEnabled()
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

                var isProjectsEnabled = await CheckProjectsEnabledInQuickBooks(token);
                
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = new
                    {
                        projectsEnabled = isProjectsEnabled
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking projects enabled status");
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                });
            }
        }

        // REMOVED: enable-projects endpoint - not used by UI (projects enablement handled manually)

        /// <summary>
        /// Check if time tracking is enabled in QuickBooks preferences
        /// </summary>
        [HttpGet("precheck/timetracking")]
        public async Task<ActionResult<ApiResponse<object>>> CheckTimeTrackingEnabled()
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

                var isTimeTrackingEnabled = await CheckTimeTrackingEnabledInQuickBooks(token);
                
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = new
                    {
                        TimeTrackingEnabled = isTimeTrackingEnabled,
                        Message = isTimeTrackingEnabled 
                            ? "Time tracking is enabled in your QuickBooks account" 
                            : "Time tracking is not enabled in your QuickBooks account"
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking time tracking enabled status");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    ErrorMessage = "An error occurred while checking time tracking status: " + ex.Message
                });
            }
        }

        /// <summary>
        /// Check if preferences are accessible in QuickBooks
        /// </summary>
        [HttpGet("precheck/preferences")]
        public async Task<ActionResult<ApiResponse<object>>> CheckPreferencesAccessible()
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return Unauthorized(new ApiResponse<object>
                    {
                        Success = false,
                        ErrorMessage = "No valid OAuth token found. Please authenticate first."
                    });
                }

                var isAccessible = await CheckPreferencesAccessible(token);

                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = new { preferencesAccessible = isAccessible }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CheckPreferencesAccessible endpoint");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    ErrorMessage = "An error occurred while checking preferences accessibility: " + ex.Message
                });
            }
        }

        /// <summary>
        /// Get QuickBooks company information
        /// </summary>
        [HttpGet("company")]
        public async Task<ActionResult<ApiResponse<object>>> GetCompanyInfo()
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

                var companyInfo = await GetQuickBooksCompanyInfo(token);
                
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = companyInfo
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving company information");
                return StatusCode(500, new ApiResponse<object>
                {
                    Success = false,
                    ErrorMessage = "An error occurred while retrieving company information: " + ex.Message
                });
            }
        }

        /// <summary>
        /// Get all customers from QuickBooks
        /// </summary>
        [HttpGet("customers")]
        public async Task<ActionResult<ApiResponse<List<object>>>> GetCustomers([FromQuery] string? projectId = null)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return BadRequest(new ApiResponse<List<object>>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required. Please authenticate with QuickBooks first."
                    });
                }

                var customers = await GetCustomersFromQuickBooksAsync(token, projectId);
                
                return Ok(new ApiResponse<List<object>>
                {
                    Success = true,
                    Data = customers
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting customers from QuickBooks");
                return BadRequest(new ApiResponse<List<ProjectResponse>>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                });
            }
        }

        /// <summary>
        /// Get all items from QuickBooks
        /// </summary>
        [HttpGet("items")]
        public async Task<ActionResult<ApiResponse<List<object>>>> GetItems()
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return BadRequest(new ApiResponse<List<object>>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required. Please authenticate with QuickBooks first."
                    });
                }

                var items = await GetQuickBooksItems(token);
                
                return Ok(new ApiResponse<List<object>>
                {
                    Success = true,
                    Data = items
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving items");
                return StatusCode(500, new ApiResponse<List<ProjectResponse>>
                {
                    Success = false,
                    ErrorMessage = "An error occurred while retrieving items: " + ex.Message
                });
            }
        }


        /// <summary>
        /// Gets employee compensation details with GraphQL-style filtering
        /// </summary>
        [HttpPost("employee-compensation/query")]
        public async Task<ActionResult<ApiResponse<EmployeeCompensationResponse>>> QueryEmployeeCompensation([FromBody] EmployeeCompensationQueryRequest request)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return BadRequest(new ApiResponse<EmployeeCompensationResponse>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required. Please authenticate with QuickBooks first."
                    });
                }

                var compensation = await GetEmployeeCompensationWithGraphQL(token, request);
                
                return Ok(new ApiResponse<EmployeeCompensationResponse>
                {
                    Success = true,
                    Data = compensation
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error querying employee compensation from QuickBooks");
                return BadRequest(new ApiResponse<EmployeeCompensationResponse>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                });
            }
        }

        // REMOVED: employee/{employeeId}/compensation endpoint - not used by UI

        // REMOVED: timeactivities-old endpoint - not used by UI

        /// <summary>
        /// Create a TimeActivity record
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

                var timeActivity = await CreateTimeActivityInQuickBooks(token, request);
                
                return Ok(new ApiResponse<object>
                {
                    Success = true,
                    Data = timeActivity
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating TimeActivity in QuickBooks");
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                });
            }
        }

        /// <summary>
        /// Get projects using GraphQL with POST request and filtering options
        /// </summary>
        [HttpPost("projects")]
        public async Task<ActionResult<ApiResponse<List<object>>>> GetProjectsPost([FromBody] ProjectFilterRequest? request = null)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return BadRequest(new ApiResponse<List<object>>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required. Please authenticate with QuickBooks first."
                    });
                }

                // Convert request to filter options
                var filterOptions = new ProjectFilterOptions();
                
                if (request != null)
                {
                    if (!string.IsNullOrEmpty(request.StartDate))
                    {
                        if (DateTime.TryParse(request.StartDate, out var startDate))
                            filterOptions.StartDateFrom = startDate;
                    }
                    
                    if (!string.IsNullOrEmpty(request.EndDate))
                    {
                        if (DateTime.TryParse(request.EndDate, out var endDate))
                            filterOptions.StartDateTo = endDate;
                    }
                    
                    if (request.StatusFilter != null && request.StatusFilter.Any())
                    {
                        filterOptions.Statuses = request.StatusFilter;
                    }
                }

                var projects = await GetProjectsFromGraphQL(token, null, filterOptions);
                
                return Ok(new ApiResponse<List<object>>
                {
                    Success = true,
                    Data = projects
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving projects via POST");
                return StatusCode(500, new ApiResponse<List<ProjectResponse>>
                {
                    Success = false,
                    ErrorMessage = "An error occurred while retrieving projects: " + ex.Message
                });
            }
        }

        /// <summary>
        /// Get projects using GraphQL with advanced filtering options
        /// Fetches all projects by default, with optional filtering
        /// </summary>
        [HttpGet("projects")]
        public async Task<ActionResult<ApiResponse<List<object>>>> GetProjects([FromQuery] ProjectFilterOptions? filterOptions = null)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return BadRequest(new ApiResponse<List<object>>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required. Please authenticate with QuickBooks first."
                    });
                }

                // Require date filters
                if (filterOptions == null || (!filterOptions.HasDueDateRange1() && !filterOptions.HasStartDateRange1()))
                {
                    return Ok(new ApiResponse<List<object>>
                    {
                        Success = true,
                        Data = new List<object>() // Return empty list if no date filters
                    });
                }

                // Debug: Log received filter options
                _logger.LogInformation("Received filter options: StartDateFrom1={StartDateFrom1}, StartDateTo1={StartDateTo1}, StartDateFrom2={StartDateFrom2}, StartDateTo2={StartDateTo2}, DueDateFrom1={DueDateFrom1}, DueDateTo1={DueDateTo1}, DueDateFrom2={DueDateFrom2}, DueDateTo2={DueDateTo2}, CompletedDateFrom={CompletedDateFrom}, CompletedDateTo={CompletedDateTo}, HasAnyFilter={HasAnyFilter}", 
                    filterOptions?.StartDateFrom1, filterOptions?.StartDateTo1, filterOptions?.StartDateFrom2, filterOptions?.StartDateTo2, 
                    filterOptions?.DueDateFrom1, filterOptions?.DueDateTo1, filterOptions?.DueDateFrom2, filterOptions?.DueDateTo2,
                    filterOptions?.CompletedDateFrom, filterOptions?.CompletedDateTo, filterOptions?.HasAnyFilter());

                var projects = await GetProjectsFromGraphQL(token, filterOptions.After, filterOptions);
                
                return Ok(new ApiResponse<List<object>>
                {
                    Success = true,
                    Data = projects
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving projects");
                return StatusCode(500, new ApiResponse<List<ProjectResponse>>
                {
                    Success = false,
                    ErrorMessage = "An error occurred while retrieving projects: " + ex.Message
                });
            }
        }

        private async Task<List<object>> GetTimeActivitiesFromQuickBooks(OAuthToken token, string? employeeId, string? customerId, DateTime? startDate, DateTime? endDate, int maxResults)
        {
            try
            {
                _logger.LogInformation("=== QUICKBOOKS GET TIME ACTIVITIES API REQUEST ===");
                _logger.LogInformation("Filters - Employee: {EmployeeId}, Customer: {CustomerId}, Start: {StartDate}, End: {EndDate}, Max: {MaxResults}",
                    employeeId ?? "all", customerId ?? "all", startDate?.ToString("yyyy-MM-dd") ?? "no limit", endDate?.ToString("yyyy-MM-dd") ?? "no limit", maxResults);

                var dataService = CreateDataService(token);
                
                // Build query with filters
                var queryConditions = new List<string>();
                
                if (!string.IsNullOrEmpty(employeeId))
                {
                    queryConditions.Add($"EmployeeRef = '{employeeId}'");
                }
                
                if (!string.IsNullOrEmpty(customerId))
                {
                    queryConditions.Add($"CustomerRef = '{customerId}'");
                }
                
                if (startDate.HasValue)
                {
                    queryConditions.Add($"TxnDate >= '{startDate.Value:yyyy-MM-dd}'");
                }
                
                if (endDate.HasValue)
                {
                    queryConditions.Add($"TxnDate <= '{endDate.Value:yyyy-MM-dd}'");
                }

                // Build the query string
                var whereClause = queryConditions.Count > 0 ? " WHERE " + string.Join(" AND ", queryConditions) : "";
                var query = $"SELECT * FROM TimeActivity{whereClause} MAXRESULTS {maxResults}";
                
                _logger.LogInformation("QBO Query: {Query}", query);
                
                var timeActivities = dataService.FindAll(new TimeActivity(), 1, maxResults)
                    .Where(ta => 
                        (string.IsNullOrEmpty(employeeId) || ta.AnyIntuitObject?.Value == employeeId) &&
                        (string.IsNullOrEmpty(customerId) || ta.CustomerRef?.Value == customerId) &&
                        (!startDate.HasValue || ta.TxnDate >= startDate.Value) &&
                        (!endDate.HasValue || ta.TxnDate <= endDate.Value))
                    .Take(maxResults)
                    .ToList();

                _logger.LogInformation("=== QUICKBOOKS TIME ACTIVITIES API RESPONSE ===");
                _logger.LogInformation("Found {Count} time activities", timeActivities.Count);

                var result = timeActivities.Select(ta => {
                    _logger.LogInformation("TimeActivity - ID: {Id}, Employee: {Employee}, Date: {Date}, Hours: {Hours}",
                        ta.Id, ta.AnyIntuitObject?.Value ?? "null", ta.TxnDate.ToString("yyyy-MM-dd"), ta.Hours);
                    
                    return new
                    {
                        id = ta.Id,
                        txnDate = ta.TxnDate,
                        employee = new
                        {
                            value = ta.AnyIntuitObject?.Value,
                            name = ta.AnyIntuitObject?.Value // Note: ReferenceType doesn't have Name property
                        },
                        customer = ta.CustomerRef != null ? new
                        {
                            value = ta.CustomerRef.Value,
                            name = ta.CustomerRef.Value // Note: ReferenceType doesn't have Name property
                        } : null,
                        item = ta.ItemRef != null ? new
                        {
                            value = ta.ItemRef.Value,
                            name = ta.ItemRef.Value // Note: ReferenceType doesn't have Name property
                        } : null,
                        hours = ta.Hours,
                        minutes = ta.Minutes,
                        description = ta.Description,
                        billable = ta.BillableStatus == BillableStatusEnum.Billable,
                        createdTime = ta.MetaData?.CreateTime,
                        lastUpdated = ta.MetaData?.LastUpdatedTime
                    };
                }).Cast<object>().ToList();

                _logger.LogInformation("=== END QBO TIME ACTIVITIES RESPONSE ===");
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting time activities from QuickBooks");
                return new List<object>();
            }
        }

        #region Private Helper Methods

        private async Task<bool> CheckProjectsEnabledInQuickBooks(OAuthToken token)
        {
            try
            {
                // Create DataService
                var dataService = CreateDataService(token);
                
                // Query preferences
                var preferences = dataService.FindAll(new Intuit.Ipp.Data.Preferences()).FirstOrDefault();
                
                if (preferences?.OtherPrefs != null)
                {
                    var projectsSetting = preferences.OtherPrefs
                        .FirstOrDefault(p => p.Name == "ProjectsEnabled");
                    
                    return projectsSetting?.Value?.ToLower() == "true";
                }
                
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking projects enabled in QuickBooks");
                return false;
            }
        }

        private async Task<bool> CheckPreferencesAccessible(OAuthToken token)
        {
            try
            {
                // Create DataService
                var dataService = CreateDataService(token);

                // Try to access preferences to check if we have permission
                var preferences = dataService.FindAll(new Intuit.Ipp.Data.Preferences()).FirstOrDefault();
                return preferences != null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking preferences accessibility");
                return false;
            }
        }

        private async Task<bool> CheckTimeTrackingEnabledInQuickBooks(OAuthToken token)
        {
            try
            {
                // Create DataService
                var dataService = CreateDataService(token);
                
                // Query preferences
                var preferences = dataService.FindAll(new Intuit.Ipp.Data.Preferences()).FirstOrDefault();
                
                if (preferences?.OtherPrefs != null)
                {
                    var timeTrackingSetting = preferences.OtherPrefs
                        .FirstOrDefault(p => p.Name == "TimeTrackingFeatureEnabled");
                    
                    return timeTrackingSetting?.Value?.ToLower() == "true";
                }
                
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking time tracking enabled in QuickBooks");
                return false;
            }
        }

        private async Task<object?> GetQuickBooksPreferences(OAuthToken token)
        {
            try
            {
                // Create DataService
                var dataService = CreateDataService(token);
                
                // Query preferences
                var preferences = dataService.FindAll(new Intuit.Ipp.Data.Preferences()).FirstOrDefault();
                
                if (preferences != null)
                {
                    return new
                    {
                        Id = preferences.Id,
                        OtherPrefs = preferences.OtherPrefs?.Select(p => new
                        {
                            Name = p.Name,
                            Value = p.Value
                        }).ToList()
                    };
                }
                
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting QuickBooks preferences");
                // Return mock data for demo
                return new
                {
                    OtherPrefs = new[]
                    {
                        new { Name = "ProjectsEnabled", Value = "true" },
                        new { Name = "TimeTrackingFeatureEnabled", Value = "true" }
                    }
                };
            }
        }

        private async Task<List<object>> GetCustomersFromQuickBooksAsync(OAuthToken token, string? projectId = null)
        {
            try
            {
                var dataService = CreateDataService(token);
                
                var customers = dataService.FindAll(new Customer()).ToList();
                
                List<Customer> filteredCustomers;
                
                if (!string.IsNullOrEmpty(projectId))
                {
                    // If projectId is provided, find the specific customer for that project
                    // First, try to find the project to get its customer
                    try
                    {
                        // Get the project to find its associated customer
                        var projects = dataService.FindAll(new Item()).Where(i => i.Type == ItemTypeEnum.Service && i.Id == projectId).ToList();
                        if (projects.Any())
                        {
                            var project = projects.First();
                            // If project has a customer reference, filter to that customer only
                            if (project.QtyOnHand > 0)
                            {
                                // For now, we'll use a simple approach - get the first customer as default
                                // In a real implementation, you'd have proper project-customer mapping
                                filteredCustomers = customers.Where(c => !c.Job && !c.IsProject).Take(1).ToList();
                            }
                            else
                            {
                                filteredCustomers = customers.Where(c => !c.Job && !c.IsProject).Take(1).ToList();
                            }
                        }
                        else
                        {
                            // If project not found, return the first customer
                            filteredCustomers = customers.Where(c => !c.Job && !c.IsProject).Take(1).ToList();
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning("Error filtering customers by project {ProjectId}: {Error}", projectId, ex.Message);
                        // Fallback to first customer
                        filteredCustomers = customers.Where(c => !c.Job && !c.IsProject).Take(1).ToList();
                    }
                }
                else
                {
                    // Filter out project customers - these are auto-created by QuickBooks for projects
                    filteredCustomers = customers.Where(c => !c.Job && !c.IsProject).ToList();
                }
                
                var customerList = new List<object>();
                
                foreach (var customer in filteredCustomers)
                {
                    // Helper method to concatenate address fields
                    string ConcatenateAddress(dynamic addr)
                    {
                        if (addr == null) return "";
                        
                        var parts = new List<string>();
                        if (!string.IsNullOrWhiteSpace(addr.Line1)) parts.Add(addr.Line1);
                        if (!string.IsNullOrWhiteSpace(addr.Line2)) parts.Add(addr.Line2);
                        if (!string.IsNullOrWhiteSpace(addr.Line3)) parts.Add(addr.Line3);
                        if (!string.IsNullOrWhiteSpace(addr.Line4)) parts.Add(addr.Line4);
                        if (!string.IsNullOrWhiteSpace(addr.Line5)) parts.Add(addr.Line5);
                        if (!string.IsNullOrWhiteSpace(addr.City)) parts.Add(addr.City);
                        if (!string.IsNullOrWhiteSpace(addr.CountrySubDivisionCode)) parts.Add(addr.CountrySubDivisionCode);
                        if (!string.IsNullOrWhiteSpace(addr.PostalCode)) parts.Add(addr.PostalCode);
                        if (!string.IsNullOrWhiteSpace(addr.Country)) parts.Add(addr.Country);
                        
                        return string.Join(", ", parts);
                    }

                    // Concatenate contact information
                    var contactInfo = new List<string>();
                    if (!string.IsNullOrWhiteSpace(customer.PrimaryEmailAddr?.Address)) 
                        contactInfo.Add($"Email: {customer.PrimaryEmailAddr.Address}");
                    if (!string.IsNullOrWhiteSpace(customer.PrimaryPhone?.FreeFormNumber)) 
                        contactInfo.Add($"Phone: {customer.PrimaryPhone.FreeFormNumber}");
                    if (!string.IsNullOrWhiteSpace(customer.Mobile?.FreeFormNumber)) 
                        contactInfo.Add($"Mobile: {customer.Mobile.FreeFormNumber}");

                    customerList.Add(new
                    {
                        // Core fields for UI
                        Id = customer.Id,
                        DisplayName = customer.DisplayName ?? customer.FullyQualifiedName ?? "Unnamed Customer",
                        CompanyName = customer.CompanyName,
                        ContactInfo = string.Join(" | ", contactInfo),
                        
                        // Concatenated Addresses
                        BillingAddress = ConcatenateAddress(customer.BillAddr),
                        ShippingAddress = ConcatenateAddress(customer.ShipAddr),
                        
                        // Status
                        Active = customer.Active,
                        
                        // Additional useful fields
                        Balance = customer.Balance,
                        IsProject = customer.IsProject,
                        
                        // Metadata
                        MetaData = customer.MetaData != null ? new
                        {
                            CreateTime = customer.MetaData.CreateTime,
                            LastUpdatedTime = customer.MetaData.LastUpdatedTime
                        } : null
                    });
                }
                
                _logger.LogInformation("Retrieved {Count} customers from QuickBooks with full details", customerList.Count);
                return customerList;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting customers from QuickBooks");
                return new List<object>();
            }
        }

        private async Task<object?> GetQuickBooksCompanyInfo(OAuthToken token)
        {
            try
            {
                // Create DataService
                var dataService = CreateDataService(token);
                
                // Query company info
                var companyInfo = dataService.FindAll(new CompanyInfo()).FirstOrDefault();
                
                if (companyInfo != null)
                {
                    return new
                    {
                        Id = companyInfo.Id,
                        CompanyName = companyInfo.CompanyName,
                        LegalName = companyInfo.LegalName,
                        CompanyAddr = companyInfo.CompanyAddr,
                        Country = companyInfo.Country,
                        FiscalYearStartMonth = companyInfo.FiscalYearStartMonth
                    };
                }
                
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting QuickBooks company info");
                // Return mock data for demo
                return new
                {
                    Id = "1",
                    CompanyName = "Demo Company",
                    LegalName = "Demo Company LLC",
                    Country = "US"
                };
            }
        }

        private async Task<List<object>> GetQuickBooksCustomers(OAuthToken token)
        {
            try
            {
                // Create DataService
                var dataService = CreateDataService(token);
                
                // Query customers
                var customers = dataService.FindAll(new Customer());
                
                return customers.Select(c => new
                {
                    Id = c.Id,
                    Name = c.DisplayName ?? c.CompanyName ?? "Unnamed Customer",
                    CompanyName = c.CompanyName,
                    DisplayName = c.DisplayName,
                    Active = c.Active,
                    PrimaryEmailAddr = c.PrimaryEmailAddr?.Address
                }).ToList<object>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting QuickBooks customers");
                throw new InvalidOperationException($"Failed to retrieve customers from QuickBooks: {ex.Message}", ex);
            }
        }

        private async Task<List<object>> GetQuickBooksItems(OAuthToken token)
        {
            try
            {
                // Create DataService
                var dataService = CreateDataService(token);
                
                // Query items
                var items = dataService.FindAll(new Item());
                
                return items.Select(i => new
                {
                    Id = i.Id,
                    Name = i.Name,
                    Type = i.Type,
                    Active = i.Active,
                    Description = i.Description
                }).ToList<object>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting QuickBooks items");
                throw new InvalidOperationException($"Failed to retrieve items from QuickBooks: {ex.Message}", ex);
            }
        }

        private async Task<List<object>> GetProjectsFromGraphQL(OAuthToken token, string? cursor = null, ProjectFilterOptions? filterOptions = null)
        {
            try
            {
                // Validate cursor parameter - must be null or base64 string
                if (!string.IsNullOrEmpty(cursor) && !IsValidBase64String(cursor))
                {
                    _logger.LogError("Invalid cursor value provided. Cursor must be null or a valid base64 string.");
                    throw new ArgumentException("After cursor value should be null or base64 string value");
                }

                using var httpClient = new HttpClient();
                
                // Set up GraphQL request headers
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token.AccessToken}");
                httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
                
                // Add RealmId header for QuickBooks GraphQL API
                if (!string.IsNullOrEmpty(token.RealmId))
                {
                    httpClient.DefaultRequestHeaders.Add("realmId", token.RealmId);
                }
                
                // Build dynamic GraphQL query with filtering support
                var (query, variables) = GraphQLHelper.BuildProjectsQuery(filterOptions, cursor);

                var graphqlQuery = new
                {
                    query = query,
                    variables = variables
                };
                
                var jsonContent = System.Text.Json.JsonSerializer.Serialize(graphqlQuery);
                var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");
                
                _logger.LogInformation("Making GraphQL request to fetch projects for company: {CompanyId} with cursor: {Cursor}", 
                    token.RealmId, cursor ?? "null");
                _logger.LogInformation("GraphQL Query: {Query}", query);
                _logger.LogInformation("GraphQL Variables: {Variables}", System.Text.Json.JsonSerializer.Serialize(variables));
                _logger.LogInformation("Full GraphQL Request Body: {RequestBody}", jsonContent);
                
                // Set timeout for GraphQL request to prevent hanging
                httpClient.Timeout = TimeSpan.FromSeconds(10);
                
                var response = await httpClient.PostAsync(_config.GraphQLEndpoint, content);
                
                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    _logger.LogInformation("GraphQL response: {Response}", responseContent);
                    
                    using var document = System.Text.Json.JsonDocument.Parse(responseContent);
                    var root = document.RootElement;
                    
                    // Validate response and check for errors
                    var errors = new List<string>();
                    if (!ValidateGraphQLResponse(root, out errors))
                    {
                        if (errors.Any())
                        {
                            throw new Exception(string.Join("; ", errors));
                        }
                        return new List<object>();
                    }
                    
                    // Extract projects from response
                    var projects = GraphQLHelper.ExtractProjectsFromResponse(root);
                    _logger.LogInformation("Successfully fetched {Count} projects from GraphQL", projects.Count);
                    return projects.Cast<object>().ToList();
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("GraphQL request failed with status: {StatusCode}, Response: {Response}", 
                        response.StatusCode, errorContent);
                    _logger.LogError("Request Headers: Authorization=Bearer [REDACTED], realmId={RealmId}", token.RealmId);
                    _logger.LogError("GraphQL Endpoint: {Endpoint}", _config.GraphQLEndpoint);
                    return new List<object>();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting projects from GraphQL: {Message}", ex.Message);
                
                // Return empty list instead of mock data
                return new List<object>();
            }
        }

        private async Task<bool> EnableProjectsInQuickBooks(OAuthToken token)
        {
            try
            {
                var dataService = CreateDataService(token);
                
                // First, try to disable conflicting preferences
                await DisableConflictingPreferences(dataService);
                
                // Get current preferences (refresh after potential changes)
                var preferences = dataService.FindAll(new Intuit.Ipp.Data.Preferences()).FirstOrDefault();
                if (preferences == null)
                {
                    _logger.LogError("Could not retrieve current preferences");
                    return false;
                }

                _logger.LogInformation("Current preferences - Id: {Id}, SyncToken: {SyncToken}", 
                    preferences.Id, preferences.SyncToken);

                // Enable Projects by updating OtherPrefs
                bool needsUpdate = false;

                // Enable Projects in OtherPrefs
                if (preferences.OtherPrefs != null)
                {
                    var otherPrefsList = preferences.OtherPrefs.ToList();
                    var projectsSetting = otherPrefsList.FirstOrDefault(p => p.Name == "ProjectsEnabled");
                    
                    if (projectsSetting != null)
                    {
                        if (projectsSetting.Value != "true")
                        {
                            projectsSetting.Value = "true";
                            needsUpdate = true;
                            _logger.LogInformation("Updated existing ProjectsEnabled to true");
                        }
                    }
                    else
                    {
                        var newPref = new NameValue
                        {
                            Name = "ProjectsEnabled",
                            Value = "true"
                        };
                        otherPrefsList.Add(newPref);
                        preferences.OtherPrefs = otherPrefsList.ToArray();
                        needsUpdate = true;
                        _logger.LogInformation("Added new ProjectsEnabled preference");
                    }
                }
                else
                {
                    // Create OtherPrefs if it doesn't exist
                    preferences.OtherPrefs = new NameValue[]
                    {
                        new NameValue
                        {
                            Name = "ProjectsEnabled",
                            Value = "true"
                        }
                    };
                    needsUpdate = true;
                    _logger.LogInformation("Created OtherPrefs with ProjectsEnabled");
                }

                if (needsUpdate)
                {
                    _logger.LogInformation("Updating preferences in QuickBooks...");
                    var updatedPreferences = dataService.Update(preferences);
                    
                    if (updatedPreferences != null)
                    {
                        _logger.LogInformation("Successfully enabled Projects feature in QuickBooks");
                        return true;
                    }
                    else
                    {
                        _logger.LogError("Failed to update preferences - Update returned null");
                        return false;
                    }
                }
                else
                {
                    _logger.LogInformation("Projects preferences already enabled");
                    return true;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error enabling Projects in QuickBooks: {Message}", ex.Message);
                return false;
            }
        }

        private async Task DisableConflictingPreferences(DataService dataService)
        {
            try
            {
                var preferences = dataService.FindAll(new Intuit.Ipp.Data.Preferences()).FirstOrDefault();
                if (preferences == null) return;

                bool needsUpdate = false;

                // Log all preference properties to understand the structure
                _logger.LogInformation("=== PREFERENCES STRUCTURE ANALYSIS ===");
                
                if (preferences.SalesFormsPrefs != null)
                {
                    var salesType = preferences.SalesFormsPrefs.GetType();
                    var salesProps = salesType.GetProperties();
                    
                    _logger.LogInformation("SalesFormsPrefs available properties:");
                    foreach (var prop in salesProps)
                    {
                        try
                        {
                            var value = prop.GetValue(preferences.SalesFormsPrefs);
                            _logger.LogInformation("  {Name} ({Type}) = {Value}", prop.Name, prop.PropertyType.Name, value);
                            
                            // Look for properties that might control items on expense forms
                            if (prop.PropertyType == typeof(bool) || prop.PropertyType == typeof(bool?))
                            {
                                var propNameLower = prop.Name.ToLower();
                                // More comprehensive search patterns for items on forms
                                if (propNameLower.Contains("item") || 
                                    propNameLower.Contains("expense") ||
                                    propNameLower.Contains("purchase") ||
                                    propNameLower.Contains("form") ||
                                    propNameLower.Contains("table"))
                                {
                                    if (value is true)
                                    {
                                        prop.SetValue(preferences.SalesFormsPrefs, false);
                                        needsUpdate = true;
                                        _logger.LogInformation("*** DISABLED SalesFormsPrefs.{PropName} (was true)", prop.Name);
                                    }
                                }
                            }
                        }
                        catch (Exception propEx)
                        {
                            _logger.LogWarning("Could not read property {Name}: {Error}", prop.Name, propEx.Message);
                        }
                    }
                }

                if (preferences.VendorAndPurchasesPrefs != null)
                {
                    var vendorType = preferences.VendorAndPurchasesPrefs.GetType();
                    var vendorProps = vendorType.GetProperties();
                    
                    _logger.LogInformation("VendorAndPurchasesPrefs available properties:");
                    foreach (var prop in vendorProps)
                    {
                        try
                        {
                            var value = prop.GetValue(preferences.VendorAndPurchasesPrefs);
                            _logger.LogInformation("  {Name} ({Type}) = {Value}", prop.Name, prop.PropertyType.Name, value);
                            
                            // Look for properties that might control purchase orders
                            if (prop.PropertyType == typeof(bool) || prop.PropertyType == typeof(bool?))
                            {
                                var propNameLower = prop.Name.ToLower();
                                // More comprehensive search for purchase order related properties
                                if (propNameLower.Contains("po") || 
                                    propNameLower.Contains("purchaseorder") ||
                                    propNameLower.Contains("purchase") ||
                                    propNameLower.Contains("order") ||
                                    propNameLower.Contains("enabled") ||
                                    propNameLower.Contains("use"))
                                {
                                    if (value is true)
                                    {
                                        prop.SetValue(preferences.VendorAndPurchasesPrefs, false);
                                        needsUpdate = true;
                                        _logger.LogInformation("*** DISABLED VendorAndPurchasesPrefs.{PropName} (was true)", prop.Name);
                                    }
                                }
                            }
                        }
                        catch (Exception propEx)
                        {
                            _logger.LogWarning("Could not read property {Name}: {Error}", prop.Name, propEx.Message);
                        }
                    }
                }

                if (needsUpdate)
                {
                    _logger.LogInformation("Updating preferences to disable conflicting settings...");
                    dataService.Update(preferences);
                    _logger.LogInformation("Successfully disabled conflicting preferences");
                }
                else
                {
                    _logger.LogInformation("No conflicting preferences found to disable");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disabling conflicting preferences: {Message}", ex.Message);
            }
        }

        private async Task<EmployeeCompensationResponse> GetEmployeeCompensationWithGraphQL(OAuthToken token, EmployeeCompensationQueryRequest request)
        {
            try
            {
                _logger.LogInformation("=== GRAPHQL EMPLOYEE COMPENSATION QUERY ===");
                _logger.LogInformation("Filter - EmployeeId: {EmployeeId}, Active: {Active}, Type: {Type}", 
                    request.Filter?.EmployeeId ?? "all", 
                    request.Filter?.Active?.ToString() ?? "all",
                    request.Filter?.CompensationType ?? "all");
                _logger.LogInformation("Pagination - First: {First}, After: {After}", request.First, request.After ?? "null");

                // Build GraphQL query using the exact schema provided
                var query = @"
                    query getEmployeeCompensations($filter: Payroll_EmployeeCompensationsFilter!) {
                        payrollEmployeeCompensations(filter: $filter) {
                            edges {
                                node {
                                    id
                                    active
                                    employerCompensation {
                                        id
                                        name
                                        type {
                                            key
                                            description
                                            value
                                        }
                                    }
                                }
                            }
                        }
                    }";
                
                _logger.LogInformation("Using provided GraphQL schema for employee compensations");

                var variables = new
                {
                    filter = new
                    {
                        employeeId = request.Filter?.EmployeeId,
                        active = request.Filter?.Active
                    }
                };

                _logger.LogInformation("GraphQL Query: {Query}", query);
                _logger.LogInformation("GraphQL Variables: {Variables}", System.Text.Json.JsonSerializer.Serialize(variables));

                // Execute GraphQL query directly using HttpClient
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token.AccessToken}");
                httpClient.DefaultRequestHeaders.Add("Accept", "application/json");

                var graphqlRequest = new
                {
                    query = query,
                    variables = variables
                };

                var jsonContent = System.Text.Json.JsonSerializer.Serialize(graphqlRequest);
                var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

                var httpResponse = await httpClient.PostAsync(_config.GraphQLEndpoint, content);
                var responseContent = await httpResponse.Content.ReadAsStringAsync();

                _logger.LogInformation("GraphQL Response Status: {StatusCode}", httpResponse.StatusCode);
                _logger.LogInformation("GraphQL Response Content: {Content}", responseContent);

                Dictionary<string, object>? graphqlResult = null;
                if (httpResponse.IsSuccessStatusCode)
                {
                    graphqlResult = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);
                }
                else
                {
                    _logger.LogError("GraphQL request failed with status {StatusCode}: {Content}", httpResponse.StatusCode, responseContent);
                }

                _logger.LogInformation("=== GRAPHQL RESPONSE ===");
                _logger.LogInformation("GraphQL Result: {Result}", System.Text.Json.JsonSerializer.Serialize(graphqlResult));

                // Parse the GraphQL response with the new schema structure
                if (graphqlResult?.ContainsKey("data") == true && 
                    graphqlResult["data"] is System.Text.Json.JsonElement dataElement &&
                    dataElement.TryGetProperty("payrollEmployeeCompensations", out var compensationsElement))
                {
                    var response = new EmployeeCompensationResponse();

                    _logger.LogInformation("=== PAYROLL EMPLOYEE COMPENSATIONS FOUND ===");
                    
                    // Parse edges
                    if (compensationsElement.TryGetProperty("edges", out var edgesElement) && edgesElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        foreach (var edge in edgesElement.EnumerateArray())
                        {
                            if (edge.TryGetProperty("node", out var nodeElement))
                            {
                                var compensationId = nodeElement.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? "" : "";
                                var active = nodeElement.TryGetProperty("active", out var activeProp) && activeProp.GetBoolean();

                                // Parse employer compensation
                                if (nodeElement.TryGetProperty("employerCompensation", out var employerCompElement))
                                {
                                    var empCompId = employerCompElement.TryGetProperty("id", out var empCompIdProp) ? empCompIdProp.GetString() ?? "" : "";
                                    var empCompName = employerCompElement.TryGetProperty("name", out var empCompNameProp) ? empCompNameProp.GetString() ?? "" : "";
                                    
                                    // Parse type
                                    var typeKey = "";
                                    var typeDescription = "";
                                    var typeValue = "";
                                    
                                    if (employerCompElement.TryGetProperty("type", out var typeElement))
                                    {
                                        typeKey = typeElement.TryGetProperty("key", out var keyProp) ? keyProp.GetString() ?? "" : "";
                                        typeDescription = typeElement.TryGetProperty("description", out var descProp) ? descProp.GetString() ?? "" : "";
                                        typeValue = typeElement.TryGetProperty("value", out var valueProp) ? valueProp.GetString() ?? "" : "";
                                    }

                                    var compensationNode = new EmployeeCompensationNode
                                    {
                                        Id = compensationId,
                                        EmployeeId = request.Filter?.EmployeeId ?? "unknown",
                                        Active = active,
                                        CompensationType = typeKey,
                                        Rate = 0, // Rate might need to be extracted from typeValue
                                        Currency = "USD",
                                        EffectiveDate = null,
                                        EndDate = null,
                                        PayrollItem = new PayrollItemInfo
                                        {
                                            Id = empCompId,
                                            Name = empCompName,
                                            Type = typeDescription
                                        }
                                    };

                                    response.Nodes.Add(compensationNode);
                                    
                                    _logger.LogInformation("Parsed compensation: ID={Id}, Active={Active}, Type={Type}, Name={Name}", 
                                        compensationId, active, typeKey, empCompName);
                                }
                            }
                        }
                    }

                    response.TotalCount = response.Nodes.Count;
                    response.PageInfo = new PageInfo
                    {
                        HasNextPage = false,
                        HasPreviousPage = false,
                        StartCursor = response.Nodes.FirstOrDefault()?.Id,
                        EndCursor = response.Nodes.LastOrDefault()?.Id
                    };

                    _logger.LogInformation("Parsed {Count} employee compensation nodes from GraphQL response", response.Nodes.Count);
                    return response;
                }

                _logger.LogWarning("No compensation data found in GraphQL response");
                return new EmployeeCompensationResponse();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing GraphQL employee compensation query");
                return new EmployeeCompensationResponse();
            }
        }


        private async Task<List<object>> GetEmployeeCompensationFromQuickBooks(OAuthToken token, string employeeId)
        {
            try
            {
                var dataService = CreateDataService(token);
                
                _logger.LogInformation("=== QUICKBOOKS API REQUEST ===");
                _logger.LogInformation("Making API call to QuickBooks Online for Employee ID: {EmployeeId}", employeeId);
                
                // Get the employee details first
                _logger.LogInformation("Fetching Employee details from QBO...");
                var employee = dataService.FindById(new Intuit.Ipp.Data.Employee() { Id = employeeId });
                if (employee == null)
                {
                    _logger.LogWarning("Employee {EmployeeId} not found", employeeId);
                    return new List<object>();
                }
                
                _logger.LogInformation("Employee found: {DisplayName} (ID: {Id})", employee.DisplayName, employee.Id);
                
                var compensationList = new List<object>();
                
                // Query for payroll items that could be used for compensation
                _logger.LogInformation("Fetching Service Items from QBO for compensation...");
                _logger.LogInformation("QBO Query: SELECT * FROM Item WHERE Type = 'Service' AND Active = true");
                
                var payrollItems = dataService.FindAll(new Item()).Where(i => 
                    i.Type == ItemTypeEnum.Service && 
                    i.Active == true
                ).ToList();
                
                _logger.LogInformation("=== QUICKBOOKS API RESPONSE ===");
                _logger.LogInformation("Found {Count} service items", payrollItems.Count);
                
                foreach (var item in payrollItems)
                {
                    _logger.LogInformation("Item Details:");
                    _logger.LogInformation("  ID: {Id}", item.Id);
                    _logger.LogInformation("  Name: {Name}", item.Name);
                    _logger.LogInformation("  Type: {Type}", item.Type);
                    _logger.LogInformation("  UnitPrice: {UnitPrice}", item.UnitPrice);
                    _logger.LogInformation("  Active: {Active}", item.Active);
                    _logger.LogInformation("  Description: {Description}", item.Description ?? "null");
                    _logger.LogInformation("  QtyOnHand: {QtyOnHand}", item.QtyOnHand);
                    _logger.LogInformation("  IncomeAccountRef: {IncomeAccountRef}", item.IncomeAccountRef?.Value ?? "null");
                    _logger.LogInformation("  ExpenseAccountRef: {ExpenseAccountRef}", item.ExpenseAccountRef?.Value ?? "null");
                    
                    // Handle null or zero unit price
                    var unitPrice = item.UnitPrice;
                    var rateDisplay = unitPrice > 0 
                        ? $"${unitPrice:F2}/hour" 
                        : $"{item.Name} - No rate set";
                    
                    compensationList.Add(new
                    {
                        id = item.Id,
                        type = "Service",
                        rate = rateDisplay,
                        name = item.Name,
                        description = item.Description,
                        billable = unitPrice > 0,
                        active = item.Active == true,
                        // Include raw data for debugging
                        unitPrice = item.UnitPrice,
                        qtyOnHand = item.QtyOnHand,
                        incomeAccountRef = item.IncomeAccountRef?.Value,
                        expenseAccountRef = item.ExpenseAccountRef?.Value
                    });
                    _logger.LogInformation("  ---");
                }
                
                _logger.LogInformation("=== END QBO RESPONSE ===");
                _logger.LogInformation("Retrieved {Count} compensation items for employee {EmployeeId}", compensationList.Count, employeeId);
                return compensationList;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting employee compensation from QuickBooks");
                return new List<object>();
            }
        }

        private async Task<object> CreateTimeActivityInQuickBooks(OAuthToken token, TimeActivityRequest request)
        {
            try
            {
                _logger.LogInformation("=== QUICKBOOKS TIME ACTIVITY API REQUEST ===");
                
                // Debug logging for request values
                _logger.LogInformation("Raw request - EmployeeId: '{EmployeeId}', EmployeeRef.Value: '{EmployeeRefValue}'", 
                    request.EmployeeId ?? "null", request.EmployeeRef?.Value ?? "null");
                
                // Handle both old format (EmployeeId, Date) and new format (EmployeeRef, TxnDate)
                var employeeId = !string.IsNullOrEmpty(request.EmployeeRef?.Value) ? request.EmployeeRef.Value : request.EmployeeId ?? "";
                var txnDate = request.TxnDate != DateTime.MinValue ? request.TxnDate : request.Date;
                var customerId = !string.IsNullOrEmpty(request.CustomerRef?.Value) ? request.CustomerRef.Value : request.CustomerId;
                var itemId = !string.IsNullOrEmpty(request.ItemRef?.Value) ? request.ItemRef.Value : request.ItemId;
                var payrollItemId = request.PayrollItemRef?.Value;
                var projectId = !string.IsNullOrEmpty(request.ProjectRef?.Value) ? request.ProjectRef.Value : request.ProjectId;
                
                _logger.LogInformation("Creating TimeActivity for Employee: {EmployeeId}", employeeId);
                _logger.LogInformation("Date: {Date}", txnDate);
                _logger.LogInformation("Hours: {Hours}", request.Hours);
                _logger.LogInformation("Minutes: {Minutes}", request.Minutes);
                _logger.LogInformation("Description: {Description}", request.Description ?? "null");
                _logger.LogInformation("Customer ID: {CustomerId}", customerId ?? "null");
                _logger.LogInformation("Item ID: {ItemId}", itemId ?? "null");
                _logger.LogInformation("PayrollItem ID: {PayrollItemId}", payrollItemId ?? "null");
                _logger.LogInformation("Project ID: {ProjectId}", projectId ?? "null");

                var dataService = CreateDataService(token);
                
                // Validate required fields
                if (string.IsNullOrEmpty(employeeId))
                {
                    throw new ArgumentException("Employee ID is required");
                }
                
                if (txnDate == DateTime.MinValue)
                {
                    txnDate = DateTime.Now;
                }

                _logger.LogInformation("Final Values - TxnDate: {TxnDate}", txnDate);
                _logger.LogInformation("Final Values - EmployeeId: {EmployeeId}", employeeId);
                _logger.LogInformation("Final Values - CustomerId: {CustomerId}", customerId ?? "null");
                _logger.LogInformation("Final Values - ItemId: {ItemId}", itemId ?? "null");
                
                var timeActivity = new TimeActivity
                {
                    TxnDate = txnDate,
                    TxnDateSpecified = true,
                    NameOf = TimeActivityTypeEnum.Employee,
                    NameOfSpecified = true,
                    AnyIntuitObject = new QuickBooksReferenceType { Value = employeeId },
                    Hours = (int)request.Hours,
                    HoursSpecified = true,
                    Minutes = request.Minutes,
                    MinutesSpecified = true,
                    Description = request.Description ?? ""
                };

                // Set optional references if provided
                if (!string.IsNullOrEmpty(customerId))
                {
                    timeActivity.CustomerRef = new QuickBooksReferenceType { Value = customerId };
                    _logger.LogInformation("Setting CustomerRef: {CustomerRef}", customerId);
                }

                if (!string.IsNullOrEmpty(itemId))
                {
                    timeActivity.ItemRef = new QuickBooksReferenceType { Value = itemId };
                    _logger.LogInformation("Setting ItemRef: {ItemRef}", itemId);
                }
                
                if (!string.IsNullOrEmpty(payrollItemId))
                {
                    // Note: PayrollItemRef might need to be mapped to a different property in QuickBooks SDK
                    _logger.LogInformation("PayrollItemRef provided but not mapped to QBO TimeActivity: {PayrollItemId}", payrollItemId);
                }
                
                if (!string.IsNullOrEmpty(projectId))
                {
                    timeActivity.ProjectRef = new QuickBooksReferenceType { Value = projectId };
                    _logger.LogInformation("Setting ProjectRef: {ProjectRef}", projectId);
                }

                _logger.LogInformation("QBO Request: Creating TimeActivity with Employee: {Employee}, Date: {Date}", 
                    timeActivity.AnyIntuitObject?.Value ?? "null", timeActivity.TxnDate);
                
                var createdTimeActivity = dataService.Add(timeActivity);
                
                _logger.LogInformation("=== QUICKBOOKS TIME ACTIVITY API RESPONSE ===");
                _logger.LogInformation("Created TimeActivity with ID: {Id}", createdTimeActivity.Id);
                _logger.LogInformation("Response TxnDate: {TxnDate}", createdTimeActivity.TxnDate);
                _logger.LogInformation("Response Hours: {Hours}", createdTimeActivity.Hours);
                _logger.LogInformation("Response Employee: {Employee}", createdTimeActivity.AnyIntuitObject?.Value ?? "null");
                _logger.LogInformation("Response Customer: {Customer}", createdTimeActivity.CustomerRef?.Value ?? "null");
                _logger.LogInformation("Response Item: {Item}", createdTimeActivity.ItemRef?.Value ?? "null");
                _logger.LogInformation("Response Project: {Project}", createdTimeActivity.ProjectRef?.Value ?? "null");
                _logger.LogInformation("=== END QBO TIME ACTIVITY RESPONSE ===");
                
                return new
                {
                    Id = createdTimeActivity.Id,
                    TxnDate = createdTimeActivity.TxnDate,
                    Employee = createdTimeActivity.AnyIntuitObject,
                    Hours = createdTimeActivity.Hours,
                    Minutes = createdTimeActivity.Minutes,
                    Description = createdTimeActivity.Description,
                    Customer = createdTimeActivity.CustomerRef,
                    Item = createdTimeActivity.ItemRef,
                    Project = createdTimeActivity.ProjectRef
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating TimeActivity in QuickBooks");
                throw;
            }
        }

        private DataService CreateDataService(OAuthToken token)
        {
            // Create OAuth2RequestValidator
            var oauth2RequestValidator = new OAuth2RequestValidator(token.AccessToken);
            
            // Create ServiceContext
            var serviceContext = new ServiceContext(token.RealmId, IntuitServicesType.QBO, oauth2RequestValidator);
            serviceContext.IppConfiguration.BaseUrl.Qbo = _config.BaseUrl;
            serviceContext.IppConfiguration.MinorVersion.Qbo = "75";
            
            // Create DataService
            return new DataService(serviceContext);
        }

        private bool ExtractProjectsEnabled(object preferences)
        {
            // Extract projects enabled from preferences object
            try
            {
                var prefsType = preferences.GetType();
                var otherPrefsProperty = prefsType.GetProperty("OtherPrefs");
                
                if (otherPrefsProperty?.GetValue(preferences) is IEnumerable<object> otherPrefs)
                {
                    foreach (var pref in otherPrefs)
                    {
                        var nameProperty = pref.GetType().GetProperty("Name");
                        var valueProperty = pref.GetType().GetProperty("Value");
                        
                        if (nameProperty?.GetValue(pref)?.ToString() == "ProjectsEnabled")
                        {
                            return valueProperty?.GetValue(pref)?.ToString()?.ToLower() == "true";
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting projects enabled from preferences");
            }
            
            return false;
        }

        private bool ExtractTimeTrackingEnabled(object preferences)
        {
            // Extract time tracking enabled from preferences object
            try
            {
                var prefsType = preferences.GetType();
                var otherPrefsProperty = prefsType.GetProperty("OtherPrefs");
                
                if (otherPrefsProperty?.GetValue(preferences) is IEnumerable<object> otherPrefs)
                {
                    foreach (var pref in otherPrefs)
                    {
                        var nameProperty = pref.GetType().GetProperty("Name");
                        var valueProperty = pref.GetType().GetProperty("Value");
                        
                        if (nameProperty?.GetValue(pref)?.ToString() == "TimeTrackingFeatureEnabled")
                        {
                            return valueProperty?.GetValue(pref)?.ToString()?.ToLower() == "true";
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting time tracking enabled from preferences");
            }
            
            return false;
        }

        private bool IsValidBase64String(string value)
        {
            if (string.IsNullOrEmpty(value))
                return false;

            try
            {
                // Check if string is valid base64
                Convert.FromBase64String(value);
                return true;
            }
            catch (FormatException)
            {
                return false;
            }
        }

        private (string Query, object? Variables) BuildDynamicGraphQLQuery(ProjectFilterOptions? filterOptions, string? cursor)
        {
            var hasFilters = filterOptions?.HasAnyFilter() == true;
            var first = filterOptions?.First ?? 50;
            
            // Build query parameters
            var queryParams = new List<string> { "$first: PositiveInt!" };
            var queryArgs = new List<string> { $"first: $first" };
            
            if (!string.IsNullOrEmpty(cursor))
            {
                queryParams.Add("$after: String");
                queryArgs.Add("after: $after");
            }
            
            if (hasFilters)
            {
                queryParams.Add("$filter: ProjectManagement_ProjectFilter!");
                queryArgs.Add("filter: $filter");
            }
            
            // Add orderBy parameter - required by QuickBooks GraphQL API
            queryParams.Add("$orderBy: [ProjectManagement_OrderBy!]");
            queryArgs.Add("orderBy: $orderBy");

            var query = $@"
                query projectManagementProjects({string.Join(", ", queryParams)}) {{
                    projectManagementProjects({string.Join(", ", queryArgs)}) {{
                        edges {{
                            node {{
                                id
                                name
                                description
                                status
                                dueDate
                                startDate
                                completedDate
                                customerId: customer {{
                                    id
                                }}
                            }}
                        }}
                        pageInfo {{
                            hasNextPage
                            endCursor
                        }}
                    }}
                }}";

            // Build variables object
            var variables = new Dictionary<string, object> { ["first"] = first };
            
            if (!string.IsNullOrEmpty(cursor))
            {
                variables["after"] = cursor;
            }
            
            if (hasFilters)
            {
                var filter = new Dictionary<string, object>();
                
                // Handle start date range (use first range only since OR is not supported)
                if (filterOptions!.HasStartDateRange1())
                {
                    var startDateFilter = new Dictionary<string, object>();
                    if (filterOptions.StartDateFrom1.HasValue && filterOptions.StartDateTo1.HasValue)
                    {
                        startDateFilter["between"] = new
                        {
                            minDate = filterOptions.StartDateFrom1.Value.ToString("yyyy-MM-ddTHH:mm:ss.fffffffzzz"),
                            maxDate = filterOptions.StartDateTo1.Value.ToString("yyyy-MM-ddTHH:mm:ss.fffffffzzz")
                        };
                    }
                    else if (filterOptions.StartDateFrom1.HasValue)
                    {
                        startDateFilter["greaterThanOrEqualTo"] = filterOptions.StartDateFrom1.Value.ToString("yyyy-MM-ddTHH:mm:ss.fffffffzzz");
                    }
                    else if (filterOptions.StartDateTo1.HasValue)
                    {
                        startDateFilter["lessThanOrEqualTo"] = filterOptions.StartDateTo1.Value.ToString("yyyy-MM-ddTHH:mm:ss.fffffffzzz");
                    }
                    
                    if (startDateFilter.Any())
                    {
                        filter["startDate"] = startDateFilter;
                    }
                }
                
                // Handle due date range (use first range only since OR is not supported)
                if (filterOptions.HasDueDateRange1())
                {
                    var dueDateFilter = new Dictionary<string, object>();
                    if (filterOptions.DueDateFrom1.HasValue && filterOptions.DueDateTo1.HasValue)
                    {
                        dueDateFilter["between"] = new
                        {
                            minDate = filterOptions.DueDateFrom1.Value.ToString("yyyy-MM-dd"),
                            maxDate = filterOptions.DueDateTo1.Value.ToString("yyyy-MM-dd")
                        };
                    }
                    else if (filterOptions.DueDateFrom1.HasValue)
                    {
                        dueDateFilter["greaterThanOrEqualTo"] = filterOptions.DueDateFrom1.Value.ToString("yyyy-MM-dd");
                    }
                    else if (filterOptions.DueDateTo1.HasValue)
                    {
                        dueDateFilter["lessThanOrEqualTo"] = filterOptions.DueDateTo1.Value.ToString("yyyy-MM-dd");
                    }
                    
                    if (dueDateFilter.Any())
                    {
                        filter["dueDate"] = dueDateFilter;
                    }
                }
                
                // Handle completed date range (single range)
                if (filterOptions.CompletedDateFrom.HasValue || filterOptions.CompletedDateTo.HasValue)
                {
                    var completedDateFilter = new Dictionary<string, object>();
                    if (filterOptions.CompletedDateFrom.HasValue && filterOptions.CompletedDateTo.HasValue)
                    {
                        completedDateFilter["between"] = new
                        {
                            minDate = filterOptions.CompletedDateFrom.Value.ToString("yyyy-MM-ddTHH:mm:ss.fffffffzzz"),
                            maxDate = filterOptions.CompletedDateTo.Value.ToString("yyyy-MM-ddTHH:mm:ss.fffffffzzz")
                        };
                    }
                    else if (filterOptions.CompletedDateFrom.HasValue)
                    {
                        completedDateFilter["greaterThanOrEqualTo"] = filterOptions.CompletedDateFrom.Value.ToString("yyyy-MM-ddTHH:mm:ss.fffffffzzz");
                    }
                    else if (filterOptions.CompletedDateTo.HasValue)
                    {
                        completedDateFilter["lessThanOrEqualTo"] = filterOptions.CompletedDateTo.Value.ToString("yyyy-MM-ddTHH:mm:ss.fffffffzzz");
                    }
                    filter["completedDate"] = completedDateFilter;
                }
                
                // OR conditions removed - not supported by QuickBooks GraphQL
                
                if (filter.Any())
                {
                    variables["filter"] = filter;
                }
            }
            
            // Add orderBy variable - required by QuickBooks GraphQL API
            variables["orderBy"] = new[] { "DUE_DATE_DESC" };

            return (query, variables.Count > 1 ? variables : null);
        }

        #endregion

        #region Time Activities API

        [HttpGet("dashboard/timeactivities")]
        public async Task<IActionResult> GetDashboardTimeActivities([FromQuery] string? employeeId = null, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
            var token = await ValidateToken();
            if (token == null)
            {
                return Unauthorized(new { error = "No valid OAuth token found" });
            }

                _logger.LogInformation("Fetching time activities with employeeId: {EmployeeId}, startDate: {StartDate}, endDate: {EndDate}, page: {Page}, pageSize: {PageSize}", 
                    employeeId, startDate, endDate, page, pageSize);

                var timeActivities = await GetTimeActivitiesFromQuickBooks(token, employeeId, startDate, endDate, page, pageSize);
                
                return Ok(new { 
                    success = true, 
                    data = timeActivities.Items,
                    pagination = new {
                        currentPage = page,
                        pageSize = pageSize,
                        totalItems = timeActivities.TotalItems,
                        totalPages = timeActivities.TotalPages,
                        hasNextPage = timeActivities.HasNextPage,
                        hasPreviousPage = timeActivities.HasPreviousPage
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching time activities");
                return StatusCode(500, new { error = "Failed to fetch time activities", details = ex.Message });
            }
        }

        private async Task<(List<object> Items, int TotalItems, int TotalPages, bool HasNextPage, bool HasPreviousPage)> GetTimeActivitiesFromQuickBooks(
            OAuthToken token, string? employeeId = null, DateTime? startDate = null, DateTime? endDate = null, int page = 1, int pageSize = 20)
        {
            try
            {
                _logger.LogInformation("=== DASHBOARD TIME ACTIVITIES API REQUEST ===");
                _logger.LogInformation("Filters - Employee: {EmployeeId}, Start: {StartDate}, End: {EndDate}, Page: {Page}, PageSize: {PageSize}",
                    employeeId ?? "all", startDate?.ToString("yyyy-MM-dd") ?? "no limit", endDate?.ToString("yyyy-MM-dd") ?? "no limit", page, pageSize);

                var dataService = CreateDataService(token);
                if (dataService == null)
                {
                    throw new InvalidOperationException("Failed to create QuickBooks data service");
                }

                // Get all time activities first (for total count)
                var allTimeActivities = dataService.FindAll(new TimeActivity(), 1, 1000)
                    .Where(ta => 
                        (string.IsNullOrEmpty(employeeId) || ta.AnyIntuitObject?.Value == employeeId) &&
                        (!startDate.HasValue || ta.TxnDate >= startDate.Value) &&
                        (!endDate.HasValue || ta.TxnDate <= endDate.Value))
                    .OrderByDescending(ta => ta.TxnDate)
                    .ToList();

                var totalItems = allTimeActivities.Count;
                var totalPages = (int)Math.Ceiling((double)totalItems / pageSize);

                // Apply pagination
                var timeActivities = allTimeActivities
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToList();

                _logger.LogInformation("=== DASHBOARD TIME ACTIVITIES API RESPONSE ===");
                _logger.LogInformation("Found {Count} time activities (page {Page} of {TotalPages})", timeActivities.Count, page, totalPages);

                var timeActivityList = timeActivities.Select(ta => {
                    _logger.LogInformation("TimeActivity - ID: {Id}, Employee: {Employee}, Date: {Date}, Hours: {Hours}",
                        ta.Id, ta.AnyIntuitObject?.Value ?? "null", ta.TxnDate.ToString("yyyy-MM-dd"), ta.Hours);
                    
                    return new
                    {
                        Id = ta.Id,
                        TxnDate = ta.TxnDate,
                        EmployeeRef = ta.AnyIntuitObject?.Value,
                        EmployeeName = ta.AnyIntuitObject?.Value ?? "Unknown Employee", // Could enhance with lookup
                        CustomerRef = ta.CustomerRef?.Value,
                        CustomerName = ta.CustomerRef?.Value ?? "No Customer", // Could enhance with lookup
                        ItemRef = ta.ItemRef?.Value,
                        ItemName = ta.ItemRef?.Value ?? "No Item", // Could enhance with lookup
                        Hours = ta.Hours,
                        Minutes = ta.Minutes,
                        HourlyRate = ta.HourlyRate,
                        Description = ta.Description,
                        BillableStatus = ta.BillableStatus.ToString(),
                        Billable = ta.BillableStatus == BillableStatusEnum.Billable,
                        TotalHours = (decimal)(ta.Hours + (ta.Minutes / 60.0)),
                        MetaData = ta.MetaData != null ? new { 
                            CreateTime = ta.MetaData.CreateTime, 
                            LastUpdatedTime = ta.MetaData.LastUpdatedTime 
                        } : null
                    };
                }).Cast<object>().ToList();

                _logger.LogInformation("=== END DASHBOARD TIME ACTIVITIES RESPONSE ===");

                return (
                    Items: timeActivityList,
                    TotalItems: totalItems,
                    TotalPages: totalPages,
                    HasNextPage: page < totalPages,
                    HasPreviousPage: page > 1
                );
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving time activities from QuickBooks");
                throw;
            }
        }

        #endregion
    }
}
