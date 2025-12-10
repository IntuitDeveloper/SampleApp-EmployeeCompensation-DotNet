using QuickBooks.EmployeeCompensation.API.Models;
using ApiEmployee = QuickBooks.EmployeeCompensation.API.Models.Employee;

namespace QuickBooks.EmployeeCompensation.API.Services
{
    public interface IEmployeeCompensationService
    {
        // Employee operations
        Task<List<Employee>> GetEmployeesAsync(OAuthToken token, EmployeeQueryRequest? query = null);
        Task<ApiResponse<ApiEmployee>> GetEmployeeByIdAsync(string employeeId);
        Task<ApiResponse<ApiEmployee>> CreateEmployeeAsync(ApiEmployee employee);
        Task<ApiResponse<ApiEmployee>> UpdateEmployeeAsync(ApiEmployee employee);
        Task<ApiResponse<bool>> DeleteEmployeeAsync(string employeeId);

        // Compensation operations
        Task<List<CompensationItem>> GetCompensationItemsAsync(CompensationQueryRequest? query = null);
        Task<ApiResponse<CompensationItem>> GetCompensationItemByIdAsync(string compensationId);
        Task<ApiResponse<CompensationItem>> CreateCompensationItemAsync(CreateCompensationRequest request);
        Task<ApiResponse<CompensationItem>> UpdateCompensationItemAsync(UpdateCompensationRequest request);
        Task<ApiResponse<bool>> DeleteCompensationItemAsync(string compensationId);

        // Employee compensation operations
        Task<ApiResponse<List<CompensationItem>>> GetEmployeeCompensationAsync(string employeeId);
        Task<ApiResponse<CompensationSummary>> GetEmployeeCompensationSummaryAsync(string employeeId);
        Task<ApiResponse<CompensationHistory>> GetEmployeeCompensationHistoryAsync(string employeeId);

        // Reporting and analytics
        Task<ApiResponse<List<CompensationSummary>>> GetCompensationReportAsync(DateTime? fromDate = null, DateTime? toDate = null);
        Task<ApiResponse<decimal>> GetTotalCompensationCostAsync(DateTime? fromDate = null, DateTime? toDate = null);
        Task<ApiResponse<Dictionary<string, decimal>>> GetCompensationBreakdownAsync(string? employeeId = null);
        
        // TimeActivity operations
        Task<object> CreateTimeActivityAsync(OAuthToken token, TimeActivityRequest request);
    }
}
