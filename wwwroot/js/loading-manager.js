// Loading State Manager for QuickBooks Employee Compensation Setup Wizard

// Export loading states to global namespace
window.QB = window.QB || {};
window.QB.LOADING_STATES = {
    OAUTH: 'oauth',
    EMPLOYEES: 'employees',
    COMPENSATIONS: 'compensations',
    PROJECTS: 'projects',
    CUSTOMERS: 'customers',
    ITEMS: 'items',
    TIME_ACTIVITY: 'timeActivity',
    PRE_CHECKS: 'preChecks'
};

class LoadingManager {
    constructor() {
        this.loadingStates = new Map();
        this.subscribers = new Map();
    }

    startLoading(key, message = 'Loading...') {
        this.loadingStates.set(key, {
            loading: true,
            message: message,
            startTime: Date.now()
        });
        this._notifySubscribers(key);
        LoadingUI.showLoadingIndicator(`${key}Loading`, message);
    }

    stopLoading(key) {
        this.loadingStates.set(key, {
            loading: false,
            message: '',
            startTime: null
        });
        this._notifySubscribers(key);
        LoadingUI.hideLoadingIndicator(`${key}Loading`);
    }

    isLoading(key) {
        const state = this.loadingStates.get(key);
        return state ? state.loading : false;
    }

    getMessage(key) {
        const state = this.loadingStates.get(key);
        return state ? state.message : '';
    }

    getLoadingDuration(key) {
        const state = this.loadingStates.get(key);
        if (!state || !state.startTime) return 0;
        return Date.now() - state.startTime;
    }

    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            const keySubscribers = this.subscribers.get(key);
            if (keySubscribers) {
                keySubscribers.delete(callback);
            }
        };
    }

    _notifySubscribers(key) {
        const state = this.loadingStates.get(key);
        const keySubscribers = this.subscribers.get(key);
        if (keySubscribers) {
            keySubscribers.forEach(callback => {
                try {
                    callback(state);
                } catch (error) {
                    console.error(`Error in loading state subscriber for ${key}:`, error);
                }
            });
        }
    }

    init() {
        try {
            // Subscribe to events
            if (QB.eventBus && QB.EVENTS) {
                QB.eventBus.subscribe(QB.EVENTS.DATA_LOADING, ({ key, message }) => {
                    this.startLoading(key, message);
                });

                QB.eventBus.subscribe(QB.EVENTS.DATA_LOADED, ({ key }) => {
                    this.stopLoading(key);
                });

                QB.eventBus.subscribe(QB.EVENTS.DATA_ERROR, ({ key }) => {
                    this.stopLoading(key);
                });
            } else {
                console.error('Required dependencies (eventBus, EVENTS) not available for LoadingManager initialization');
            }
        } catch (error) {
            console.error('Error initializing LoadingManager:', error);
        }
    }
}

// Export singleton instance to global namespace
window.QB = window.QB || {};
window.QB.loadingManager = new LoadingManager();

// Loading State UI Controller
class LoadingUI {
    static showLoadingIndicator(containerId, message) {
        const container = document.getElementById(containerId) || this._createLoadingContainer(containerId);
        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <span class="loading-text">${message}</span>
            </div>
        `;
        container.style.display = 'block';
    }

    static hideLoadingIndicator(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
    }

    static updateLoadingMessage(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            const textElement = container.querySelector('.loading-text');
            if (textElement) {
                textElement.textContent = message;
            }
        }
    }

    static showLoadingOverlay(message = 'Loading...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-overlay-content">
                <div class="loading-spinner"></div>
                <div class="loading-overlay-message">${message}</div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    static hideLoadingOverlay() {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    static _createLoadingContainer(containerId) {
        const container = document.createElement('div');
        container.id = containerId;
        container.className = 'loading-container-wrapper';
        document.body.appendChild(container);
        return container;
    }
}