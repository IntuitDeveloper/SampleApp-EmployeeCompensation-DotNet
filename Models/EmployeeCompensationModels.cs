using Newtonsoft.Json;

namespace QuickBooks.EmployeeCompensation.API.Models
{
    // Employee model for compensation tracking
    public class Employee
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string SSN { get; set; } = string.Empty;
        public string EmployeeNumber { get; set; } = string.Empty;
        public bool Active { get; set; } = true;
        public DateTime HireDate { get; set; }
        public DateTime? TerminationDate { get; set; }
        public List<CompensationItem> CompensationItems { get; set; } = new List<CompensationItem>();
    }

    // Base compensation item
    public abstract class CompensationItem
    {
        public string Id { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public bool Active { get; set; } = true;
        public DateTime EffectiveDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal Amount { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime LastUpdated { get; set; }
    }

    // Generic compensation item for service layer
    public class GenericCompensationItem : CompensationItem
    {
        public GenericCompensationItem()
        {
            Type = "Generic";
        }
    }

    // Salary compensation
    public class SalaryCompensation : CompensationItem
    {
        public decimal AnnualAmount { get; set; }
        public string PayFrequency { get; set; } = "Monthly"; // Weekly, BiWeekly, SemiMonthly, Monthly, Annually
        
        public SalaryCompensation()
        {
            Type = "Salary";
        }
    }

    // Hourly compensation
    public class HourlyCompensation : CompensationItem
    {
        public decimal HourlyRate { get; set; }
        public decimal? OvertimeRate { get; set; }
        public decimal? DoubleTimeRate { get; set; }
        
        public HourlyCompensation()
        {
            Type = "Hourly";
        }
    }

    // Commission compensation
    public class CommissionCompensation : CompensationItem
    {
        public decimal Rate { get; set; } // Percentage rate
        public string Basis { get; set; } = "Gross Sales"; // Gross Sales, Net Sales, etc.
        public decimal? MinimumAmount { get; set; }
        public decimal? MaximumAmount { get; set; }
        
        public CommissionCompensation()
        {
            Type = "Commission";
        }
    }

    // Bonus compensation
    public class BonusCompensation : CompensationItem
    {
        public new decimal Amount { get; set; }
        public string BonusType { get; set; } = "Performance"; // Performance, Signing, Annual, etc.
        public string? Description { get; set; }
        
        public BonusCompensation()
        {
            Type = "Bonus";
        }
    }

    // Benefit item (non-monetary compensation)
    public class BenefitItem : CompensationItem
    {
        public decimal? EmployeeContribution { get; set; }
        public decimal? EmployerContribution { get; set; }
        public string? BenefitType { get; set; } // Health, Dental, Vision, 401k, etc.
        public string? Provider { get; set; }
        
        public BenefitItem()
        {
            Type = "Benefit";
        }
    }

    // Request/Response models for API operations
    public class CreateCompensationRequest
    {
        public string EmployeeId { get; set; } = string.Empty;
        public string CompensationType { get; set; } = string.Empty; // Salary, Hourly, Commission, Bonus, Benefit
        public string Name { get; set; } = string.Empty;
        public DateTime EffectiveDate { get; set; }
        public DateTime? EndDate { get; set; }
        
        // Salary fields
        public decimal? AnnualAmount { get; set; }
        public string? PayFrequency { get; set; }
        
        // Hourly fields
        public decimal? HourlyRate { get; set; }
        public decimal? OvertimeRate { get; set; }
        
        // Commission fields
        public decimal? CommissionRate { get; set; }
        public string? CommissionBasis { get; set; }
        
        // Bonus fields
        public decimal? BonusAmount { get; set; }
        public string? BonusType { get; set; }
        
        // Benefit fields
        public decimal? EmployeeContribution { get; set; }
        public decimal? EmployerContribution { get; set; }
        public string? BenefitType { get; set; }
        public string? Provider { get; set; }
    }

    public class UpdateCompensationRequest : CreateCompensationRequest
    {
        public string CompensationId { get; set; } = string.Empty;
    }

    public class CompensationSummary
    {
        public string EmployeeId { get; set; } = string.Empty;
        public string EmployeeName { get; set; } = string.Empty;
        public decimal TotalAnnualSalary { get; set; }
        public decimal TotalHourlyRate { get; set; }
        public decimal TotalCommissionPotential { get; set; }
        public decimal TotalBonuses { get; set; }
        public decimal TotalBenefitValue { get; set; }
        public int ActiveCompensationItems { get; set; }
        public DateTime LastUpdated { get; set; }
    }

    public class CompensationHistory
    {
        public string EmployeeId { get; set; } = string.Empty;
        public List<CompensationChangeRecord> Changes { get; set; } = new List<CompensationChangeRecord>();
    }

    public class CompensationChangeRecord
    {
        public string Id { get; set; } = string.Empty;
        public string CompensationItemId { get; set; } = string.Empty;
        public string ChangeType { get; set; } = string.Empty; // Created, Updated, Terminated
        public DateTime ChangeDate { get; set; }
        public string? PreviousValue { get; set; }
        public string? NewValue { get; set; }
        public string? Reason { get; set; }
        public string? ChangedBy { get; set; }
    }

    // GraphQL query models
    public class EmployeeQueryRequest
    {
        public string? EmployeeId { get; set; }
        public string? Email { get; set; }
        public string? EmployeeNumber { get; set; }
        public bool? Active { get; set; }
        public DateTime? HiredAfter { get; set; }
        public DateTime? HiredBefore { get; set; }
    }

    public class CompensationData
    {
        public string? EmployeeId { get; set; }
        public string? EmployeeName { get; set; }
        public decimal? HourlyRate { get; set; }
        public decimal? AnnualSalary { get; set; }
        public string? PayType { get; set; }
        public DateTime? LastUpdated { get; set; }
    }

    public class TimeActivityRequest
    {
        public string? EmployeeId { get; set; }
        public string? ProjectId { get; set; }
        public string? CustomerId { get; set; }
        public string? ItemId { get; set; }
        public DateTime Date { get; set; }
        public decimal Hours { get; set; }
        public decimal? HourlyRate { get; set; }
        public string? Description { get; set; }
        public bool Billable { get; set; } = true;
        
        // Internal properties for GraphQL mapping
        public DateTime TxnDate { get; set; }
        public string NameOf { get; set; } = "Employee";
        public ReferenceRequest EmployeeRef { get; set; } = new();
        public ReferenceRequest? PayrollItemRef { get; set; }
        public ReferenceRequest? CustomerRef { get; set; }
        public ReferenceRequest? ProjectRef { get; set; }
        public ReferenceRequest? ItemRef { get; set; }
        public int Minutes { get; set; }
    }

    public class ReferenceRequest
    {
        public string Value { get; set; } = string.Empty;
        public string? Name { get; set; }
    }

    public class CompensationQueryRequest
    {
        public string? EmployeeId { get; set; }
        public string? Type { get; set; }
        public bool? Active { get; set; }
        public DateTime? EffectiveAfter { get; set; }
        public DateTime? EffectiveBefore { get; set; }
        public decimal? MinAmount { get; set; }
        public decimal? MaxAmount { get; set; }
    }

    // GraphQL-style models for employee compensation
    public class EmployeeCompensationFilter
    {
        public string? EmployeeId { get; set; }
        public bool? Active { get; set; }
        public string? CompensationType { get; set; }
        public DateTime? EffectiveAfter { get; set; }
        public DateTime? EffectiveBefore { get; set; }
    }

    public class EmployeeCompensationQueryRequest
    {
        public EmployeeCompensationFilter? Filter { get; set; }
        public int First { get; set; } = 10;
        public string? After { get; set; }
    }

    public class EmployeeCompensationNode
    {
        public string Id { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public bool Active { get; set; }
        public string CompensationType { get; set; } = string.Empty;
        public decimal Rate { get; set; }
        public string Currency { get; set; } = "USD";
        public DateTime? EffectiveDate { get; set; }
        public DateTime? EndDate { get; set; }
        public PayrollItemInfo? PayrollItem { get; set; }
    }

    public class PayrollItemInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
    }

    public class PageInfo
    {
        public bool HasNextPage { get; set; }
        public bool HasPreviousPage { get; set; }
        public string? StartCursor { get; set; }
        public string? EndCursor { get; set; }
    }

    public class EmployeeCompensationResponse
    {
        public List<EmployeeCompensationNode> Nodes { get; set; } = new();
        public PageInfo PageInfo { get; set; } = new();
        public int TotalCount { get; set; }
    }


}
