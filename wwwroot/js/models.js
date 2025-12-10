// Data Models for QuickBooks Employee Compensation Setup Wizard

class Employee {
    constructor(data) {
        this.id = data.id || '';
        this.name = data.name || '';
        this.email = data.email || '';
        this.active = data.active || false;
    }

    static fromJson(json) {
        return new Employee(json);
    }

    toJson() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            active: this.active
        };
    }
}

class Compensation {
    constructor(data) {
        this.id = data.id || '';
        this.name = data.name || '';
        this.type = data.type || '';
        this.amount = data.amount || 0;
        this.active = data.active || false;
        this.billable = data.billable || false;
        this.hourlyRate = data.hourlyRate || 0;
    }

    static fromJson(json) {
        return new Compensation(json);
    }

    toJson() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            amount: this.amount,
            active: this.active,
            billable: this.billable,
            hourlyRate: this.hourlyRate
        };
    }

    getFormattedAmount() {
        if (this.type === CONSTANTS.COMPENSATION_TYPES.HOURLY) {
            return `Rate: ${UIUtils.formatCurrency(this.amount)}/hr`;
        } else if (this.type === CONSTANTS.COMPENSATION_TYPES.SALARY) {
            return `Monthly: ${UIUtils.formatCurrency(this.amount / 12)}`;
        }
        return `Amount: ${UIUtils.formatCurrency(this.amount)}`;
    }
}

class Project {
    constructor(data) {
        this.id = data.id || '';
        this.name = data.name || '';
        this.description = data.description || '';
        this.status = data.status || '';
        this.active = data.active || false;
        this.customerId = data.customerId || '';
        this.dueDate = data.dueDate || null;
        this.startDate = data.startDate || null;
        this.completedDate = data.completedDate || null;
    }

    static fromJson(json) {
        return new Project(json);
    }

    toJson() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            status: this.status,
            active: this.active,
            customerId: this.customerId,
            dueDate: this.dueDate,
            startDate: this.startDate,
            completedDate: this.completedDate
        };
    }

    getFormattedDates() {
        const dates = [];
        if (this.startDate) dates.push(`Start: ${UIUtils.formatDate(this.startDate)}`);
        if (this.dueDate) dates.push(`Due: ${UIUtils.formatDate(this.dueDate)}`);
        if (this.completedDate) dates.push(`Completed: ${UIUtils.formatDate(this.completedDate)}`);
        return dates.join(' | ');
    }
}

class Customer {
    constructor(data) {
        this.id = data.id || '';
        this.name = data.name || '';
        this.email = data.email || '';
        this.active = data.active || false;
    }

    static fromJson(json) {
        return new Customer(json);
    }

    toJson() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            active: this.active
        };
    }
}

class Item {
    constructor(data) {
        this.id = data.id || '';
        this.name = data.name || '';
        this.type = data.type || '';
        this.active = data.active || false;
    }

    static fromJson(json) {
        return new Item(json);
    }

    toJson() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            active: this.active
        };
    }
}

class TimeActivity {
    constructor(data) {
        this.employeeId = data.employeeId || '';
        this.projectId = data.projectId || '';
        this.customerId = data.customerId || '';
        this.itemId = data.itemId || '';
        this.date = data.date || new Date();
        this.hours = data.hours || 8;
        this.hourlyRate = data.hourlyRate || 0;
        this.description = data.description || '';
        this.billable = data.billable || true;
    }

    static fromJson(json) {
        return new TimeActivity(json);
    }

    toJson() {
        return {
            employeeId: this.employeeId,
            projectId: this.projectId,
            customerId: this.customerId,
            itemId: this.itemId,
            date: this.date,
            hours: this.hours,
            hourlyRate: this.hourlyRate,
            description: this.description,
            billable: this.billable
        };
    }
}

class ValidationResult {
    constructor(isValid = true, errors = []) {
        this.isValid = isValid;
        this.errors = errors;
    }

    addError(error) {
        this.isValid = false;
        this.errors.push(error);
    }

    static combine(results) {
        const combined = new ValidationResult();
        results.forEach(result => {
            if (!result.isValid) {
                combined.isValid = false;
                combined.errors.push(...result.errors);
            }
        });
        return combined;
    }
}

class ApiResponse {
    constructor(data) {
        this.success = data.success || false;
        this.data = data.data || null;
        this.errorMessage = data.errorMessage || null;
        this.validationErrors = data.validationErrors || [];
    }

    static fromJson(json) {
        return new ApiResponse(json);
    }

    toJson() {
        return {
            success: this.success,
            data: this.data,
            errorMessage: this.errorMessage,
            validationErrors: this.validationErrors
        };
    }
}
