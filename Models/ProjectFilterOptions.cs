using System;
using System.Collections.Generic;
using System.Linq;

namespace QuickBooks.EmployeeCompensation.API.Models
{
    public class ProjectFilterOptions
    {
        // First range for start date
        public DateTime? StartDateFrom1 { get; set; }
        public DateTime? StartDateTo1 { get; set; }

        // Legacy properties for backward compatibility
        public DateTime? StartDateFrom 
        { 
            get => StartDateFrom1; 
            set => StartDateFrom1 = value; 
        }
        public DateTime? StartDateTo 
        { 
            get => StartDateTo1; 
            set => StartDateTo1 = value; 
        }

        // Second range for start date (for OR conditions)
        public DateTime? StartDateFrom2 { get; set; }
        public DateTime? StartDateTo2 { get; set; }

        // First range for due date
        public DateTime? DueDateFrom1 { get; set; }
        public DateTime? DueDateTo1 { get; set; }

        // Second range for due date (for OR conditions)
        public DateTime? DueDateFrom2 { get; set; }
        public DateTime? DueDateTo2 { get; set; }

        // Completed date range
        public DateTime? CompletedDateFrom { get; set; }
        public DateTime? CompletedDateTo { get; set; }

        // Status filters
        public List<string>? Statuses { get; set; }

        // Pagination
        public int First { get; set; } = 50;
        public string? After { get; set; }

        public bool HasStartDateRange1()
        {
            return StartDateFrom1.HasValue || StartDateTo1.HasValue;
        }

        public bool HasStartDateRange2()
        {
            return StartDateFrom2.HasValue || StartDateTo2.HasValue;
        }

        public bool HasDueDateRange1()
        {
            return DueDateFrom1.HasValue || DueDateTo1.HasValue;
        }

        public bool HasDueDateRange2()
        {
            return DueDateFrom2.HasValue || DueDateTo2.HasValue;
        }

        public bool HasAnyFilter()
        {
            return HasStartDateRange1() || HasStartDateRange2() ||
                   HasDueDateRange1() || HasDueDateRange2() ||
                   CompletedDateFrom.HasValue || CompletedDateTo.HasValue ||
                   (Statuses?.Any() ?? false);
        }
    }
}