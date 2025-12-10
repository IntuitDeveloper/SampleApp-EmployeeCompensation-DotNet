// HTML Templates for QuickBooks Employee Compensation Setup Wizard

const templates = {
    // Auth Step Templates
    authConnected: `
        <div class="step-content">
            <div class="oauth-container">
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    <strong>Connected to QuickBooks!</strong>
                    <p class="mb-0 mt-2">Your application is successfully connected and ready to sync data with QuickBooks Online.</p>
                </div>
                
                <div class="card mt-4">
                    <div class="card-body">
                        <h5 class="card-title text-center mb-4">
                            <i class="fas fa-building text-primary"></i> Company Information
                        </h5>
                        <div class="row text-center">
                            <div class="col-md-4">
                                <div class="info-box p-3">
                                    <i class="fas fa-circle text-success mb-2"></i>
                                    <h6>Status</h6>
                                    <span class="badge bg-success">Connected</span>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="info-box p-3">
                                    <i class="fas fa-building text-info mb-2"></i>
                                    <h6>Company</h6>
                                    <span id="companyName">Loading...</span>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="info-box p-3">
                                    <i class="fas fa-clock text-warning mb-2"></i>
                                    <h6>Connected</h6>
                                    <span id="connectionTime" class="small">Just now</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-4">
                    <button type="button" class="btn btn-outline-danger me-2" id="disconnectBtn">
                        <i class="fas fa-unlink"></i> Disconnect
                    </button>
                    <button type="button" class="btn btn-primary btn-lg" onclick="window.setupWizard.nextStep()">
                        <i class="fas fa-arrow-right"></i> Continue Setup
                    </button>
                </div>
            </div>
        </div>
    `,

    authDisconnected: `
        <div class="step-content">
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle"></i> Not connected to QuickBooks
            </div>
            <div class="text-center mt-4">
                <button type="button" class="btn btn-primary" id="connectBtn">
                    <i class="fas fa-link"></i> Connect to QuickBooks
                </button>
            </div>
        </div>
    `,

    // Pre-check Step Template
    preCheck: `
        <div class="step-content">
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0">
                        <i class="fas fa-clipboard-check text-primary"></i> System Pre-checks
                    </h5>
                    <p class="text-muted mb-0">Verifying your QuickBooks configuration...</p>
                </div>
                <div class="card-body">
                    <div class="precheck-results">
                        <div class="precheck-item d-flex align-items-center justify-content-between p-3 mb-2 border rounded" id="projectsCheck">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-spinner fa-spin text-primary me-3"></i>
                                <div>
                                    <h6 class="mb-0">Projects Feature</h6>
                                    <small class="text-muted">Checking if projects are enabled...</small>
                                </div>
                            </div>
                            <span class="status-badge"></span>
                        </div>
                        
                        <div class="precheck-item d-flex align-items-center justify-content-between p-3 mb-2 border rounded" id="timeTrackingCheck">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-spinner fa-spin text-primary me-3"></i>
                                <div>
                                    <h6 class="mb-0">Time Tracking</h6>
                                    <small class="text-muted">Verifying time tracking capabilities...</small>
                                </div>
                            </div>
                            <span class="status-badge"></span>
                        </div>
                        
                        <div class="precheck-item d-flex align-items-center justify-content-between p-3 mb-2 border rounded" id="preferencesCheck">
                            <div class="d-flex align-items-center">
                                <i class="fas fa-spinner fa-spin text-primary me-3"></i>
                                <div>
                                    <h6 class="mb-0">Preferences Access</h6>
                                    <small class="text-muted">Checking system preferences...</small>
                                </div>
                            </div>
                            <span class="status-badge"></span>
                        </div>
                    </div>
                    
                    <div class="precheck-summary mt-4" id="precheckSummary" style="display: none;">
                        <div class="alert" id="summaryAlert">
                            <div class="d-flex align-items-center">
                                <i class="summary-icon me-2"></i>
                                <div>
                                    <strong class="summary-title"></strong>
                                    <p class="mb-0 summary-text"></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Employee List Template
    employeeList: `
        <div class="step-content">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Select Employee</h5>
                    <p class="text-muted">Choose an employee to continue with the setup process.</p>
                    
                    <!-- Messages Container -->
                    <div id="employeeMessages" class="mb-3" style="display: none;">
                        <!-- Dynamic messages will be inserted here -->
                    </div>
                    
                    <!-- Employee List Container -->
                    <div id="employeeListContainer">
                        <div class="text-center py-4">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading employees...</span>
                            </div>
                            <p class="mt-2 text-muted">Loading employees...</p>
                        </div>
                    </div>
                    
                    <!-- Pagination Container -->
                    <div id="employeePaginationContainer" class="mt-3" style="display: none;">
                        <nav aria-label="Employee pagination">
                            <ul class="pagination justify-content-center" id="employeePagination">
                            </ul>
                        </nav>
                        <div class="text-center">
                            <small class="text-muted" id="employeePaginationInfo"></small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Compensation List Template
    compensationList: `
        <div class="step-content">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Select Employee Compensation</h5>
                    <p class="text-muted">Choose the compensation types for the selected employee. Active compensations are automatically selected.</p>
                    
                    <!-- Note Message -->
                    <div class="alert alert-info d-flex align-items-center mb-3" role="alert">
                        <i class="fas fa-lightbulb me-2"></i>
                        <div>
                            <strong>Note:</strong> Active employee compensations are pre-selected. 
                            You can select multiple compensation types for time tracking.
                        </div>
                    </div>
                    
                    <!-- Compensation List Container -->
                    <div id="compensationListContainer">
                        <div class="text-center py-4">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading compensations...</span>
                            </div>
                            <p class="mt-2 text-muted">Loading compensations...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Project Filters Template
    projectFilters: `
        <div class="step-content">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Project Date Filters</h5>
                    <p class="text-muted">Set date ranges to filter projects. At least one date range is required.</p>
                    
                    <!-- Info Message -->
                    <div class="alert alert-info d-flex align-items-center mb-3" role="alert">
                        <i class="fas fa-info-circle me-2"></i>
                        <div>
                            <strong>Info:</strong> Projects are filtered based on your date criteria. Select one project to continue.
                        </div>
                    </div>
                    
                    <!-- Start Date Range -->
                    <div class="mb-4">
                        <h6 class="text-primary">
                            <i class="fas fa-calendar-alt me-2"></i>Start Date Range
                        </h6>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="startDateFrom" class="form-label">From</label>
                                    <input type="date" class="form-control" id="startDateFrom">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="startDateTo" class="form-label">To</label>
                                    <input type="date" class="form-control" id="startDateTo">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Due Date Range -->
                    <div class="mb-4">
                        <h6 class="text-primary">
                            <i class="fas fa-calendar-check me-2"></i>Due Date Range
                        </h6>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="dueDateFrom" class="form-label">From</label>
                                    <input type="date" class="form-control" id="dueDateFrom">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="dueDateTo" class="form-label">To</label>
                                    <input type="date" class="form-control" id="dueDateTo">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-center mt-3">
                        <button type="button" class="btn btn-primary" id="applyFilters">
                            <i class="fas fa-filter me-2"></i>Apply Date Filters
                        </button>
                        <button type="button" class="btn btn-outline-secondary ms-2" id="clearFilters">
                            <i class="fas fa-times me-2"></i>Clear Filters
                        </button>
                    </div>
                    
                    <div class="mt-4" id="projectListContainer" style="display: none;">
                        <hr>
                        <h6 class="text-success">
                            <i class="fas fa-tasks me-2"></i>Available Projects
                        </h6>
                        <div id="projectCardsContainer">
                            <!-- Project cards will be inserted here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Customer List Template
    customerList: `
        <div class="step-content">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Select Customer</h5>
                    <p class="text-muted">The customer associated with your selected project will be automatically selected.</p>
                    
                    <!-- Note Message -->
                    <div class="alert alert-info d-flex align-items-center mb-3" role="alert">
                        <i class="fas fa-lightbulb me-2"></i>
                        <div>
                            <strong>Note:</strong> The customer linked to your selected project is automatically chosen. 
                            You can change the selection if needed.
                        </div>
                    </div>
                    
                    <!-- Customer List Container -->
                    <div id="customerListContainer">
                        <div class="text-center py-4">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading customers...</span>
                            </div>
                            <p class="mt-2 text-muted">Loading customers...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Item List Template
    itemList: `
        <div class="step-content">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Select Items</h5>
                    <p class="text-muted">Select one or more items for time tracking and billing purposes.</p>
                    
                    <!-- Messages Container - Tips, Warnings, Success -->
                    <div class="mb-3">
                        <div class="alert alert-info d-flex align-items-center" role="alert">
                            <i class="fas fa-lightbulb me-2"></i>
                            <div>
                                <strong>Tip:</strong> You can select multiple items. These will be used for time tracking and billing.
                            </div>
                        </div>
                        
                        <!-- Warning Message (will be shown/hidden dynamically) -->
                        <div id="itemSelectionWarning" class="alert alert-warning d-flex align-items-center" role="alert" style="display: flex;">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <div>
                                <strong>Notice:</strong> Please select at least one item to continue.
                            </div>
                        </div>
                    </div>
                    
                    <!-- Item List Container -->
                    <div id="itemListContainer">
                        <div class="text-center py-4">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Loading items...</span>
                            </div>
                            <p class="mt-2 text-muted">Loading items...</p>
                        </div>
                    </div>
                    
                    <!-- Pagination Container -->
                    <div id="itemPaginationContainer" class="mt-3" style="display: none;">
                        <nav aria-label="Items pagination">
                            <ul class="pagination pagination-sm justify-content-center" id="itemPagination">
                                <!-- Pagination will be inserted here -->
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Item Card Template
    itemCard: (item, isSelected = false) => `
        <div class="item-card ${isSelected ? 'selected' : ''}" data-item-id="${item.id}">
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <div class="item-selection">
                                <div class="form-check">
                                    <input class="form-check-input item-checkbox" type="checkbox" 
                                           value="${item.id}" 
                                           id="item_${item.id}" ${isSelected ? 'checked' : ''}>
                                    <label class="form-check-label" for="item_${item.id}">
                                        <div class="selection-indicator">
                                            <i class="fas fa-check"></i>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="col">
                            <h6 class="card-title mb-2">
                                <i class="fas fa-box me-2"></i>
                                ${item.name || 'Item ' + item.id}
                            </h6>
                            
                            <!-- Item Type -->
                            <p class="card-text mb-1">
                                <i class="fas fa-tag me-2 text-primary"></i>
                                <strong>Type:</strong> ${templates.getItemTypeName(item.type)}
                            </p>
                            
                            <!-- Description -->
                            ${item.description ? `
                                <p class="card-text mb-2">
                                    <i class="fas fa-align-left me-2 text-info"></i>
                                    <strong>Description:</strong> ${item.description}
                                </p>
                            ` : ''}
                            
                            <!-- Status and ID -->
                            <div class="row align-items-center">
                                <div class="col-auto">
                                    <span class="badge ${item.active ? 'bg-success' : 'bg-secondary'}">
                                        <i class="fas ${item.active ? 'fa-check-circle' : 'fa-times-circle'} me-1"></i>
                                        ${item.active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div class="col-auto">
                                    <small class="text-muted">
                                        <i class="fas fa-hashtag me-1"></i>
                                        ID: ${item.id}
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Item List Container Template
    itemListContainer: (items, selectedItemIds = []) => `
        <div class="item-list">
            ${items.map(item => 
                templates.itemCard(item, selectedItemIds.includes(item.id))
            ).join('')}
        </div>
    `,

    // Helper method for item type names
    getItemTypeName: (type) => {
        const typeNames = {
            1: 'Inventory',
            2: 'Group', 
            3: 'Service',
            4: 'Other Charge',
            5: 'Subtotal',
            6: 'Discount',
            7: 'Payment',
            8: 'Sales Tax',
            9: 'Tax Group'
        };
        return typeNames[type] || `Type ${type}`;
    },

    // Summary Template
    summary: (state) => `
        <div class="step-content">
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Setup Summary</h5>
                    <div class="list-group">
                        <div class="list-group-item">
                            <strong>Employee:</strong> ${state.selectedEmployee?.displayName || 'Not selected'}
                        </div>
                        <div class="list-group-item">
                            <strong>Compensation:</strong> ${state.selectedCompensation && state.selectedCompensation.length > 0 ? 
                                state.selectedCompensation.map(comp => comp.payrollItem?.name || comp.name || 'Unknown').join(', ') : 'Not selected'}
                        </div>
                        <div class="list-group-item">
                            <strong>Project:</strong> ${state.selectedProject?.name || 'Not selected'}
                        </div>
                        <div class="list-group-item">
                            <strong>Customer:</strong> ${state.selectedCustomer?.displayName || 'Not selected'}
                        </div>
                        <div class="list-group-item">
                            <strong>Items:</strong> ${state.selectedItems && state.selectedItems.length > 0 ? 
                                state.selectedItems.map(item => item.name).join(', ') : 'Not selected'}
                        </div>
                    </div>
                    <div class="text-center mt-4">
                        <button type="button" class="btn btn-primary me-2" id="showApiPayload">
                            <i class="fas fa-code"></i> Show API Payload
                        </button>
                        <button type="button" class="btn btn-success me-2" id="downloadResults">
                            <i class="fas fa-download"></i> Download Configuration
                        </button>
                        <a href="/dashboard.html" class="btn btn-success me-2">
                            <i class="fas fa-plus"></i> Create Time Activity
                        </a>
                        <button type="button" class="btn btn-outline-primary" id="createNewActivity">
                            <i class="fas fa-plus"></i> Create New Activity
                        </button>
                    </div>
                    
                    <!-- API Payload Modal -->
                    <div class="modal fade" id="apiPayloadModal" tabindex="-1" aria-labelledby="apiPayloadModalLabel" aria-hidden="true">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title" id="apiPayloadModalLabel">
                                        <i class="fas fa-code me-2"></i>TimeActivity API Payload
                                    </h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="alert alert-info">
                                        <i class="fas fa-info-circle me-2"></i>
                                        <strong>API Endpoint:</strong> <code>POST /api/setup/timeactivity</code>
                                    </div>
                                    <h6>Request Payload:</h6>
                                    <pre id="apiPayloadContent" class="bg-light p-3 rounded"><code></code></pre>
                                    
                                    <h6 class="mt-4">QuickBooks Online API Mapping:</h6>
                                    <div class="table-responsive">
                                        <table class="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Our API Field</th>
                                                    <th>QBO API Field</th>
                                                    <th>Value Source</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td><code>TxnDate</code></td>
                                                    <td><code>TxnDate</code></td>
                                                    <td>Current ISO 8601 DateTime</td>
                                                </tr>
                                                <tr>
                                                    <td><code>NameOf</code></td>
                                                    <td><code>NameOf</code></td>
                                                    <td>Fixed value: "Employee"</td>
                                                </tr>
                                                <tr>
                                                    <td><code>EmployeeRef.value</code></td>
                                                    <td><code>EmployeeRef.value</code></td>
                                                    <td>Selected Employee ID</td>
                                                </tr>
                                                <tr>
                                                    <td><code>PayrollItemRef.value</code></td>
                                                    <td><code>PayrollItemRef.value</code></td>
                                                    <td>First Selected Compensation ID</td>
                                                </tr>
                                                <tr>
                                                    <td><code>CustomerRef.value</code></td>
                                                    <td><code>CustomerRef.value</code></td>
                                                    <td>Selected Customer ID</td>
                                                </tr>
                                                <tr>
                                                    <td><code>ProjectRef.value</code></td>
                                                    <td><code>ProjectRef.value</code></td>
                                                    <td>Selected Project ID</td>
                                                </tr>
                                                <tr>
                                                    <td><code>ItemRef.value</code></td>
                                                    <td><code>ItemRef.value</code></td>
                                                    <td>First Selected Item ID</td>
                                                </tr>
                                                <tr>
                                                    <td><code>Hours</code></td>
                                                    <td><code>Hours</code></td>
                                                    <td>Example: 8 hours</td>
                                                </tr>
                                                <tr>
                                                    <td><code>Minutes</code></td>
                                                    <td><code>Minutes</code></td>
                                                    <td>Example: 0 minutes</td>
                                                </tr>
                                                <tr>
                                                    <td><code>Description</code></td>
                                                    <td><code>Description</code></td>
                                                    <td>Example: "Construction:DailyWork"</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-outline-secondary" id="copyPayload">
                                        <i class="fas fa-copy me-1"></i> Copy to Clipboard
                                    </button>
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Error Template
    error: (message) => `
        <div class="step-content">
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle"></i> ${message}
            </div>
        </div>
    `,

    // Employee Card Template
    employeeCard: (employee, isSelected = false) => `
        <div class="employee-card ${isSelected ? 'selected' : ''}" data-employee-id="${employee.id}">
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <div class="employee-selection">
                                <div class="form-check">
                                    <input class="form-check-input employee-radio" type="radio" 
                                           name="selectedEmployee" value="${employee.id}" 
                                           id="employee_${employee.id}" ${isSelected ? 'checked' : ''}>
                                    <label class="form-check-label" for="employee_${employee.id}">
                                        <div class="selection-indicator">
                                            <i class="fas fa-check"></i>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="col">
                            <h6 class="card-title mb-1">${employee.displayName}</h6>
                            <div class="employee-details">
                                <div class="row g-2">
                                    <div class="col-sm-6">
                                        <small class="text-muted">
                                            <i class="fas fa-user"></i> 
                                            ${employee.givenName} ${employee.familyName}
                                        </small>
                                    </div>
                                    ${employee.employeeNumber ? `
                                    <div class="col-sm-6">
                                        <small class="text-muted">
                                            <i class="fas fa-id-badge"></i> 
                                            #${employee.employeeNumber}
                                        </small>
                                    </div>
                                    ` : ''}
                                    ${employee.email ? `
                                    <div class="col-sm-6">
                                        <small class="text-muted">
                                            <i class="fas fa-envelope"></i> 
                                            ${employee.email}
                                        </small>
                                    </div>
                                    ` : ''}
                                    ${employee.phone ? `
                                    <div class="col-sm-6">
                                        <small class="text-muted">
                                            <i class="fas fa-phone"></i> 
                                            ${employee.phone}
                                        </small>
                                    </div>
                                    ` : ''}
                                    ${employee.hireDate ? `
                                    <div class="col-sm-6">
                                        <small class="text-muted">
                                            <i class="fas fa-calendar"></i> 
                                            Hired: ${employee.hireDate}
                                        </small>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Employee List Container Template
    employeeListContainer: (employees, selectedEmployeeId = null) => `
        <div class="employee-list">
            ${employees.map(employee => 
                templates.employeeCard(employee, employee.id === selectedEmployeeId)
            ).join('')}
        </div>
    `,

    // Compensation Card Template
    compensationCard: (compensation, isSelected = false) => `
        <div class="compensation-card ${isSelected ? 'selected' : ''}" data-compensation-id="${compensation.id}">
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <div class="compensation-selection">
                                <div class="form-check">
                                    <input class="form-check-input compensation-checkbox" type="checkbox" 
                                           value="${compensation.id}" 
                                           id="compensation_${compensation.id}" ${isSelected ? 'checked' : ''}>
                                    <label class="form-check-label" for="compensation_${compensation.id}">
                                        <div class="selection-indicator">
                                            <i class="fas fa-check"></i>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="col">
                            <h6 class="card-title mb-1">${compensation.payrollItem?.name || 'Compensation ' + compensation.id}</h6>
                            <div class="compensation-details">
                                <div class="row g-2">
                                    <div class="col-sm-6">
                                        <small class="text-muted">
                                            <i class="fas fa-money-bill-wave"></i> 
                                            ${compensation.compensationType?.replace('_', ' ') || 'Unknown Type'}
                                        </small>
                                    </div>
                                    ${compensation.rate && compensation.rate > 0 ? `
                                    <div class="col-sm-6">
                                        <small class="text-muted">
                                            <i class="fas fa-dollar-sign"></i> 
                                            $${compensation.rate}${compensation.compensationType === 'SALARY' ? '/month' : '/hr'}
                                        </small>
                                    </div>
                                    ` : ''}
                                    <div class="col-sm-6">
                                        <small class="text-muted">
                                            <i class="fas fa-circle ${compensation.active ? 'text-success' : 'text-danger'}"></i> 
                                            ${compensation.active ? 'Active' : 'Inactive'}
                                        </small>
                                    </div>
                                    ${compensation.payrollItem?.id ? `
                                    <div class="col-sm-6">
                                        <small class="text-muted">
                                            <i class="fas fa-tag"></i> 
                                            ID: ${compensation.payrollItem.id}
                                        </small>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Compensation List Container Template
    compensationListContainer: (compensations, selectedCompensationIds = []) => `
        <div class="compensation-list">
            ${compensations.map(compensation => 
                templates.compensationCard(compensation, selectedCompensationIds.includes(compensation.id))
            ).join('')}
        </div>
    `,

    // Project Card Template
    projectCard: (project, isSelected = false) => `
        <div class="project-card ${isSelected ? 'selected' : ''}" data-project-id="${project.id}">
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <div class="project-selection">
                                <div class="form-check">
                                    <input class="form-check-input project-radio" type="radio" 
                                           name="selectedProject" value="${project.id}" 
                                           id="project_${project.id}" ${isSelected ? 'checked' : ''}>
                                    <label class="form-check-label" for="project_${project.id}">
                                        <div class="selection-indicator">
                                            <i class="fas fa-check"></i>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="col">
                            <h6 class="card-title mb-1">${project.name}</h6>
                            <div class="project-details">
                                <div class="row g-2">
                                    ${project.description ? `
                                    <div class="col-sm-12">
                                        <small class="text-muted">
                                            <i class="fas fa-align-left"></i> 
                                            ${project.description}
                                        </small>
                                    </div>
                                    ` : ''}
                                    <div class="col-sm-6">
                                        <small class="text-muted">
                                            <i class="fas fa-tasks"></i> 
                                            ${project.status?.replace('_', ' ') || 'Unknown Status'}
                                        </small>
                                    </div>
                                    ${project.dueDate ? `
                                    <div class="col-sm-6">
                                        <small class="text-muted">
                                            <i class="fas fa-calendar-alt"></i> 
                                            Due: ${new Date(project.dueDate).toLocaleDateString()}
                                        </small>
                                    </div>
                                    ` : ''}
                                    ${project.startDate ? `
                                    <div class="col-sm-6">
                                        <small class="text-muted">
                                            <i class="fas fa-play"></i> 
                                            Started: ${new Date(project.startDate).toLocaleDateString()}
                                        </small>
                                    </div>
                                    ` : ''}
                                    ${project.customerId ? `
                                    <div class="col-sm-6">
                                        <small class="text-muted">
                                            <i class="fas fa-building"></i> 
                                            Customer ID: ${project.customerId}
                                        </small>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Project List Container Template
    projectListContainer: (projects, selectedProjectId = null) => `
        <div class="project-list">
            ${projects.map(project => 
                templates.projectCard(project, project.id === selectedProjectId)
            ).join('')}
        </div>
    `,

    // Customer Card Template
    customerCard: (customer, isSelected = false) => `
        <div class="customer-card ${isSelected ? 'selected' : ''}" data-customer-id="${customer.id}">
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-auto">
                            <div class="customer-selection">
                                <div class="form-check">
                                    <input class="form-check-input customer-radio" type="radio" 
                                           name="selectedCustomer" value="${customer.id}" 
                                           id="customer_${customer.id}" ${isSelected ? 'checked' : ''}>
                                    <label class="form-check-label" for="customer_${customer.id}">
                                        <div class="selection-indicator">
                                            <i class="fas fa-check"></i>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div class="col">
                            <h6 class="card-title mb-2">
                                <i class="fas fa-user-tie me-2"></i>
                                ${customer.displayName || 'Customer ' + customer.id}
                            </h6>
                            
                            <!-- Company Name -->
                            ${customer.companyName ? `
                                <p class="card-text mb-1">
                                    <i class="fas fa-building me-2 text-primary"></i>
                                    <strong>Company:</strong> ${customer.companyName}
                                </p>
                            ` : ''}
                            
                            <!-- Contact Information -->
                            ${customer.contactInfo ? `
                                <p class="card-text mb-2">
                                    <i class="fas fa-address-book me-2 text-info"></i>
                                    <strong>Contact:</strong> ${customer.contactInfo}
                                </p>
                            ` : ''}
                            
                            <!-- Billing Address -->
                            ${customer.billingAddress ? `
                                <p class="card-text mb-1">
                                    <i class="fas fa-map-marker-alt me-2 text-warning"></i>
                                    <strong>Billing:</strong> ${customer.billingAddress}
                                </p>
                            ` : ''}
                            
                            <!-- Shipping Address -->
                            ${customer.shippingAddress ? `
                                <p class="card-text mb-2">
                                    <i class="fas fa-shipping-fast me-2 text-success"></i>
                                    <strong>Shipping:</strong> ${customer.shippingAddress}
                                </p>
                            ` : ''}
                            
                            <!-- Status and ID -->
                            <div class="row align-items-center">
                                <div class="col-auto">
                                    <span class="badge ${customer.active ? 'bg-success' : 'bg-secondary'}">
                                        <i class="fas ${customer.active ? 'fa-check-circle' : 'fa-times-circle'} me-1"></i>
                                        ${customer.active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div class="col-auto">
                                    <small class="text-muted">
                                        <i class="fas fa-hashtag me-1"></i>
                                        ID: ${customer.id}
                                    </small>
                                </div>
                                ${customer.balance !== undefined ? `
                                    <div class="col-auto">
                                        <small class="text-muted">
                                            <i class="fas fa-dollar-sign me-1"></i>
                                            Balance: $${customer.balance.toFixed(2)}
                                        </small>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    // Customer List Container Template
    customerListContainer: (customers, selectedCustomerId = null) => `
        <div class="customer-list">
            ${customers.map(customer => 
                templates.customerCard(customer, customer.id === selectedCustomerId)
            ).join('')}
        </div>
    `,

    // Pagination Template
    pagination: (pagination) => {
        const { currentPage, totalPages, hasNextPage, hasPreviousPage } = pagination;
        let paginationHtml = '';
        
        // Previous button
        paginationHtml += `
            <li class="page-item ${!hasPreviousPage ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}" ${!hasPreviousPage ? 'tabindex="-1"' : ''}>
                    <i class="fas fa-chevron-left"></i> Previous
                </a>
            </li>
        `;
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="1">1</a>
                </li>
            `;
            if (startPage > 2) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHtml += `
            <li class="page-item ${!hasNextPage ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}" ${!hasNextPage ? 'tabindex="-1"' : ''}>
                    Next <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        return paginationHtml;
    },

    // Pagination Info Template
    paginationInfo: (pagination) => {
        const { currentPage, pageSize, totalCount, totalPages } = pagination;
        const startItem = ((currentPage - 1) * pageSize) + 1;
        const endItem = Math.min(currentPage * pageSize, totalCount);
        
        return `Showing ${startItem}-${endItem} of ${totalCount} employees (Page ${currentPage} of ${totalPages})`;
    }
};