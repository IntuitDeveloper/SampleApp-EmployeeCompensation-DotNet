using QuickBooks.EmployeeCompensation.API.Models;
using GraphQL;
using GraphQL.Client.Http;
using GraphQL.Client.Serializer.Newtonsoft;
using Intuit.Ipp.Core;
using Intuit.Ipp.QueryFilter;
using Intuit.Ipp.DataService;
using Intuit.Ipp.Security;
using Newtonsoft.Json;
using System.Linq;
using ApiEmployee = QuickBooks.EmployeeCompensation.API.Models.Employee;
using IppEmployee = Intuit.Ipp.Data.Employee;
using Task = System.Threading.Tasks.Task;

namespace QuickBooks.EmployeeCompensation.API.Services
{
    public class EmployeeCompensationService : IEmployeeCompensationService, IDisposable
    {
        private readonly QuickBooksConfig _config;
        private readonly ITokenManagerService _tokenManager;
        private readonly ILogger<EmployeeCompensationService> _logger;
        private readonly GraphQLHttpClient _graphQLClient;

        public EmployeeCompensationService(
            QuickBooksConfig config, 
            ITokenManagerService tokenManager, 
            ILogger<EmployeeCompensationService> logger)
        {
            _config = config;
            _tokenManager = tokenManager;
            _logger = logger;
            _graphQLClient = new GraphQLHttpClient(_config.GraphQLEndpoint, new NewtonsoftJsonSerializer());
        }

        #region Employee Operations

        public void Dispose()
        {
            _graphQLClient?.Dispose();
            GC.SuppressFinalize(this);
        }

        public async Task<Dictionary<string, object>?> ExecuteGraphQLQueryAsync(string accessToken, string query, object variables)
        {
            try
            {
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");
                httpClient.DefaultRequestHeaders.Add("Accept", "application/json");

                var graphqlRequest = new
                {
                    query = query,
                    variables = variables
                };

                var jsonContent = System.Text.Json.JsonSerializer.Serialize(graphqlRequest);
                var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

                _logger.LogInformation("Executing GraphQL Query: {Query}", query);
                _logger.LogInformation("GraphQL Variables: {Variables}", System.Text.Json.JsonSerializer.Serialize(variables));

                var response = await httpClient.PostAsync(_config.GraphQLEndpoint, content);
                var responseContent = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("GraphQL Response: {Response}", responseContent);

                if (response.IsSuccessStatusCode)
                {
                    var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);
                    return jsonResponse;
                }
                else
                {
                    _logger.LogError("GraphQL request failed with status {StatusCode}: {Content}", response.StatusCode, responseContent);
                    return null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing GraphQL query");
                return null;
            }
        }

        public async Task<List<Employee>> GetEmployeesAsync(OAuthToken token, EmployeeQueryRequest? query = null)
        {
            try
            {
                if (token == null)
                {
                    return new List<Employee>();
                }

                // Use QuickBooks SDK to get employees
                var employees = await GetEmployeesFromQuickBooksAsync(token, query);
                
                return employees;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving employees");
                return new List<Employee>();
            }
        }

        public async Task<ApiResponse<ApiEmployee>> GetEmployeeByIdAsync(string employeeId)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return new ApiResponse<ApiEmployee>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required. Please authenticate with QuickBooks first."
                    };
                }

                var employee = await GetEmployeeFromQuickBooksAsync(token, employeeId);
                
                if (employee == null)
                {
                    return new ApiResponse<ApiEmployee>
                    {
                        Success = false,
                        ErrorMessage = $"Employee with ID {employeeId} not found."
                    };
                }

                return new ApiResponse<ApiEmployee>
                {
                    Success = true,
                    Data = employee
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving employee {EmployeeId}", employeeId);
                return new ApiResponse<ApiEmployee>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public async Task<ApiResponse<ApiEmployee>> CreateEmployeeAsync(ApiEmployee employee)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return new ApiResponse<ApiEmployee>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required. Please authenticate with QuickBooks first."
                    };
                }

                var createdEmployee = await CreateEmployeeInQuickBooksAsync(token, employee);
                
                return new ApiResponse<ApiEmployee>
                {
                    Success = true,
                    Data = createdEmployee
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating employee");
                return new ApiResponse<ApiEmployee>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public async Task<ApiResponse<ApiEmployee>> UpdateEmployeeAsync(ApiEmployee employee)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return new ApiResponse<ApiEmployee>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required. Please authenticate with QuickBooks first."
                    };
                }

                var updatedEmployee = await UpdateEmployeeInQuickBooksAsync(token, employee);
                
                return new ApiResponse<ApiEmployee>
                {
                    Success = true,
                    Data = updatedEmployee
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating employee {EmployeeId}", employee.Id);
                return new ApiResponse<ApiEmployee>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public async Task<ApiResponse<bool>> DeleteEmployeeAsync(string employeeId)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return new ApiResponse<bool>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required. Please authenticate with QuickBooks first."
                    };
                }

                await DeleteEmployeeFromQuickBooksAsync(token, employeeId);
                
                return new ApiResponse<bool>
                {
                    Success = true,
                    Data = true
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting employee {EmployeeId}", employeeId);
                return new ApiResponse<bool>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        #endregion

        #region Compensation Operations

        public async Task<List<CompensationItem>> GetCompensationItemsAsync(CompensationQueryRequest? query = null)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return new List<CompensationItem>();
                }

                var compensationItems = await GetCompensationItemsFromQuickBooksAsync(token, query);
                
                return compensationItems;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving compensation items");
                return new List<CompensationItem>();
            }
        }

        public async Task<ApiResponse<CompensationItem>> GetCompensationItemByIdAsync(string compensationId)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return new ApiResponse<CompensationItem>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required. Please authenticate with QuickBooks first."
                    };
                }

                var compensationItem = await GetCompensationItemFromQuickBooksAsync(token, compensationId);
                
                if (compensationItem == null)
                {
                    return new ApiResponse<CompensationItem>
                    {
                        Success = false,
                        ErrorMessage = $"Compensation item with ID {compensationId} not found."
                    };
                }

                return new ApiResponse<CompensationItem>
                {
                    Success = true,
                    Data = compensationItem
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving compensation item {CompensationId}", compensationId);
                return new ApiResponse<CompensationItem>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public async Task<ApiResponse<CompensationItem>> CreateCompensationItemAsync(CreateCompensationRequest request)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return new ApiResponse<CompensationItem>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required. Please authenticate with QuickBooks first."
                    };
                }

                var compensationItem = await CreateCompensationItemInQuickBooksAsync(token, request);
                
                return new ApiResponse<CompensationItem>
                {
                    Success = true,
                    Data = compensationItem
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating compensation item");
                return new ApiResponse<CompensationItem>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public async Task<ApiResponse<CompensationItem>> UpdateCompensationItemAsync(UpdateCompensationRequest request)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return new ApiResponse<CompensationItem>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required. Please authenticate with QuickBooks first."
                    };
                }

                var compensationItem = await UpdateCompensationItemInQuickBooksAsync(token, request);
                
                return new ApiResponse<CompensationItem>
                {
                    Success = true,
                    Data = compensationItem
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating compensation item {CompensationId}", request.CompensationId);
                return new ApiResponse<CompensationItem>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public async Task<ApiResponse<bool>> DeleteCompensationItemAsync(string compensationId)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return new ApiResponse<bool>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required. Please authenticate with QuickBooks first."
                    };
                }

                await DeleteCompensationItemFromQuickBooksAsync(token, compensationId);
                
                return new ApiResponse<bool>
                {
                    Success = true,
                    Data = true
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting compensation item {CompensationId}", compensationId);
                return new ApiResponse<bool>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        #endregion

        #region Employee Compensation Operations

        public async Task<ApiResponse<List<CompensationItem>>> GetEmployeeCompensationAsync(string employeeId)
        {
            try
            {
                var compensationQuery = new CompensationQueryRequest { EmployeeId = employeeId };
                var compensationItems = await GetCompensationItemsAsync(compensationQuery);
                return new ApiResponse<List<CompensationItem>>
                {
                    Success = true,
                    Data = compensationItems
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving compensation for employee {EmployeeId}", employeeId);
                return new ApiResponse<List<CompensationItem>>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public async Task<ApiResponse<CompensationSummary>> GetEmployeeCompensationSummaryAsync(string employeeId)
        {
            try
            {
                var compensationResponse = await GetEmployeeCompensationAsync(employeeId);
                if (!compensationResponse.Success || compensationResponse.Data == null)
                {
                    return new ApiResponse<CompensationSummary>
                    {
                        Success = false,
                        ErrorMessage = compensationResponse.ErrorMessage ?? "Failed to retrieve compensation data"
                    };
                }

                var summary = CalculateCompensationSummary(employeeId, compensationResponse.Data);
                
                return new ApiResponse<CompensationSummary>
                {
                    Success = true,
                    Data = summary
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating compensation summary for employee {EmployeeId}", employeeId);
                return new ApiResponse<CompensationSummary>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public async Task<ApiResponse<CompensationHistory>> GetEmployeeCompensationHistoryAsync(string employeeId)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return new ApiResponse<CompensationHistory>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required. Please authenticate with QuickBooks first."
                    };
                }

                var history = await GetCompensationHistoryFromQuickBooksAsync(token, employeeId);
                
                return new ApiResponse<CompensationHistory>
                {
                    Success = true,
                    Data = history
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving compensation history for employee {EmployeeId}", employeeId);
                return new ApiResponse<CompensationHistory>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        #endregion

        #region Reporting and Analytics

        public async Task<ApiResponse<List<CompensationSummary>>> GetCompensationReportAsync(DateTime? fromDate = null, DateTime? toDate = null)
        {
            try
            {
                var token = await _tokenManager.GetCurrentTokenAsync();
                if (token == null)
                {
                    return new ApiResponse<List<CompensationSummary>>
                    {
                        Success = false,
                        ErrorMessage = "Authentication required"
                    };
                }
                var employees = await GetEmployeesAsync(token);
                if (employees == null || !employees.Any())
                {
                    return new ApiResponse<List<CompensationSummary>>
                    {
                        Success = false,
                        ErrorMessage = "Failed to retrieve employees"
                    };
                }

                var summaries = new List<CompensationSummary>();
                foreach (var employee in employees)
                {
                    var summaryResponse = await GetEmployeeCompensationSummaryAsync(employee.Id);
                    if (summaryResponse.Success && summaryResponse.Data != null)
                    {
                        summaries.Add(summaryResponse.Data);
                    }
                }
                
                return new ApiResponse<List<CompensationSummary>>
                {
                    Success = true,
                    Data = summaries
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating compensation report");
                return new ApiResponse<List<CompensationSummary>>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public async Task<ApiResponse<decimal>> GetTotalCompensationCostAsync(DateTime? fromDate = null, DateTime? toDate = null)
        {
            try
            {
                var reportResponse = await GetCompensationReportAsync(fromDate, toDate);
                if (!reportResponse.Success || reportResponse.Data == null)
                {
                    return new ApiResponse<decimal>
                    {
                        Success = false,
                        ErrorMessage = reportResponse.ErrorMessage ?? "Failed to generate compensation report"
                    };
                }

                var totalCost = reportResponse.Data.Sum(s => s.TotalAnnualSalary + s.TotalBonuses + s.TotalBenefitValue);
                
                return new ApiResponse<decimal>
                {
                    Success = true,
                    Data = totalCost
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating total compensation cost");
                return new ApiResponse<decimal>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        public async Task<ApiResponse<Dictionary<string, decimal>>> GetCompensationBreakdownAsync(string? employeeId = null)
        {
            try
            {
                List<CompensationItem> compensationItems;
                
                if (!string.IsNullOrEmpty(employeeId))
                {
                    var employeeCompensationResponse = await GetEmployeeCompensationAsync(employeeId);
                    if (!employeeCompensationResponse.Success || employeeCompensationResponse.Data == null)
                    {
                        return new ApiResponse<Dictionary<string, decimal>>
                        {
                            Success = false,
                            ErrorMessage = employeeCompensationResponse.ErrorMessage ?? "Failed to retrieve employee compensation"
                        };
                    }
                    compensationItems = employeeCompensationResponse.Data;
                }
                else
                {
                    var allCompensationItems = await GetCompensationItemsAsync();
                    if (allCompensationItems == null || !allCompensationItems.Any())
                    {
                        return new ApiResponse<Dictionary<string, decimal>>
                        {
                            Success = false,
                            ErrorMessage = "Failed to retrieve compensation data"
                        };
                    }
                    compensationItems = allCompensationItems;
                }

                var breakdown = compensationItems
                    .GroupBy(c => c.Type)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Sum(c => GetCompensationValue(c))
                    );
                
                return new ApiResponse<Dictionary<string, decimal>>
                {
                    Success = true,
                    Data = breakdown
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating compensation breakdown");
                return new ApiResponse<Dictionary<string, decimal>>
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }

        #endregion

        #region Private Helper Methods

        private async Task<List<ApiEmployee>> GetEmployeesFromQuickBooksAsync(OAuthToken token, EmployeeQueryRequest? query)
        {
            try
            {
                var oauth2RequestValidator = new OAuth2RequestValidator(token.AccessToken);
                var context = new ServiceContext(token.RealmId, IntuitServicesType.QBO, oauth2RequestValidator);
                context.IppConfiguration.BaseUrl.Qbo = _config.BaseUrl;
                
                var dataService = new DataService(context);
                var employees = new List<ApiEmployee>();

                // Build query for employees
                var queryService = new QueryService<IppEmployee>(context);
                IEnumerable<IppEmployee> ippEmployees;

                if (query != null && !string.IsNullOrEmpty(query.EmployeeId))
                {
                    // Query specific employee by ID
                    ippEmployees = queryService.ExecuteIdsQuery($"SELECT * FROM Employee WHERE Id = '{query.EmployeeId}'");
                }
                else
                {
                    // Get all employees
                    ippEmployees = queryService.ExecuteIdsQuery("SELECT * FROM Employee");
                }

                // Convert QuickBooks employees to API employees
                foreach (var ippEmployee in ippEmployees)
                {
                    var apiEmployee = new ApiEmployee
                    {
                        Id = ippEmployee.Id,
                        Name = $"{ippEmployee.GivenName} {ippEmployee.FamilyName}".Trim(),
                        DisplayName = ippEmployee.DisplayName ?? $"{ippEmployee.GivenName} {ippEmployee.FamilyName}".Trim(),
                        Email = ippEmployee.PrimaryEmailAddr?.Address ?? string.Empty,
                        EmployeeNumber = ippEmployee.EmployeeNumber ?? string.Empty,
                        Active = ippEmployee.Active,
                        HireDate = ippEmployee.HiredDate
                    };
                    employees.Add(apiEmployee);
                }

                // Apply additional query filters if provided
                if (query != null)
                {
                    if (!string.IsNullOrEmpty(query.Email))
                        employees = employees.Where(e => e.Email.Contains(query.Email, StringComparison.OrdinalIgnoreCase)).ToList();
                    if (query.Active.HasValue)
                        employees = employees.Where(e => e.Active == query.Active.Value).ToList();
                }

                _logger.LogInformation("Retrieved {Count} employees from QuickBooks", employees.Count);
                return employees;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving employees from QuickBooks");
                throw;
            }
        }

        private async Task<ApiEmployee?> GetEmployeeFromQuickBooksAsync(OAuthToken token, string employeeId)
        {
            var employees = await GetEmployeesFromQuickBooksAsync(token, new EmployeeQueryRequest { EmployeeId = employeeId });
            return employees.FirstOrDefault();
        }

        private async Task<ApiEmployee> CreateEmployeeInQuickBooksAsync(OAuthToken token, ApiEmployee employee)
        {
            try
            {
                var oauth2RequestValidator = new OAuth2RequestValidator(token.AccessToken);
                var context = new ServiceContext(token.RealmId, IntuitServicesType.QBO, oauth2RequestValidator);
                context.IppConfiguration.BaseUrl.Qbo = _config.BaseUrl;
                
                var dataService = new DataService(context);

                // Create QuickBooks Employee entity
                var ippEmployee = new IppEmployee
                {
                    GivenName = employee.Name?.Split(' ').FirstOrDefault() ?? string.Empty,
                    FamilyName = employee.Name?.Split(' ').Skip(1).FirstOrDefault() ?? string.Empty,
                    DisplayName = employee.DisplayName ?? employee.Name,
                    EmployeeNumber = employee.EmployeeNumber,
                    Active = employee.Active,
                    HiredDate = employee.HireDate
                };

                if (!string.IsNullOrEmpty(employee.Email))
                {
                    ippEmployee.PrimaryEmailAddr = new Intuit.Ipp.Data.EmailAddress
                    {
                        Address = employee.Email
                    };
                }

                // Add the employee to QuickBooks
                var createdEmployee = await Task.Run(() => dataService.Add(ippEmployee));
                
                // Convert back to API employee
                var result = new ApiEmployee
                {
                    Id = createdEmployee.Id,
                    Name = $"{createdEmployee.GivenName} {createdEmployee.FamilyName}".Trim(),
                    DisplayName = createdEmployee.DisplayName,
                    Email = createdEmployee.PrimaryEmailAddr?.Address ?? string.Empty,
                    EmployeeNumber = createdEmployee.EmployeeNumber,
                    Active = createdEmployee.Active,
                    HireDate = createdEmployee.HiredDate
                };

                _logger.LogInformation("Created employee {EmployeeId} in QuickBooks", result.Id);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating employee in QuickBooks");
                throw;
            }
        }

        private async Task<ApiEmployee> UpdateEmployeeInQuickBooksAsync(OAuthToken token, ApiEmployee employee)
        {
            try
            {
                var oauth2RequestValidator = new OAuth2RequestValidator(token.AccessToken);
                var context = new ServiceContext(token.RealmId, IntuitServicesType.QBO, oauth2RequestValidator);
                context.IppConfiguration.BaseUrl.Qbo = _config.BaseUrl;
                
                var dataService = new DataService(context);
                var queryService = new QueryService<IppEmployee>(context);

                // Get existing employee
                var existingEmployees = queryService.ExecuteIdsQuery($"SELECT * FROM Employee WHERE Id = '{employee.Id}'");
                var existingEmployee = existingEmployees.FirstOrDefault();
                if (existingEmployee == null)
                {
                    throw new InvalidOperationException($"Employee with ID {employee.Id} not found");
                }

                // Update employee properties
                existingEmployee.GivenName = employee.Name?.Split(' ').FirstOrDefault() ?? existingEmployee.GivenName;
                existingEmployee.FamilyName = employee.Name?.Split(' ').Skip(1).FirstOrDefault() ?? existingEmployee.FamilyName;
                existingEmployee.DisplayName = employee.DisplayName ?? existingEmployee.DisplayName;
                existingEmployee.EmployeeNumber = employee.EmployeeNumber ?? existingEmployee.EmployeeNumber;
                existingEmployee.Active = employee.Active;
                
                if (employee.HireDate != default(DateTime))
                {
                    existingEmployee.HiredDate = employee.HireDate;
                }

                if (!string.IsNullOrEmpty(employee.Email))
                {
                    existingEmployee.PrimaryEmailAddr = new Intuit.Ipp.Data.EmailAddress
                    {
                        Address = employee.Email
                    };
                }

                // Update the employee in QuickBooks
                var updatedEmployee = await Task.Run(() => dataService.Update(existingEmployee));
                
                // Convert back to API employee
                var result = new ApiEmployee
                {
                    Id = updatedEmployee.Id,
                    Name = $"{updatedEmployee.GivenName} {updatedEmployee.FamilyName}".Trim(),
                    DisplayName = updatedEmployee.DisplayName,
                    Email = updatedEmployee.PrimaryEmailAddr?.Address ?? string.Empty,
                    EmployeeNumber = updatedEmployee.EmployeeNumber,
                    Active = updatedEmployee.Active,
                    HireDate = updatedEmployee.HiredDate
                };

                _logger.LogInformation("Updated employee {EmployeeId} in QuickBooks", result.Id);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating employee in QuickBooks");
                throw;
            }
        }

        private async Task DeleteEmployeeFromQuickBooksAsync(OAuthToken token, string employeeId)
        {
            try
            {
                var oauth2RequestValidator = new OAuth2RequestValidator(token.AccessToken);
                var context = new ServiceContext(token.RealmId, IntuitServicesType.QBO, oauth2RequestValidator);
                context.IppConfiguration.BaseUrl.Qbo = _config.BaseUrl;
                
                var dataService = new DataService(context);
                var queryService = new QueryService<IppEmployee>(context);

                // Get existing employee
                var existingEmployees = queryService.ExecuteIdsQuery($"SELECT * FROM Employee WHERE Id = '{employeeId}'");
                var existingEmployee = existingEmployees.FirstOrDefault();
                if (existingEmployee == null)
                {
                    throw new InvalidOperationException($"Employee with ID {employeeId} not found");
                }

                // QuickBooks doesn't allow hard deletion of employees, so we deactivate them
                existingEmployee.Active = false;
                
                // Update the employee to deactivate
                await Task.Run(() => dataService.Update(existingEmployee));
                
                _logger.LogInformation("Deactivated employee {EmployeeId} in QuickBooks", employeeId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting/deactivating employee in QuickBooks");
                throw;
            }
        }

        private async Task<List<CompensationItem>> GetCompensationItemsFromQuickBooksAsync(OAuthToken token, CompensationQueryRequest? query)
        {
            try
            {
                var oauth2RequestValidator = new OAuth2RequestValidator(token.AccessToken);
                var context = new ServiceContext(token.RealmId, IntuitServicesType.QBO, oauth2RequestValidator);
                context.IppConfiguration.BaseUrl.Qbo = _config.BaseUrl;
                
                var dataService = new DataService(context);
                var compensationItems = new List<CompensationItem>();

                // Get payroll items (salary, wages, benefits, etc.)
                var queryService = new QueryService<Intuit.Ipp.Data.Item>(context);
                var payrollItems = queryService.ExecuteIdsQuery("SELECT * FROM Item WHERE Type = 'Service'");

                // Get employee information if filtering by employee
                IppEmployee? targetEmployee = null;
                if (query != null && !string.IsNullOrEmpty(query.EmployeeId))
                {
                    var empQueryService = new QueryService<IppEmployee>(context);
                    var employees = empQueryService.ExecuteIdsQuery($"SELECT * FROM Employee WHERE Id = '{query.EmployeeId}'");
                    targetEmployee = employees.FirstOrDefault();
                }

                // Convert payroll items to compensation items
                foreach (var item in payrollItems)
                {
                    // Determine compensation type based on item name/description
                    string compensationType = DetermineCompensationType(item.Name);
                    
                    var compensationItem = new GenericCompensationItem
                    {
                        Id = item.Id,
                        Name = item.Name,
                        Type = compensationType,
                        Amount = item.UnitPrice,
                        EmployeeId = query?.EmployeeId, // Associate with specific employee if queried
                        Active = item.Active,
                        CreatedDate = item.MetaData?.CreateTime ?? DateTime.Now,
                        LastUpdated = item.MetaData?.LastUpdatedTime ?? DateTime.Now
                    };

                    compensationItems.Add(compensationItem);
                }

                // If no specific employee filter, get general compensation structure
                if (query == null || string.IsNullOrEmpty(query.EmployeeId))
                {
                    // Add standard compensation items that apply to all employees
                    compensationItems.AddRange(await GetStandardCompensationItemsAsync(context));
                }

                // Apply query filters if provided
                if (query != null)
                {
                    if (!string.IsNullOrEmpty(query.Type))
                        compensationItems = compensationItems.Where(c => c.Type.Equals(query.Type, StringComparison.OrdinalIgnoreCase)).ToList();
                    
                    if (query.Active.HasValue)
                        compensationItems = compensationItems.Where(c => c.Active == query.Active.Value).ToList();
                    
                    if (query.MinAmount.HasValue)
                        compensationItems = compensationItems.Where(c => c.Amount >= query.MinAmount.Value).ToList();
                    
                    if (query.MaxAmount.HasValue)
                        compensationItems = compensationItems.Where(c => c.Amount <= query.MaxAmount.Value).ToList();
                }

                _logger.LogInformation("Retrieved {Count} compensation items from QuickBooks", compensationItems.Count);
                return compensationItems;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving compensation items from QuickBooks");
                throw;
            }
        }

        private async Task<CompensationItem?> GetCompensationItemFromQuickBooksAsync(OAuthToken token, string compensationId)
        {
            var items = await GetCompensationItemsFromQuickBooksAsync(token, null);
            return items.FirstOrDefault(c => c.Id == compensationId);
        }

        private async Task<CompensationItem> CreateCompensationItemInQuickBooksAsync(OAuthToken token, CreateCompensationRequest request)
        {
            try
            {
                var oauth2RequestValidator = new OAuth2RequestValidator(token.AccessToken);
                var context = new ServiceContext(token.RealmId, IntuitServicesType.QBO, oauth2RequestValidator);
                context.IppConfiguration.BaseUrl.Qbo = _config.BaseUrl;
                
                var dataService = new DataService(context);

                // Create a service item in QuickBooks to represent the compensation
                var item = new Intuit.Ipp.Data.Item
                {
                    Name = request.Name,
                    Type = Intuit.Ipp.Data.ItemTypeEnum.Service,
                    TypeSpecified = true,
                    Active = true,
                    ActiveSpecified = true,
                    UnitPrice = request.CompensationType.ToLower() == "salary" ? request.AnnualAmount ?? 0 : request.HourlyRate ?? 0,
                    UnitPriceSpecified = true,
                    Description = $"{request.CompensationType} compensation for employee {request.EmployeeId}"
                };

                // Add the item to QuickBooks
                var createdItem = await Task.Run(() => dataService.Add(item));
                
                // Convert to appropriate compensation type
                CompensationItem result = request.CompensationType.ToLower() switch
                {
                    "salary" => new SalaryCompensation
                    {
                        Id = createdItem.Id,
                        EmployeeId = request.EmployeeId,
                        Name = createdItem.Name,
                        Active = createdItem.Active,
                        EffectiveDate = request.EffectiveDate,
                        EndDate = request.EndDate,
                        AnnualAmount = request.AnnualAmount ?? 0,
                        PayFrequency = request.PayFrequency ?? "Monthly"
                    },
                    "hourly" => new HourlyCompensation
                    {
                        Id = createdItem.Id,
                        EmployeeId = request.EmployeeId,
                        Name = createdItem.Name,
                        Active = createdItem.Active,
                        EffectiveDate = request.EffectiveDate,
                        EndDate = request.EndDate,
                        HourlyRate = request.HourlyRate ?? 0,
                        OvertimeRate = request.OvertimeRate
                    },
                    "bonus" => new BonusCompensation
                    {
                        Id = createdItem.Id,
                        EmployeeId = request.EmployeeId,
                        Name = createdItem.Name,
                        Active = createdItem.Active,
                        EffectiveDate = request.EffectiveDate,
                        EndDate = request.EndDate,
                        Amount = request.AnnualAmount ?? 0,
                        BonusType = "Performance"
                    },
                    _ => throw new ArgumentException($"Unsupported compensation type: {request.CompensationType}")
                };

                _logger.LogInformation("Created compensation item {CompensationId} in QuickBooks", result.Id);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating compensation item in QuickBooks");
                throw;
            }
        }

        private async Task<CompensationItem> UpdateCompensationItemInQuickBooksAsync(OAuthToken token, UpdateCompensationRequest request)
        {
            try
            {
                var oauth2RequestValidator = new OAuth2RequestValidator(token.AccessToken);
                var context = new ServiceContext(token.RealmId, IntuitServicesType.QBO, oauth2RequestValidator);
                context.IppConfiguration.BaseUrl.Qbo = _config.BaseUrl;
                
                var dataService = new DataService(context);
                var queryService = new QueryService<Intuit.Ipp.Data.Item>(context);

                // Get existing item
                var existingItems = queryService.ExecuteIdsQuery($"SELECT * FROM Item WHERE Id = '{request.CompensationId}'");
                var existingItem = existingItems.FirstOrDefault();
                if (existingItem == null)
                {
                    throw new InvalidOperationException($"Compensation item with ID {request.CompensationId} not found");
                }

                // Update item properties
                existingItem.Name = request.Name ?? existingItem.Name;
                existingItem.UnitPrice = request.CompensationType?.ToLower() == "salary" ? request.AnnualAmount ?? existingItem.UnitPrice : request.HourlyRate ?? existingItem.UnitPrice;
                existingItem.UnitPriceSpecified = true;
                existingItem.Description = $"{request.CompensationType ?? "Updated"} compensation for employee {request.EmployeeId}";

                // Update the item in QuickBooks
                var updatedItem = await Task.Run(() => dataService.Update(existingItem));
                
                // Convert to appropriate compensation type
                CompensationItem result = request.CompensationType?.ToLower() switch
                {
                    "salary" => new SalaryCompensation
                    {
                        Id = updatedItem.Id,
                        EmployeeId = request.EmployeeId,
                        Name = updatedItem.Name,
                        Active = updatedItem.Active,
                        EffectiveDate = request.EffectiveDate,
                        EndDate = request.EndDate,
                        AnnualAmount = request.AnnualAmount ?? 0,
                        PayFrequency = request.PayFrequency ?? "Monthly"
                    },
                    "hourly" => new HourlyCompensation
                    {
                        Id = updatedItem.Id,
                        EmployeeId = request.EmployeeId,
                        Name = updatedItem.Name,
                        Active = updatedItem.Active,
                        EffectiveDate = request.EffectiveDate,
                        EndDate = request.EndDate,
                        HourlyRate = request.HourlyRate ?? 0,
                        OvertimeRate = request.OvertimeRate
                    },
                    _ => new GenericCompensationItem
                    {
                        Id = updatedItem.Id,
                        EmployeeId = request.EmployeeId,
                        Name = updatedItem.Name,
                        Type = request.CompensationType ?? "General",
                        Amount = updatedItem.UnitPrice,
                        Active = updatedItem.Active,
                        LastUpdated = DateTime.UtcNow
                    }
                };

                _logger.LogInformation("Updated compensation item {CompensationId} in QuickBooks", result.Id);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating compensation item in QuickBooks");
                throw;
            }
        }

        private async Task DeleteCompensationItemFromQuickBooksAsync(OAuthToken token, string compensationId)
        {
            try
            {
                var oauth2RequestValidator = new OAuth2RequestValidator(token.AccessToken);
                var context = new ServiceContext(token.RealmId, IntuitServicesType.QBO, oauth2RequestValidator);
                context.IppConfiguration.BaseUrl.Qbo = _config.BaseUrl;
                
                var dataService = new DataService(context);
                var queryService = new QueryService<Intuit.Ipp.Data.Item>(context);

                // Get existing item
                var existingItems = queryService.ExecuteIdsQuery($"SELECT * FROM Item WHERE Id = '{compensationId}'");
                var existingItem = existingItems.FirstOrDefault();
                if (existingItem == null)
                {
                    throw new InvalidOperationException($"Compensation item with ID {compensationId} not found");
                }

                // QuickBooks doesn't allow hard deletion of items that have been used, so we deactivate them
                existingItem.Active = false;
                existingItem.ActiveSpecified = true;
                
                // Update the item to deactivate
                await Task.Run(() => dataService.Update(existingItem));
                
                _logger.LogInformation("Deactivated compensation item {CompensationId} in QuickBooks", compensationId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting/deactivating compensation item in QuickBooks");
                throw;
            }
        }

        private async Task<CompensationHistory> GetCompensationHistoryFromQuickBooksAsync(OAuthToken token, string employeeId)
        {
            try
            {
                var oauth2RequestValidator = new OAuth2RequestValidator(token.AccessToken);
                var context = new ServiceContext(token.RealmId, IntuitServicesType.QBO, oauth2RequestValidator);
                context.IppConfiguration.BaseUrl.Qbo = _config.BaseUrl;
                
                var dataService = new DataService(context);
                var changes = new List<CompensationChangeRecord>();

                // Get employee information
                var queryService = new QueryService<IppEmployee>(context);
                var employees = queryService.ExecuteIdsQuery($"SELECT * FROM Employee WHERE Id = '{employeeId}'");
                var employee = employees.FirstOrDefault();
                
                if (employee != null)
                {
                    // Create initial hire record
                    changes.Add(new CompensationChangeRecord
                    {
                        Id = Guid.NewGuid().ToString(),
                        CompensationItemId = "initial",
                        ChangeType = "Created",
                        ChangeDate = employee.HiredDate,
                        NewValue = $"Employee hired: {employee.DisplayName}",
                        Reason = "Initial hire",
                        ChangedBy = "HR System"
                    });

                    // Get compensation items for this employee
                    var compensationItems = await GetCompensationItemsFromQuickBooksAsync(token, new CompensationQueryRequest { EmployeeId = employeeId });
                    
                    foreach (var item in compensationItems)
                    {
                        changes.Add(new CompensationChangeRecord
                        {
                            Id = Guid.NewGuid().ToString(),
                            CompensationItemId = item.Id,
                            ChangeType = "Added",
                            ChangeDate = item.CreatedDate,
                            NewValue = $"{item.Name}: {item.Type} - ${item.Amount:N2}",
                            Reason = "Compensation setup",
                            ChangedBy = "System"
                        });
                    }
                }

                var history = new CompensationHistory
                {
                    EmployeeId = employeeId,
                    Changes = changes.OrderBy(c => c.ChangeDate).ToList()
                };

                _logger.LogInformation("Retrieved compensation history for employee {EmployeeId} with {Count} changes", employeeId, changes.Count);
                return history;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving compensation history from QuickBooks");
                throw;
            }
        }

        private CompensationSummary CalculateCompensationSummary(string employeeId, List<CompensationItem> compensationItems)
        {
            var summary = new CompensationSummary
            {
                EmployeeId = employeeId,
                LastUpdated = DateTime.UtcNow,
                ActiveCompensationItems = compensationItems.Count(c => c.Active)
            };

            foreach (var item in compensationItems.Where(c => c.Active))
            {
                switch (item)
                {
                    case SalaryCompensation salary:
                        summary.TotalAnnualSalary += salary.AnnualAmount;
                        break;
                    case HourlyCompensation hourly:
                        summary.TotalHourlyRate += hourly.HourlyRate;
                        break;
                    case CommissionCompensation commission:
                        // Estimate potential based on rate
                        summary.TotalCommissionPotential += commission.Rate * 100; // Rough estimate
                        break;
                    case BonusCompensation bonus:
                        summary.TotalBonuses += bonus.Amount;
                        break;
                    case BenefitItem benefit:
                        summary.TotalBenefitValue += (benefit.EmployerContribution ?? 0) + (benefit.EmployeeContribution ?? 0);
                        break;
                }
            }

            return summary;
        }

        private decimal GetCompensationValue(CompensationItem compensation)
        {
            return compensation switch
            {
                SalaryCompensation salary => salary.AnnualAmount,
                HourlyCompensation hourly => hourly.HourlyRate * 2080, // Estimate annual (40 hours * 52 weeks)
                CommissionCompensation commission => commission.Rate * 1000, // Rough estimate
                BonusCompensation bonus => bonus.Amount,
                BenefitItem benefit => (benefit.EmployerContribution ?? 0) + (benefit.EmployeeContribution ?? 0),
                _ => 0
            };
        }

        private string DetermineCompensationType(string itemName)
        {
            var name = itemName?.ToLower() ?? string.Empty;
            
            if (name.Contains("salary") || name.Contains("annual"))
                return "Salary";
            if (name.Contains("hourly") || name.Contains("wage"))
                return "Hourly";
            if (name.Contains("bonus") || name.Contains("incentive"))
                return "Bonus";
            if (name.Contains("commission"))
                return "Commission";
            if (name.Contains("benefit") || name.Contains("insurance") || name.Contains("health"))
                return "Benefit";
            if (name.Contains("overtime") || name.Contains("ot"))
                return "Overtime";
            
            return "General";
        }

        private async Task<List<CompensationItem>> GetStandardCompensationItemsAsync(ServiceContext context)
        {
            try
            {
                var standardItems = new List<CompensationItem>();
                
                // Get standard payroll items that might be configured in QuickBooks
                var queryService = new QueryService<Intuit.Ipp.Data.Item>(context);
                var items = queryService.ExecuteIdsQuery("SELECT * FROM Item WHERE Type = 'Service' AND Active = true").ToList();
                
                foreach (var item in items.Take(10)) // Limit to avoid too many items
                {
                    var compensationType = DetermineCompensationType(item.Name);
                    
                    standardItems.Add(new GenericCompensationItem
                    {
                        Id = item.Id,
                        Name = item.Name,
                        Type = compensationType,
                        Amount = item.UnitPrice,
                        Active = item.Active,
                        CreatedDate = item.MetaData?.CreateTime ?? DateTime.Now,
                        LastUpdated = item.MetaData?.LastUpdatedTime ?? DateTime.Now
                    });
                }
                
                return standardItems;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not retrieve standard compensation items, returning empty list");
                return new List<CompensationItem>();
            }
        }

        #endregion

        public async Task<object> CreateTimeActivityAsync(OAuthToken token, TimeActivityRequest request)
        {
            try
            {
                _logger.LogInformation("Creating TimeActivity for Employee: {EmployeeId}, Project: {ProjectId}", 
                    request.EmployeeId, request.ProjectId);

                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {token.AccessToken}");
                httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
                
                if (!string.IsNullOrEmpty(token.RealmId))
                {
                    httpClient.DefaultRequestHeaders.Add("realmId", token.RealmId);
                }

                // Build GraphQL mutation for TimeActivity creation
                var mutation = @"
                    mutation CreateTimeActivity($input: TimeActivityInput!) {
                        createTimeActivity(timeActivity: $input) {
                            id
                            date
                            hours
                            description
                            billable
                            employee {
                                id
                                name
                            }
                            project {
                                id
                                name
                            }
                            customer {
                                id
                                name
                            }
                        }
                    }";

                var variables = new
                {
                    input = new
                    {
                        employeeId = request.EmployeeId,
                        projectId = request.ProjectId,
                        customerId = request.CustomerId,
                        itemId = request.ItemId,
                        date = request.Date.ToString("yyyy-MM-dd"),
                        hours = request.Hours,
                        hourlyRate = request.HourlyRate,
                        description = request.Description,
                        billable = request.Billable
                    }
                };

                var graphqlRequest = new
                {
                    query = mutation,
                    variables = variables
                };

                var jsonContent = System.Text.Json.JsonSerializer.Serialize(graphqlRequest);
                var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

                _logger.LogInformation("TimeActivity GraphQL Mutation: {Mutation}", mutation);
                _logger.LogInformation("TimeActivity Variables: {Variables}", System.Text.Json.JsonSerializer.Serialize(variables));

                var response = await httpClient.PostAsync(_config.GraphQLEndpoint, content);
                var responseContent = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("TimeActivity GraphQL Response: {Response}", responseContent);

                if (response.IsSuccessStatusCode)
                {
                    using var document = System.Text.Json.JsonDocument.Parse(responseContent);
                    var root = document.RootElement;

                    if (root.TryGetProperty("data", out var dataElement) &&
                        dataElement.TryGetProperty("createTimeActivity", out var timeActivityElement))
                    {
                        var timeActivity = new
                        {
                            id = timeActivityElement.TryGetProperty("id", out var idProp) ? idProp.GetString() : "",
                            date = timeActivityElement.TryGetProperty("date", out var dateProp) ? dateProp.GetString() : "",
                            hours = timeActivityElement.TryGetProperty("hours", out var hoursProp) ? hoursProp.GetDecimal() : 0,
                            description = timeActivityElement.TryGetProperty("description", out var descProp) ? descProp.GetString() : "",
                            billable = timeActivityElement.TryGetProperty("billable", out var billableProp) ? billableProp.GetBoolean() : false,
                            employee = timeActivityElement.TryGetProperty("employee", out var empElement) && 
                                      empElement.TryGetProperty("name", out var empNameProp) ? 
                                      new { id = request.EmployeeId, name = empNameProp.GetString() } : null,
                            project = timeActivityElement.TryGetProperty("project", out var projElement) && 
                                     projElement.TryGetProperty("name", out var projNameProp) ? 
                                     new { id = request.ProjectId, name = projNameProp.GetString() } : null
                        };

                        _logger.LogInformation("Successfully created TimeActivity with ID: {TimeActivityId}", timeActivity.id);
                        return timeActivity;
                    }
                    else if (root.TryGetProperty("errors", out var errorsElement))
                    {
                        var errorMessages = new List<string>();
                        foreach (var error in errorsElement.EnumerateArray())
                        {
                            if (error.TryGetProperty("message", out var messageProp))
                            {
                                errorMessages.Add(messageProp.GetString() ?? "Unknown error");
                            }
                        }
                        throw new Exception($"GraphQL errors: {string.Join(", ", errorMessages)}");
                    }
                    else
                    {
                        throw new Exception("Unexpected GraphQL response format");
                    }
                }
                else
                {
                    throw new Exception($"HTTP error {response.StatusCode}: {responseContent}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating TimeActivity");
                throw;
            }
        }
    }
}
