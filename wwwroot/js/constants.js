// Constants for QuickBooks Employee Compensation Setup Wizard

// Create a global namespace for our app
window.QB = window.QB || {};

// Export events to global namespace
window.QB.EVENTS = {
    // UI Events
    UI_ERROR: 'ui:error',
    UI_SUCCESS: 'ui:success',
    UI_WARNING: 'ui:warning',
    UI_INFO: 'ui:info',
    UI_REFRESH: 'ui:refresh',

    // Data Events
    DATA_LOADING: 'data:loading',
    DATA_LOADED: 'data:loaded',
    DATA_ERROR: 'data:error',

    // OAuth Events
    OAUTH_SUCCESS: 'oauth:success',
    OAUTH_ERROR: 'oauth:error',
    OAUTH_DISCONNECT: 'oauth:disconnect',

    // Step Events
    STEP_CHANGE: 'step:change',
    STEP_COMPLETE: 'step:complete',
    STEP_ERROR: 'step:error'
};

// Export constants to global namespace
window.QB.CONSTANTS = {
    API_ENDPOINTS: {
        OAUTH_STATUS: '/api/oauth/status',
        OAUTH_AUTHORIZE: '/api/oauth/authorize',
        OAUTH_DISCONNECT: '/api/oauth/disconnect',
        EMPLOYEES: '/api/employeecompensation/employees',
        COMPENSATIONS: '/api/employeecompensation/compensation',
        PROJECTS: '/api/employeecompensation/projects',
        CUSTOMERS: '/api/employeecompensation/customers',
        ITEMS: '/api/employeecompensation/items',
        TIME_ACTIVITY: '/api/employeecompensation/timeactivity'
    },
    STATUS_TYPES: {
        SUCCESS: 'success',
        WARNING: 'warning',
        ERROR: 'danger',
        INFO: 'info'
    },
    COMPENSATION_TYPES: {
        HOURLY: 'HOURLY',
        SALARY: 'SALARY'
    },
    PROJECT_STATUS: {
        ACTIVE: 'ACTIVE',
        OPEN: 'OPEN',
        COMPLETE: 'COMPLETE',
        IN_PROGRESS: 'IN_PROGRESS'
    }
};
