using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace QuickBooks.EmployeeCompensation.API.Models
{
    public class ProjectResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("active")]
        public bool Active { get; set; }

        [JsonPropertyName("customerId")]
        [JsonConverter(typeof(CustomerIdConverter))]
        public string? CustomerId { get; set; }

        private class CustomerIdConverter : JsonConverter<string?>
        {
            public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            {
                if (reader.TokenType == JsonTokenType.StartObject)
                {
                    var depth = 1;
                    while (reader.Read() && depth > 0)
                    {
                        if (reader.TokenType == JsonTokenType.PropertyName && reader.GetString() == "id")
                        {
                            reader.Read();
                            return reader.GetString();
                        }
                        else if (reader.TokenType == JsonTokenType.StartObject)
                        {
                            depth++;
                        }
                        else if (reader.TokenType == JsonTokenType.EndObject)
                        {
                            depth--;
                        }
                    }
                }
                return null;
            }

            public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options)
            {
                if (value == null)
                {
                    writer.WriteNullValue();
                }
                else
                {
                    writer.WriteStringValue(value);
                }
            }
        }

        [JsonPropertyName("dueDate")]
        public string? DueDate { get; set; }

        [JsonPropertyName("startDate")]
        public string? StartDate { get; set; }

        [JsonPropertyName("completedDate")]
        public string? CompletedDate { get; set; }


    }
}
