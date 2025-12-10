// Dashboard Manager for Time Activities
class TimeActivitiesDashboard {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalPages = 0;
        this.totalItems = 0;
        this.filters = {
            employeeId: '',
            startDate: '',
            endDate: ''
        };
        this.employees = [];
        this.timeActivities = [];
        
        this.init();
    }
    
    async init() {
        this.bindEvents();
        await this.loadEmployees();
        await this.loadTimeActivities();
        this.setDefaultDateRange();
    }
    
    bindEvents() {
        // Filter events
        document.getElementById('applyFilters').addEventListener('click', () => this.applyFilters());
        document.getElementById('clearFilters').addEventListener('click', () => this.clearFilters());
        document.getElementById('refreshData').addEventListener('click', () => this.refreshData());
        
        // Dashboard action events
        document.getElementById('createTimeActivity').addEventListener('click', () => this.createTimeActivity());
        document.getElementById('showPayload').addEventListener('click', () => this.showPayload());
        document.getElementById('copyPayload').addEventListener('click', () => this.copyPayload());
        document.getElementById('executePayload').addEventListener('click', () => this.executePayload());
        
        // Enter key support for filters
        document.getElementById('startDate').addEventListener('change', () => this.applyFilters());
        document.getElementById('endDate').addEventListener('change', () => this.applyFilters());
        document.getElementById('employeeFilter').addEventListener('change', () => this.applyFilters());
    }
    
    setDefaultDateRange() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3); // Last 3 months
        
        document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
    }
    
    async loadEmployees() {
        try {
            const response = await fetch('/api/setup/employees?pageSize=100');
            const data = await response.json();
            
            if (data.success && data.data && data.data.employees) {
                this.employees = data.data.employees;
                this.populateEmployeeFilter();
            }
        } catch (error) {
            console.error('Error loading employees:', error);
            this.showAlert('Error loading employees', 'error');
        }
    }
    
    populateEmployeeFilter() {
        const select = document.getElementById('employeeFilter');
        select.innerHTML = '<option value="">All Employees</option>';
        
        this.employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = employee.displayName || `${employee.givenName} ${employee.familyName}`.trim();
            select.appendChild(option);
        });
    }
    
    async loadTimeActivities() {
        this.showLoading(true);
        
        try {
            const params = new URLSearchParams({
                page: this.currentPage.toString(),
                pageSize: this.pageSize.toString()
            });
            
            if (this.filters.employeeId) {
                params.append('employeeId', this.filters.employeeId);
            }
            
            if (this.filters.startDate) {
                params.append('startDate', this.filters.startDate);
            }
            
            if (this.filters.endDate) {
                params.append('endDate', this.filters.endDate);
            }
            
            const response = await fetch(`/api/setup/dashboard/timeactivities?${params}`);
            const data = await response.json();
            
            if (data.success) {
                this.timeActivities = data.data || [];
                this.updatePagination(data.pagination);
                this.renderTimeActivities();
                this.updateStats();
            } else {
                throw new Error(data.error || 'Failed to load time activities');
            }
        } catch (error) {
            console.error('Error loading time activities:', error);
            this.showAlert('Error loading time activities: ' + error.message, 'error');
            this.timeActivities = [];
            this.renderTimeActivities();
        } finally {
            this.showLoading(false);
        }
    }
    
    renderTimeActivities() {
        const tbody = document.getElementById('timeActivitiesTable');
        const emptyState = document.getElementById('emptyState');
        
        if (this.timeActivities.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('d-none');
            return;
        }
        
        emptyState.classList.add('d-none');
        
        tbody.innerHTML = this.timeActivities.map(activity => `
            <tr>
                <td>
                    <div class="fw-bold">${this.formatDate(activity.txnDate)}</div>
                    <small class="text-muted">${this.formatTime(activity.txnDate)}</small>
                </td>
                <td>
                    <div class="fw-bold">${activity.employeeName || 'Unknown'}</div>
                    <small class="text-muted">ID: ${activity.employeeRef || 'N/A'}</small>
                </td>
                <td>
                    <div class="fw-bold">${activity.customerName || 'No Customer'}</div>
                    ${activity.customerRef ? `<small class="text-muted">ID: ${activity.customerRef}</small>` : ''}
                </td>
                <td>
                    <div class="fw-bold">${activity.itemName || 'No Item'}</div>
                    ${activity.itemRef ? `<small class="text-muted">ID: ${activity.itemRef}</small>` : ''}
                </td>
                <td>
                    <div class="fw-bold">${this.formatHours(activity.totalHours)}</div>
                    <small class="text-muted">${activity.hours || 0}h ${activity.minutes || 0}m</small>
                </td>
                <td>
                    <div class="fw-bold">${this.formatCurrency(activity.hourlyRate)}</div>
                    <small class="text-muted">per hour</small>
                </td>
                <td>
                    ${this.renderStatusBadge(activity.billable, activity.billableStatus)}
                </td>
                <td>
                    <div class="text-truncate" style="max-width: 200px;" title="${activity.description || 'No description'}">
                        ${activity.description || 'No description'}
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    renderStatusBadge(billable, billableStatus) {
        if (billable === true || billableStatus === 'Billable') {
            return '<span class="badge badge-billable"><i class="fas fa-dollar-sign me-1"></i>Billable</span>';
        } else if (billable === false || billableStatus === 'NotBillable') {
            return '<span class="badge badge-non-billable"><i class="fas fa-times me-1"></i>Non-Billable</span>';
        } else {
            return '<span class="badge bg-secondary"><i class="fas fa-question me-1"></i>Unknown</span>';
        }
    }
    
    updateStats() {
        const totalActivities = this.totalItems;
        const totalHours = this.timeActivities.reduce((sum, activity) => sum + (activity.totalHours || 0), 0);
        const billableHours = this.timeActivities.reduce((sum, activity) => {
            return sum + (activity.billable ? (activity.totalHours || 0) : 0);
        }, 0);
        const activeEmployees = new Set(this.timeActivities.map(activity => activity.employeeRef)).size;
        
        document.getElementById('totalActivities').textContent = totalActivities.toLocaleString();
        document.getElementById('totalHours').textContent = this.formatHours(totalHours);
        document.getElementById('billableHours').textContent = this.formatHours(billableHours);
        document.getElementById('activeEmployees').textContent = activeEmployees.toString();
    }
    
    updatePagination(pagination) {
        if (!pagination) return;
        
        this.currentPage = pagination.currentPage;
        this.pageSize = pagination.pageSize;
        this.totalItems = pagination.totalItems;
        this.totalPages = pagination.totalPages;
        
        // Update pagination info
        const start = (this.currentPage - 1) * this.pageSize + 1;
        const end = Math.min(this.currentPage * this.pageSize, this.totalItems);
        document.getElementById('paginationInfo').textContent = 
            `Showing ${start.toLocaleString()} - ${end.toLocaleString()} of ${this.totalItems.toLocaleString()} activities`;
        
        // Update pagination controls
        this.renderPagination();
    }
    
    renderPagination() {
        const pagination = document.getElementById('pagination');
        
        if (this.totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += '<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>';
            if (startPage > 2) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            paginationHTML += `<li class="page-item"><a class="page-link" href="#" data-page="${this.totalPages}">${this.totalPages}</a></li>`;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        pagination.innerHTML = paginationHTML;
        
        // Bind pagination events
        pagination.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.closest('.page-link').dataset.page);
                if (page && page !== this.currentPage && page >= 1 && page <= this.totalPages) {
                    this.currentPage = page;
                    this.loadTimeActivities();
                }
            });
        });
    }
    
    applyFilters() {
        this.filters = {
            employeeId: document.getElementById('employeeFilter').value,
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value
        };
        
        this.currentPage = 1; // Reset to first page
        this.loadTimeActivities();
    }
    
    clearFilters() {
        document.getElementById('employeeFilter').value = '';
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        
        this.filters = {
            employeeId: '',
            startDate: '',
            endDate: ''
        };
        
        this.currentPage = 1;
        this.loadTimeActivities();
    }
    
    refreshData() {
        this.loadTimeActivities();
    }
    
    async createTimeActivity() {
        try {
            // Generate payload with current date/time and available data
            const payload = this.generateTimeActivityPayload();
            
            // Show confirmation modal before creating
            if (await this.confirmTimeActivityCreation(payload)) {
                const response = await fetch('/api/setup/timeactivity', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    this.showAlert('Time activity created successfully!', 'success');
                    this.refreshData(); // Refresh the table to show new activity
                } else {
                    this.showAlert('Failed to create time activity: ' + (result.error || 'Unknown error'), 'error');
                }
            }
        } catch (error) {
            this.showAlert('Error creating time activity: ' + error.message, 'error');
        }
    }
    
    generateTimeActivityPayload() {
        const currentDate = new Date().toISOString();
        
        // Use first employee if available
        const firstEmployee = this.employees.length > 0 ? this.employees[0] : null;
        
        return {
            "TxnDate": currentDate,
            "NameOf": "Employee",
            "EmployeeRef": { 
                "value": firstEmployee?.id || "1" 
            },
            "PayrollItemRef": { 
                "value": "626270109" 
            },
            "CustomerRef": { 
                "value": "2" 
            },
            "ProjectRef": { 
                "value": "416296152" 
            },
            "ItemRef": { 
                "value": "7" 
            },
            "Hours": 8,
            "Minutes": 0,
            "Description": "Time activity created from dashboard"
        };
    }
    
    async confirmTimeActivityCreation(payload) {
        return new Promise((resolve) => {
            // Create a confirmation modal
            const modalHtml = `
                <div class="modal fade" id="confirmModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Create Time Activity</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>Create a time activity with the following details:</p>
                                <ul>
                                    <li><strong>Date:</strong> ${new Date(payload.TxnDate).toLocaleString()}</li>
                                    <li><strong>Employee:</strong> ${payload.EmployeeRef.value}</li>
                                    <li><strong>Hours:</strong> ${payload.Hours}h ${payload.Minutes}m</li>
                                    <li><strong>Description:</strong> ${payload.Description}</li>
                                </ul>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="cancelCreate">Cancel</button>
                                <button type="button" class="btn btn-success" id="confirmCreate">Create Time Activity</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add modal to page
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
            
            // Bind events
            document.getElementById('confirmCreate').addEventListener('click', () => {
                modal.hide();
                document.getElementById('confirmModal').remove();
                resolve(true);
            });
            
            document.getElementById('cancelCreate').addEventListener('click', () => {
                modal.hide();
                document.getElementById('confirmModal').remove();
                resolve(false);
            });
            
            // Show modal
            modal.show();
        });
    }
    
    showPayload() {
        const payload = this.generateTimeActivityPayload();
        document.getElementById('payloadContent').textContent = JSON.stringify(payload, null, 2);
        
        const modal = new bootstrap.Modal(document.getElementById('payloadModal'));
        modal.show();
    }
    
    copyPayload() {
        const payloadText = document.getElementById('payloadContent').textContent;
        navigator.clipboard.writeText(payloadText).then(() => {
            this.showAlert('Payload copied to clipboard!', 'success');
        }).catch(() => {
            this.showAlert('Failed to copy payload', 'error');
        });
    }
    
    async executePayload() {
        try {
            const payloadText = document.getElementById('payloadContent').textContent;
            const payload = JSON.parse(payloadText);
            
            const response = await fetch('/api/setup/timeactivity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                this.showAlert('Time activity created successfully!', 'success');
                this.refreshData(); // Refresh the table
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('payloadModal'));
                modal.hide();
            } else {
                this.showAlert('Failed to create time activity: ' + (result.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            this.showAlert('Error executing API call: ' + error.message, 'error');
        }
    }
    
    
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.style.display = 'flex';
        } else {
            overlay.style.display = 'none';
        }
    }
    
    showAlert(message, type = 'info') {
        // Create a simple alert (you can enhance this with a proper toast system)
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
        alertDiv.style.position = 'fixed';
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.style.minWidth = '300px';
        
        alertDiv.innerHTML = `
            <strong>${type === 'error' ? 'Error!' : 'Info:'}</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
    
    // Utility functions
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    formatTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    formatHours(hours) {
        if (!hours || hours === 0) return '0h';
        if (hours < 1) {
            return `${Math.round(hours * 60)}m`;
        }
        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);
        return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`;
    }
    
    formatCurrency(amount) {
        if (!amount || amount === 0) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TimeActivitiesDashboard();
});
