// Utility functions for the QuickBooks Employee Compensation Setup Wizard

class UIUtils {
    static showAlert(message, type, duration = 5000) {
        const statusMessages = document.getElementById('statusMessages');
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'warning' ? 'exclamation-triangle' : 'times'}-circle"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        statusMessages.innerHTML = alertHtml;
        
        // Auto-dismiss after specified duration
        setTimeout(() => {
            const alert = statusMessages.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, duration);
    }

    static showLoadingIndicator(containerId, message = 'Loading...') {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'flex';
            container.innerHTML = `
                <div class="loading-spinner"></div>
                <span class="ms-2">${message}</span>
            `;
        }
    }

    static hideLoadingIndicator(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'none';
        }
    }

    static formatCurrency(amount, currency = 'USD') {
        if (amount == null) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    static formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static createCard(title, icon, content, headerClass = '') {
        return `
            <div class="card mb-3">
                <div class="card-header ${headerClass}">
                    <h6 class="mb-0"><i class="fas fa-${icon}"></i> ${title}</h6>
                </div>
                <div class="card-body">
                    ${content}
                </div>
            </div>
        `;
    }

    static createDataItem(item, isSelected, onClick, primaryText, secondaryText, badge) {
        return `
            <div class="data-item ${isSelected ? 'selected' : ''}" onclick="${onClick}('${item.id}')">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${primaryText}</strong><br>
                        <small class="text-muted">${secondaryText}</small>
                    </div>
                    <div>
                        ${badge ? `<span class="badge ${badge.class}">${badge.text}</span>` : ''}
                        ${isSelected ? '<i class="fas fa-check-circle text-success ms-2"></i>' : ''}
                    </div>
                </div>
            </div>
        `;
    }

    static createDateRangeInputs(id, label) {
        return `
            <div class="mb-3">
                <label class="form-label">${label}:</label>
                <div class="input-group">
                    <input type="date" class="form-control" id="${id}Date" value="">
                    <input type="time" class="form-control" id="${id}Time" value="00:00">
                </div>
            </div>
        `;
    }
}


