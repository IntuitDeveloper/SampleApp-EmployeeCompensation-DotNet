// Error Boundary for QuickBooks Employee Compensation Setup Wizard

// Create QB namespace if not exists
window.QB = window.QB || {};

// Custom Error Classes
window.QB.ValidationError = window.QB.ValidationError || class extends Error {
    constructor(message, validationErrors = []) {
        super(message);
        this.name = 'ValidationError';
        this.validationErrors = validationErrors;
    }
}

window.QB.ApiError = window.QB.ApiError || class extends Error {
    constructor(message, status, response = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.response = response;
    }
}

window.QB.GraphQLError = window.QB.GraphQLError || class extends Error {
    constructor(message, errors = [], response = null) {
        super(message);
        this.name = 'GraphQLError';
        this.errors = errors;
        this.response = response;
    }
}

window.QB.OAuthError = window.QB.OAuthError || class extends Error {
    constructor(message, code = null) {
        super(message);
        this.name = 'OAuthError';
        this.code = code;
    }
}

window.QB.ErrorBoundary = window.QB.ErrorBoundary || class {
    constructor() {
        this.errorHandlers = new Map();
        this.defaultHandler = (error) => {
            console.error('Unhandled error:', error);
            QB.eventBus?.publish(QB.EVENTS.UI_ERROR, error.message || 'An unexpected error occurred');
        };
    }

    init() {
        try {
            if (QB.eventBus && QB.EVENTS) {
                // Subscribe to error events
                QB.eventBus.subscribe(QB.EVENTS.API_ERROR, this.handleApiError.bind(this));
                window.addEventListener('error', this.handleGlobalError.bind(this));
                window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));

                // Register custom error handlers
                this.registerErrorHandler('ValidationError', (error) => {
                    const messages = error.validationErrors.map(err => `• ${err}`).join('\\n');
                    QB.eventBus.publish(QB.EVENTS.UI_ERROR, `Validation Error:\\n${messages}`);
                });

                this.registerErrorHandler('GraphQLError', (error) => {
                    const messages = error.errors.map(err => `• ${err.message || 'Unknown error'}`).join('\\n');
                    QB.eventBus.publish(QB.EVENTS.UI_ERROR, `GraphQL Error:\\n${messages}`);
                });

                this.registerErrorHandler('OAuthError', (error) => {
                    QB.eventBus.publish(QB.EVENTS.UI_ERROR, `Authentication Error: ${error.message}`);
                    if (error.code === 'token_expired') {
                        QB.eventBus.publish(QB.EVENTS.OAUTH_DISCONNECT);
                    }
                });
            } else {
                console.error('Required dependencies (eventBus, EVENTS) not available for ErrorBoundary initialization');
            }
        } catch (error) {
            console.error('Error initializing ErrorBoundary:', error);
        }
    }

    registerErrorHandler(errorType, handler) {
        this.errorHandlers.set(errorType, handler);
    }

    handleError(error, context = {}) {
        const errorType = error.constructor.name;
        const handler = this.errorHandlers.get(errorType) || this.defaultHandler;

        try {
            handler(error, context);
        } catch (handlerError) {
            console.error('Error in error handler:', handlerError);
            this.defaultHandler(error);
        }
    }

    handleApiError(error) {
        if (error.status === 401) {
            // Handle unauthorized error
            QB.eventBus.publish(QB.EVENTS.UI_ERROR, 'Your session has expired. Please log in again.');
            QB.eventBus.publish(QB.EVENTS.OAUTH_DISCONNECT);
        } else if (error.status === 403) {
            // Handle forbidden error
            QB.eventBus.publish(QB.EVENTS.UI_ERROR, 'You do not have permission to perform this action.');
        } else if (error.status === 404) {
            // Handle not found error
            QB.eventBus.publish(QB.EVENTS.UI_ERROR, 'The requested resource was not found.');
        } else if (error.status >= 500) {
            // Handle server errors
            QB.eventBus.publish(QB.EVENTS.UI_ERROR, 'A server error occurred. Please try again later.');
        } else {
            // Handle other API errors
            QB.eventBus.publish(QB.EVENTS.UI_ERROR, error.message || 'An API error occurred');
        }
    }

    handleGlobalError(event) {
        event.preventDefault();
        const error = event.error || new Error(event.message);
        this.handleError(error, { source: 'window.onerror' });
    }

    handleUnhandledRejection(event) {
        event.preventDefault();
        const error = event.reason;
        this.handleError(error, { source: 'unhandledrejection' });
    }
}

// Create singleton instance only if it doesn't exist
if (!window.QB.errorBoundary) {
    window.QB.errorBoundary = new window.QB.ErrorBoundary();
}