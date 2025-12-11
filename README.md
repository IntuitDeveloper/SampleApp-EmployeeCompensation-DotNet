# QuickBooks Employee Compensation API

A .NET Core 9 Web API for creating time activity with pay type and linking it to a project with complete OAuth 2.0 integration for QuickBooks Online. 

Official Documentation: https://developer.intuit.com/app/developer/qbo/docs/workflows/track-time/get-started 

## Features

- **Complete OAuth 2.0 Flow**: Secure authentication with QuickBooks Online
- **Employee, Compensation, Items, Time Activity Management**: Read employee, compensation and item records using REST API.
- **GraphQL Integration**: Ready for QuickBooks GraphQL API (Projects)
- **Swagger Documentation**: Interactive API documentation

## Prerequisites

### Tools, Technologies & Applications
  - .NET 9.0 SDK
  - QuickBooks Developer Account
  - QuickBooks App with appropriate scopes.
  - ngrok (For production redirect URL)

### Quickbooks
  - Setup Payroll
  - Enable Projects: Settings (Gear icon) -> Account & Settings -> Advanced -> Edit Projects 

## Dependencies

- **GraphQL.Client** - GraphQL client for .NET
- **IppDotNetSdkForQuickBooksApiV3** - Official Intuit .NET SDK for OAuth
- **Newtonsoft.Json** - JSON serialization
- **Microsoft.AspNetCore** - Web API framework

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd SampleApp-EmployeeCompensation-Dotnet
dotnet restore
```

### 2. Configure QuickBooks App

1. Create a QuickBooks app at [developer.intuit.com](https://developer.intuit.com)
2. Update `appsettings.json` with your app credentials:

```json
{
  "QuickBooks": {
    "ClientId": "YOUR_QUICKBOOKS_APP_CLIENT_ID",
    "ClientSecret": "YOUR_QUICKBOOKS_APP_CLIENT_SECRET",
    "RedirectUri": "http://localhost:5037/api/oauth/callback",
    "Environment": "production"
  }
}
```
Note: Employee Compensation is only enabled in Production, so make sure to use production environment.

### 3. Run the Application

```bash
dotnet run
```

The application will be available at:
- **Setup UI**: `http://localhost:5037` (Multi-step setup wizard)
- **API Documentation**: `http://localhost:5037/swagger`
- **API Base**: `http://localhost:5037/api/`
- **ngrok**: `https://any.ngrok-free.app`

## Configuration

### Required Scopes
The application requires these QuickBooks scopes:
- `com.intuit.quickbooks.accounting`
- `openid`
- `com.intuit.quickbooks.payroll`
- `project-management.project`
- `payroll.compensation.read`

### Environment Settings
- **Sandbox**: For development and testing
- **Production**: For live QuickBooks data

## 🎯 Multi-Step Setup Wizard

The application includes a comprehensive web-based setup wizard that guides you through the complete configuration process:

### Setup Steps

1. **OAuth Authentication** 
   - Secure QuickBooks Online authentication
   - Popup-based OAuth flow. Close the popup after completing the authentication process. Refresh the setup wizard to continue.
   - Token status verification

2. **System Pre-Checks**
   - Verify Projects are enabled (`ProjectsEnabled = true`)
   - Check Time Tracking features (`TimeTrackingFeatureEnabled = true`)
   - Validate Payroll capabilities

3. **Employee Data Fetching**
   - Query Employee resource from Accounting API
   - Extract employee.id for EmployeeRef
   - Display employee information and status

4. **Compensation Data**
   - Use `payrollEmployeeCompensations (Query)` 
   - Fetch compensation IDs for PayrollItemRef
   - Map compensation to employees

5. **Project Management**
   - Use `projectManagementProject (Query)` in GraphQL API
   - Fetch project.id for ProjectRef in TimeActivity objects
   - Display available projects

6. **Customer Information**
   - Query Customer resource from Accounting API on the basis of the Project selected
   - Fetch customer.id for CustomerRef values

7. **Item Data**
   - Query Item resource from Accounting API
   - Fetch item.id for TimeActivity objects
   - Display available items and services

8. **Time Activity**
   - Create one or more Time Activity using data fetched from previous steps
   - Display existing and newly created time activities

### Setup Wizard Features

- **Progress Tracking**: Visual progress bar and step indicators
- **Real-time Validation**: Immediate feedback on each step
- **Error Handling**: Clear error messages and recovery options
- **Data Summary**: Complete overview of fetched data
- **Time Activity**: Create time activity

### Accessing the Setup Wizard

Simply navigate to `http://localhost:5037` in your browser after starting the application. The wizard will guide you through each step automatically.

## OAuth 2.0 Flow

1. **Initiate**: Call `/api/oauth/authorize` to get authorization URL
2. **Redirect**: User visits the URL and authorizes your app
3. **Callback**: QuickBooks redirects to `/api/oauth/callback`
4. **Token Storage**: Access token is automatically saved
5. **API Calls**: All subsequent API calls use the stored token

## Token Storage
As this is a sample application to show the integration with QuickBooks, the tokens are stored in a token.json file In a production application, you should store the tokens with AES-256 encryption (recommended) in a database or secure key vault. 

## 🚀 API Endpoints

### Authentication
- `GET /api/oauth/authorize` - Initiate OAuth 2.0 authorization flow and get authorization URL
- `GET /api/oauth/callback` - Handle OAuth callback from QuickBooks (receives auth code and exchanges for tokens)
- `GET /api/oauth/status` - Get current authentication status and token information
- `POST /api/oauth/refresh` - Refresh the current access token using refresh token
- `POST /api/oauth/disconnect` - Revoke current token and disconnect from QuickBooks
- `GET /api/oauth/connect` - Alias for authorize endpoint (used by setup wizard UI)

### Setup Wizard
- `GET /api/setup/precheck` - Run system pre-checks
- `GET /api/setup/employees` - Get employees with pagination
- `POST /api/setup/employee-compensation/query` - Query employee compensation via GraphQL
- `GET /api/setup/projects` - Get projects with filtering
- `GET /api/setup/customers` - Get customers
- `GET /api/setup/items` - Get items
- `POST /api/setup/timeactivity` - Create time activity
- `GET /api/setup/dashboard/timeactivities` - Get time activities for dashboard

### Company Information
- `GET /api/setup/company` - Get QuickBooks company information

### Projects
- `GET /api/setup/precheck/projects` - Check if projects are enabled

### Time Tracking
- `GET /api/setup/precheck/timetracking` - Check if time tracking is enabled

### Health Check
- `GET /api/employeecompensation/health` - API health status


## 🎯 curl Request Examples

All examples below have been tested with the running application and include actual response data.

### 🔐 Authentication & Health Check

#### Check API Health Status
```bash
curl -s "http://localhost:5037/api/employeecompensation/health" | jq .
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "Healthy",
    "isAuthenticated": true,
    "realmId": "9341452071117966",
    "tokenExpiresAt": "2025-09-11T10:40:45.357736Z",
    "timestamp": "2025-09-11T09:40:45.362488Z"
  },
  "errorMessage": null,
  "validationErrors": null
}
```

#### Check OAuth Token Status
```bash
curl -s "http://localhost:5037/api/oauth/status" | jq .
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isAuthenticated": true,
    "realmId": "9341452071117966",
    "expiresAt": "2025-09-11T10:40:45.357736Z",
    "isExpired": false,
    "minutesUntilExpiry": 59
  },
  "errorMessage": null,
  "validationErrors": null
}
```

#### Get OAuth Authorization URL
```bash
curl -s "http://localhost:5037/api/oauth/authorize" | jq .
```

**Response:**
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://appcenter.intuit.com/connect/oauth2?client_id=CLIENT_ID&response_type=code&scope=com.intuit.quickbooks.accounting%20com.intuit.quickbooks.payroll%20project-management.project%20openid%20payroll.compensation.read&redirect_uri=https%3A%2F%any.ngrok-free.app%2Fapi%2Foauth%2Fcallback&state=ewEiI0RZsViayAjhzY-tSWVZSqPzfouGVCQ0yrXFrSg",
    "state": "ewEiI0RZsViayAjhzY-tSWVZSqPzfouGVCQ0yrXFrSg",
    "message": "Redirect to this URL to authorize with QuickBooks"
  },
  "errorMessage": null,
  "validationErrors": null
}
```

### 👥 Setup Wizard - Employee Management

#### Get All Employees (Setup Wizard)
```bash
curl -s "http://localhost:5037/api/setup/employees" | jq .
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "400000011",
      "name": "Jane Smith",
      "displayName": "Jane Smith",
      "email": "janesmith@email.com",
      "ssn": "",
      "employeeNumber": "",
      "active": true,
      "hireDate": "2025-06-01T00:00:00",
      "terminationDate": null,
      "compensationItems": []
    },
    {
      "id": "400000001",
      "name": "John Doe",
      "displayName": "John Doe",
      "email": "johndoe@email.com",
      "ssn": "",
      "employeeNumber": "",
      "active": true,
      "hireDate": "2025-08-01T00:00:00",
      "terminationDate": null,
      "compensationItems": []
    }
  ],
  "errorMessage": null,
  "validationErrors": null
}
```

#### Get Specific Employee
```bash
curl -s "http://localhost:5037/api/employeecompensation/employees/400000011" | jq .
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "400000011",
    "name": "Jane Smith",
    "displayName": "Jane Smith",
    "email": "janesmith@email.com",
    "ssn": "",
    "employeeNumber": "",
    "active": true,
    "hireDate": "2025-06-01T00:00:00",
    "terminationDate": null,
    "compensationItems": []
  },
  "errorMessage": null,
  "validationErrors": null
}
```

#### Get Employees for Setup (with Pagination)
```bash
curl -s "http://localhost:5037/api/setup/employees" | jq .
```

**Response:**
```json
{
  "success": true,
  "data": {
    "employees": [
      {
        "id": "400000011",
        "displayName": "Jane Smith",
        "givenName": "Jane",
        "familyName": "Smith",
        "active": true,
        "email": "janesmith@email.com",
        "phone": null,
        "employeeNumber": null,
        "hireDate": "2025-06-01"
      },
      {
        "id": "400000001",
        "displayName": "John Doe",
        "givenName": "John",
        "familyName": "Doe",
        "active": true,
        "email": "johndoe@email.com",
        "phone": null,
        "employeeNumber": null,
        "hireDate": "2025-08-01"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalCount": 2,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  },
  "errorMessage": null,
  "validationErrors": null
}
```

### 🏢 Company & Customer Data

#### Get Company Information
```bash
curl -s "http://localhost:5037/api/setup/company" | jq .
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "companyName": "Test",
    "legalName": "Test",
    "companyAddr": {
      "id": "2",
      "line1": null,
      "line2": null,
      "line3": null,
      "line4": null,
      "line5": null,
      "city": null,
      "country": "US",
      "countryCode": null,
      "county": null,
      "countrySubDivisionCode": null,
      "postalCode": "94012",
      "postalCodeSuffix": null,
      "lat": null,
      "long": null,
      "tag": null,
      "note": null
    },
    "country": "US",
    "fiscalYearStartMonth": 0
  },
  "errorMessage": null,
  "validationErrors": null
}
```

#### Get All Customers
```bash
curl -s "http://localhost:5037/api/setup/customers" | jq .
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "8",
      "displayName": "Test Customer 3",
      "companyName": "Test Sandbox",
      "contactInfo": "",
      "billingAddress": "",
      "shippingAddress": "",
      "active": true,
      "balance": 0,
      "isProject": false,
      "metaData": {
        "createTime": "2024-04-04T14:57:07+05:30",
        "lastUpdatedTime": "2025-09-10T20:51:27+05:30"
      }
    },
    {
      "id": "6",
      "displayName": "Test Sandbox Customer 1",
      "companyName": "Test Sandbox Customer 1",
      "contactInfo": "Email: kavita.parmar@ottimate.com | Phone: +91 9619662681 | Mobile: +91 9619662681",
      "billingAddress": "",
      "shippingAddress": "",
      "active": true,
      "balance": 0,
      "isProject": false,
      "metaData": {
        "createTime": "2024-04-04T14:40:39+05:30",
        "lastUpdatedTime": "2025-09-10T20:50:33+05:30"
      }
    }
  ],
  "errorMessage": null,
  "validationErrors": null
}
```

Note: QuickBooks Online has a feature where creating projects automatically generates corresponding customer records with IsProject = true. These are not actual customers but rather project placeholders that appear in the customer entity list. By filtering them out, we now show only genuine customer records.

#### Get All Items
```bash
curl -s "http://localhost:5037/api/setup/items" | jq .
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "7",
      "name": "Hours",
      "type": 8,
      "active": true,
      "description": null
    },
    {
      "id": "6",
      "name": "Services",
      "type": 8,
      "active": true,
      "description": null
    },
    {
      "id": "8",
      "name": "Taxes",
      "type": 8,
      "active": true,
      "description": null
    },
    {
      "id": "9",
      "name": "Wine",
      "type": 4,
      "active": true,
      "description": null
    }
  ],
  "errorMessage": null,
  "validationErrors": null
}
```

### ⏰ Time Activities

#### Get All Time Activities
```bash
curl -s "http://localhost:5037/api/setup/dashboard/timeactivities" | jq .
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1073741829",
      "txnDate": "2025-09-09T00:00:00",
      "employeeRef": "400000011",
      "employeeName": "400000011",
      "customerRef": "8",
      "customerName": "8",
      "itemRef": "7",
      "itemName": "7",
      "hours": 8,
      "minutes": 0,
      "hourlyRate": 0,
      "description": "Time activity created from setup wizard",
      "billableStatus": "NotBillable",
      "billable": false,
      "totalHours": 8,
      "metaData": {
        "createTime": "2025-09-11T01:10:36+05:30",
        "lastUpdatedTime": "2025-09-11T01:10:36+05:30"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalItems": 6,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

#### Filter Time Activities by Employee
```bash
curl -s "http://localhost:5037/api/setup/dashboard/timeactivities?employeeId=400000011" | jq .
```

#### Filter Time Activities by Date Range
```bash
curl -s "http://localhost:5037/api/setup/dashboard/timeactivities?startDate=2024-01-01&endDate=2024-12-31" | jq .
```

#### Create Time Activity
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "employeeId": "400000011",
    "customerId": "8",
    "projectId": "647933362",
    "itemId": "7",
    "date": "2024-01-15T00:00:00Z",
    "hours": 8.0,
    "minutes": 0,
    "description": "Development work on project features"
  }' \
  "http://localhost:5037/api/setup/timeactivity" | jq .
```
A given time activity can only have one ItemRef and one CustomerRef. For the scope of this application, when we choose multiple items, we will create multiple time activities. You will be able to see them in the dashboard.

### 🏗️ Project Management

#### Get Projects with Date Filtering
```bash
curl -s "http://localhost:5037/api/setup/projects?DueDateFrom1=2025-01-01&DueDateTo1=2026-01-01" | jq .
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "customerId": "8",
      "id": "647540715",
      "name": "Test 1",
      "status": "IN_PROGRESS",
      "description": "Test 1",
      "dueDate": "2025-08-30T00:00:00.000Z",
      "startDate": "",
      "completedDate": "",
      "active": true
    },
    {
      "customerId": "8",
      "id": "647933362",
      "name": "project 1 test",
      "status": "COMPLETE",
      "description": "",
      "dueDate": "2025-08-29T00:00:00.000Z",
      "startDate": "",
      "completedDate": "2025-08-28T09:09:49.012Z",
      "active": true
    }
  ],
  "errorMessage": null,
  "validationErrors": null
}
```

### 🔧 System Pre-Checks

#### Perform All Pre-Checks
```bash
curl -s "http://localhost:5037/api/setup/precheck" | jq .
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projectsEnabled": true,
    "timeTrackingEnabled": true,
    "preferencesAccessible": true,
    "allChecksPassed": true
  },
  "errorMessage": null,
  "validationErrors": null
}
```

#### Check Projects Status
```bash
curl -s "http://localhost:5037/api/setup/precheck/projects" | jq .
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projectsEnabled": true
  },
  "errorMessage": null,
  "validationErrors": null
}
```

#### Check Time Tracking Status
```bash
curl -s "http://localhost:5037/api/setup/precheck/timetracking" | jq .
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timeTrackingEnabled": true,
    "message": "Time tracking is enabled in your QuickBooks account"
  },
  "errorMessage": null,
  "validationErrors": null
}
```

### 📊 Query Parameters Reference

#### Time Activities Parameters
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `employeeId` | string | Filter by specific employee | `400000011` |
| `customerId` | string | Filter by specific customer | `8` |
| `startDate` | date | Start date (YYYY-MM-DD) | `2024-01-01` |
| `endDate` | date | End date (YYYY-MM-DD) | `2024-12-31` |
| `page` | int | Page number for pagination | `1` |
| `pageSize` | int | Items per page | `20` |

#### Projects Parameters
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `DueDateFrom1` | date | Filter projects with due date >= this date | `2025-01-01` |
| `DueDateTo1` | date | Filter projects with due date <= this date | `2026-01-01` |
| `StartDateFrom1` | date | Filter projects with start date >= this date | `2025-01-01` |
| `StartDateTo1` | date | Filter projects with start date <= this date | `2026-01-01` |

### 🔧 Getting Valid Reference IDs

```bash
# Get valid employee IDs
curl -s "http://localhost:5037/api/setup/employees" | jq '.data.employees[].id'

# Get valid customer IDs  
curl -s "http://localhost:5037/api/setup/customers" | jq '.data[].id'

# Get valid item IDs
curl -s "http://localhost:5037/api/setup/items" | jq '.data[].id'
```

## Compensation Types

The API supports multiple compensation types:

### Salary Compensation
```json
{
  "compensationType": "Salary",
  "name": "Base Salary",
  "effectiveDate": "2024-01-01",
  "annualAmount": 75000,
  "payFrequency": "Monthly"
}
```

### Hourly Compensation
```json
{
  "compensationType": "Hourly",
  "name": "Hourly Wage",
  "effectiveDate": "2024-01-01",
  "hourlyRate": 25.00,
  "overtimeRate": 37.50
}
```

### Commission Compensation
```json
{
  "compensationType": "Commission",
  "name": "Sales Commission",
  "effectiveDate": "2024-01-01",
  "commissionRate": 5.0,
  "commissionBasis": "Gross Sales"
}
```

### Bonus Compensation
```json
{
  "compensationType": "Bonus",
  "name": "Performance Bonus",
  "effectiveDate": "2024-01-01",
  "bonusAmount": 5000,
  "bonusType": "Performance"
}
```

### Benefit Item
```json
{
  "compensationType": "Benefit",
  "name": "Health Insurance",
  "effectiveDate": "2024-01-01",
  "employeeContribution": 100,
  "employerContribution": 400,
  "benefitType": "Health",
  "provider": "Health Corp"
}
```



## Architecture

```
├── Controllers/                    # API Controllers
│   ├── BaseController.cs          # Base controller with common functionality
│   ├── OAuthController.cs         # OAuth 2.0 authentication endpoints
│   ├── EmployeeCompensationController.cs  # Employee compensation API endpoints
│   └── SetupController.cs         # Setup wizard API endpoints
├── Models/                        # Data Models
│   ├── SharedModels.cs           # Common shared models
│   ├── EmployeeCompensationModels.cs  # Employee and compensation models
│   ├── ProjectModels.cs          # Project-related models
│   ├── ProjectResponse.cs        # Project response models
│   ├── ProjectFilterOptions.cs   # Project filtering options
│   └── TimeActivityModels.cs     # Time activity models
├── Services/                      # Business Logic
│   ├── ITokenManagerService.cs   # Token management interface
│   ├── TokenManagerService.cs    # OAuth token management
│   ├── IEmployeeCompensationService.cs  # Employee compensation interface
│   ├── EmployeeCompensationService.cs   # Employee compensation business logic
│   └── GraphQLHelper.cs          # GraphQL query helper
├── wwwroot/                       # Static Web Assets
│   ├── css/                      # Stylesheets
│   │   ├── style.css
│   │   └── components.css
│   ├── js/                       # JavaScript files
│   │   ├── setup-wizard.js       # Setup wizard functionality
│   │   ├── dashboard.js          # Dashboard functionality
│   │   ├── api-service.js        # API communication
│   │   ├── templates.js          # UI templates
│   │   ├── models.js             # JavaScript models
│   │   ├── validation.js         # Form validation
│   │   ├── utils.js              # Utility functions
│   │   ├── constants.js          # Application constants
│   │   ├── state-manager.js      # State management
│   │   ├── event-bus.js          # Event handling
│   │   ├── loading-manager.js    # Loading states
│   │   ├── error-boundary.js     # Error handling
│   │   └── tests/                # JavaScript tests
│   ├── index.html                # Setup wizard UI
│   └── dashboard.html            # Dashboard UI
├── Properties/                    # Project properties
│   └── launchSettings.json
├── Program.cs                     # Application startup and configuration
├── QuickBooks-EmployeeCompensation-API.csproj #Application
├── QuickBooks-EmployeeCompensation-API.http
├── QuickBooks-EmployeeCompensation-API.sln
├── appsettings.json              # Application configuration
├── appsettings.Development.json  # Development configuration
└── token.json                    # OAuth token storage (runtime)
```

## Security Features

- **State Parameter**: CSRF protection during OAuth flow
- **Token Expiration**: Automatic token refresh
- **Secure Storage**: Tokens stored securely on server
- **HTTPS**: All communication over HTTPS in production

## Error Handling

The API uses a consistent error response format:

```json
{
  "success": false,
  "errorMessage": "Error description",
  "validationErrors": ["Field validation errors"]
}
```

## Development

### Building
```bash
dotnet build
```

### Testing
```bash
dotnet test
```

### Publishing
```bash
dotnet publish -c Release
```

## Deployment

### Docker (Optional)
Create a `Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY ./publish .
ENTRYPOINT ["dotnet", "QuickBooks-EmployeeCompensation-API.dll"]
```

### Environment Variables
- `QuickBooks__ClientId`
- `QuickBooks__ClientSecret`
- `QuickBooks__Environment`

## Support

For support and questions:
1. Check the [QuickBooks API documentation](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-commonly-used/employee)
2. Review the Swagger documentation at `/swagger`
3. Check application logs for detailed error information
