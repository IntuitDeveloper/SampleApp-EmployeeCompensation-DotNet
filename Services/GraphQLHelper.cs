using System.Text.Json;
using QuickBooks.EmployeeCompensation.API.Models;

namespace QuickBooks.EmployeeCompensation.API.Services
{
    public static class GraphQLHelper
    {
        private static class Fields
        {
            public const string ID = "id";
            public const string NAME = "name";
            public const string DESCRIPTION = "description";
            public const string STATUS = "status";
            public const string DUE_DATE = "dueDate";
            public const string START_DATE = "startDate";
            public const string COMPLETED_DATE = "completedDate";
            public const string CUSTOMER = "customer";
            public const string CUSTOMER_ID = "customerId";
        }

        private static class QueryParams
        {
            public const string FIRST = "first";
            public const string AFTER = "after";
            public const string FILTER = "filter";
            public const string ORDER_BY = "orderBy";
        }

        private static class FilterOperators
        {
            public const string BETWEEN = "between";
            public const string GREATER_THAN_OR_EQUAL = "greaterThanOrEqualTo";
            public const string LESS_THAN_OR_EQUAL = "lessThanOrEqualTo";
        }

        public static (string Query, object? Variables) BuildProjectsQuery(ProjectFilterOptions? filterOptions, string? cursor)
        {
            var first = filterOptions?.First ?? 50;
            
            // Always include all parameters - $after is optional (null by default)
            var query = @"
                query projectManagementProjects(
                  $first: PositiveInt!,
                  $after: String,
                  $filter: ProjectManagement_ProjectFilter!,
                  $orderBy: [ProjectManagement_OrderBy!]
                ) {
                  projectManagementProjects(
                    first: $first,
                    after: $after,
                    filter: $filter,
                    orderBy: $orderBy
                  ) {
                    edges {
                      node {
                        id,
                        name,
                        description,
                        type,
                        status,
                        dueDate,
                        startDate,
                        completedDate,
                        assignee {
                            id
                        },
                        priority,
                        customer {
                            id
                        },
                        account {
                            id
                        },
                        addresses {
                            streetAddressLine1,
                            streetAddressLine2,
                            streetAddressLine3,
                            state,
                            postalCode
                        }   
                      }
                    },
                    pageInfo {
                      hasNextPage,
                      hasPreviousPage,
                      startCursor,
                      endCursor
                    }
                  }
                }";

            var variables = BuildQueryVariables(filterOptions, cursor, first);
            return (query, variables);
        }

        private static object BuildQueryVariables(ProjectFilterOptions? filterOptions, string? cursor, int first)
        {
            var variables = new Dictionary<string, object> 
            { 
                [QueryParams.FIRST] = first,
                [QueryParams.AFTER] = cursor, // Always include after (null for first call)
                [QueryParams.ORDER_BY] = new[] { "DUE_DATE_DESC" }
            };
            
            // Always add filter - required parameter, use empty filter if no specific filters
            var filter = new Dictionary<string, object>();
            if (filterOptions?.HasAnyFilter() == true)
            {
                filter = BuildFilterObject(filterOptions);
            }
            // Always include filter parameter even if empty
            variables[QueryParams.FILTER] = filter;

            return variables;
        }

        private static Dictionary<string, object> BuildFilterObject(ProjectFilterOptions filterOptions)
        {
            var filter = new Dictionary<string, object>();
            
            // Handle start date range (use first range only since OR is not supported)
            if (filterOptions.HasStartDateRange1())
            {
                var startDateFilter = BuildDateFilter(
                    filterOptions.StartDateFrom1,
                    filterOptions.StartDateTo1,
                    true // Use full datetime format
                );
                
                if (startDateFilter.Any())
                {
                    filter[Fields.START_DATE] = startDateFilter;
                }
            }
            
            // Handle due date range (use first range only since OR is not supported)
            if (filterOptions.HasDueDateRange1())
            {
                var dueDateFilter = BuildDateFilter(
                    filterOptions.DueDateFrom1,
                    filterOptions.DueDateTo1,
                    false // Use date-only format
                );
                
                if (dueDateFilter.Any())
                {
                    filter[Fields.DUE_DATE] = dueDateFilter;
                }
            }
            
            // Handle completed date range (single range)
            if (filterOptions.CompletedDateFrom.HasValue || filterOptions.CompletedDateTo.HasValue)
            {
                var completedDateFilter = BuildDateFilter(
                    filterOptions.CompletedDateFrom,
                    filterOptions.CompletedDateTo,
                    true // Use full datetime format
                );
                filter[Fields.COMPLETED_DATE] = completedDateFilter;
            }

            return filter;
        }

        private static Dictionary<string, object> BuildDateFilter(DateTime? fromDate, DateTime? toDate, bool useFullDateTime)
        {
            var dateFilter = new Dictionary<string, object>();
            
            // Always use RFC3339 format for QuickBooks GraphQL API
            var dateFormat = "yyyy-MM-ddTHH:mm:ss.fffZ";

            if (fromDate.HasValue && toDate.HasValue)
            {
                // For date ranges, set time to start/end of day
                var minDate = fromDate.Value.Date; // Start of day
                var maxDate = toDate.Value.Date.AddDays(1).AddTicks(-1); // End of day
                
                dateFilter[FilterOperators.BETWEEN] = new
                {
                    minDate = minDate.ToString(dateFormat),
                    maxDate = maxDate.ToString(dateFormat)
                };
            }
            else if (fromDate.HasValue)
            {
                var minDate = fromDate.Value.Date; // Start of day
                dateFilter[FilterOperators.GREATER_THAN_OR_EQUAL] = minDate.ToString(dateFormat);
            }
            else if (toDate.HasValue)
            {
                var maxDate = toDate.Value.Date.AddDays(1).AddTicks(-1); // End of day
                dateFilter[FilterOperators.LESS_THAN_OR_EQUAL] = maxDate.ToString(dateFormat);
            }

            return dateFilter;
        }

        public static List<Dictionary<string, object?>> ExtractProjectsFromResponse(JsonElement root)
        {
            var projects = new List<Dictionary<string, object?>>();
            
            if (root.TryGetProperty("data", out var dataElement) &&
                dataElement.ValueKind != JsonValueKind.Null &&
                dataElement.TryGetProperty("projectManagementProjects", out var projectsElement) &&
                projectsElement.ValueKind != JsonValueKind.Null &&
                projectsElement.TryGetProperty("edges", out var edgesElement))
            {
                foreach (var edge in edgesElement.EnumerateArray())
                {
                    if (edge.TryGetProperty("node", out var nodeElement))
                    {
                        var project = ExtractProjectFields(nodeElement);
                        projects.Add(project);
                    }
                }
            }

            return projects;
        }

        private static Dictionary<string, object?> ExtractProjectFields(JsonElement nodeElement)
        {
            var project = new Dictionary<string, object?>();

            // Extract customerId from customer object
            if (nodeElement.TryGetProperty(Fields.CUSTOMER, out var customerObj) &&
                customerObj.TryGetProperty(Fields.ID, out var customerIdProp))
            {
                project[Fields.CUSTOMER_ID] = customerIdProp.GetString();
            }

            // Add other properties
            ExtractField(nodeElement, Fields.ID, project);
            ExtractField(nodeElement, Fields.NAME, project);
            ExtractField(nodeElement, Fields.STATUS, project, "Unknown");
            ExtractField(nodeElement, Fields.DESCRIPTION, project);
            ExtractField(nodeElement, Fields.DUE_DATE, project);
            ExtractField(nodeElement, Fields.START_DATE, project);
            ExtractField(nodeElement, Fields.COMPLETED_DATE, project);

            // Handle active status
            project["active"] = !nodeElement.TryGetProperty("deleted", out var deletedProp) || !deletedProp.GetBoolean();

            return project;
        }

        private static void ExtractField(JsonElement element, string fieldName, Dictionary<string, object?> target, string defaultValue = "")
        {
            if (element.TryGetProperty(fieldName, out var prop))
            {
                target[fieldName] = prop.GetString() ?? defaultValue;
            }
        }
    }
}
