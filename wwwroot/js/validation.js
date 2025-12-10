// Validation Service for QuickBooks Employee Compensation Setup Wizard

class ValidationService {
    static validateEmployee(employee) {
        const result = new ValidationResult();
        
        if (!employee.id) {
            result.addError('Employee ID is required');
        }
        if (!employee.name) {
            result.addError('Employee name is required');
        }
        
        return result;
    }

    static validateCompensation(compensation) {
        const result = new ValidationResult();
        
        if (!compensation.id) {
            result.addError('Compensation ID is required');
        }
        if (!compensation.name) {
            result.addError('Compensation name is required');
        }
        if (!compensation.type) {
            result.addError('Compensation type is required');
        }
        if (compensation.amount <= 0) {
            result.addError('Compensation amount must be greater than 0');
        }
        
        return result;
    }

    static validateProject(project) {
        const result = new ValidationResult();
        
        if (!project.id) {
            result.addError('Project ID is required');
        }
        if (!project.name) {
            result.addError('Project name is required');
        }
        if (!project.status) {
            result.addError('Project status is required');
        }
        if (!project.customerId) {
            result.addError('Project customer ID is required');
        }
        
        return result;
    }

    static validateCustomer(customer) {
        const result = new ValidationResult();
        
        if (!customer.id) {
            result.addError('Customer ID is required');
        }
        if (!customer.name) {
            result.addError('Customer name is required');
        }
        
        return result;
    }

    static validateItem(item) {
        const result = new ValidationResult();
        
        if (!item.id) {
            result.addError('Item ID is required');
        }
        if (!item.name) {
            result.addError('Item name is required');
        }
        if (!item.type) {
            result.addError('Item type is required');
        }
        
        return result;
    }

    static validateTimeActivity(timeActivity) {
        const result = new ValidationResult();
        
        if (!timeActivity.employeeId) {
            result.addError('Employee ID is required');
        }
        if (!timeActivity.projectId) {
            result.addError('Project ID is required');
        }
        if (!timeActivity.customerId) {
            result.addError('Customer ID is required');
        }
        if (!timeActivity.itemId) {
            result.addError('Item ID is required');
        }
        if (!timeActivity.date) {
            result.addError('Date is required');
        }
        if (timeActivity.hours <= 0) {
            result.addError('Hours must be greater than 0');
        }
        if (timeActivity.hourlyRate <= 0) {
            result.addError('Hourly rate must be greater than 0');
        }
        
        return result;
    }

    static validateDateRange(startDate, endDate) {
        const result = new ValidationResult();
        
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            if (isNaN(start.getTime())) {
                result.addError('Invalid start date');
            }
            if (isNaN(end.getTime())) {
                result.addError('Invalid end date');
            }
            if (start > end) {
                result.addError('Start date must be before end date');
            }
        }
        
        return result;
    }

    static validateProjectFilters(filters) {
        const result = new ValidationResult();
        
        // Validate start date range
        if (filters.startDateFrom1 || filters.startDateTo1) {
            const startDateResult = this.validateDateRange(filters.startDateFrom1, filters.startDateTo1);
            if (!startDateResult.isValid) {
                result.errors.push(...startDateResult.errors.map(e => `Start date range: ${e}`));
            }
        }
        
        // Validate due date range
        if (filters.dueDateFrom1 || filters.dueDateTo1) {
            const dueDateResult = this.validateDateRange(filters.dueDateFrom1, filters.dueDateTo1);
            if (!dueDateResult.isValid) {
                result.errors.push(...dueDateResult.errors.map(e => `Due date range: ${e}`));
            }
        }
        
        result.isValid = result.errors.length === 0;
        return result;
    }

    static validateSetupData(setupData) {
        const results = [];
        
        if (setupData.selectedEmployee) {
            results.push(this.validateEmployee(setupData.selectedEmployee));
        }
        if (setupData.selectedCompensation) {
            results.push(this.validateCompensation(setupData.selectedCompensation));
        }
        if (setupData.selectedProject) {
            results.push(this.validateProject(setupData.selectedProject));
        }
        if (setupData.selectedCustomer) {
            results.push(this.validateCustomer(setupData.selectedCustomer));
        }
        if (setupData.selectedItem) {
            results.push(this.validateItem(setupData.selectedItem));
        }
        
        return ValidationResult.combine(results);
    }
}
