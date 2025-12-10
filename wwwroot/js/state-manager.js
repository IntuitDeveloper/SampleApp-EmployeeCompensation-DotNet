// State Manager for QuickBooks Employee Compensation Setup Wizard

// Create QB namespace if not exists
window.QB = window.QB || {};

// Only define StateManager if it doesn't exist
window.QB.StateManager = window.QB.StateManager || class {
    constructor() {
        this._state = {
            currentStep: 1,
            totalSteps: 8,
            oauth: null,
            preChecks: {},
            employees: [],
            compensations: [],
            projects: [],
            customers: [],
            items: [],
            selectedEmployee: null,
            selectedCompensation: null,
            selectedProject: null,
            selectedCustomer: null,
            selectedItems: []
        };
        this._listeners = [];
    }

    get state() {
        return { ...this._state };
    }

    setState(newState) {
        this._state = { ...this._state, ...newState };
        this._notifyListeners();
    }

    addListener(listener) {
        this._listeners.push(listener);
    }

    removeListener(listener) {
        this._listeners = this._listeners.filter(l => l !== listener);
    }

    _notifyListeners() {
        this._listeners.forEach(listener => listener(this.state));
    }

    clearState() {
        const authToken = this._state.oauth; // Preserve auth token
        this._state = {
            currentStep: 1,
            totalSteps: 8,
            oauth: authToken,
            preChecks: {},
            employees: [],
            compensations: [],
            projects: [],
            customers: [],
            items: [],
            selectedEmployee: null,
            selectedCompensation: null,
            selectedProject: null,
            selectedCustomer: null,
            selectedItems: []
        };
        this._notifyListeners();
    }
}

// Create singleton instance only if it doesn't exist
if (!window.QB.stateManager) {
    window.QB.stateManager = new window.QB.StateManager();
}
