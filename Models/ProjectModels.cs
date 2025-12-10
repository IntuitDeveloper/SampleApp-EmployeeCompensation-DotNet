using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace QuickBooks.EmployeeCompensation.API.Models
{
    public class ProjectFilterRequest
    {
        [JsonPropertyName("startDate")]
        public string? StartDate { get; set; }

        [JsonPropertyName("endDate")]
        public string? EndDate { get; set; }

        [JsonPropertyName("statusFilter")]
        public List<string>? StatusFilter { get; set; }
    }
}

