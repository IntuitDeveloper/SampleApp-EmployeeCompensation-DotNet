// Event Bus for QuickBooks Employee Compensation Setup Wizard

class EventBus {
    constructor() {
        this.subscribers = new Map();
    }

    subscribe(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, new Set());
        }
        this.subscribers.get(event).add(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.subscribers.get(event);
            if (callbacks) {
                callbacks.delete(callback);
            }
        };
    }

    publish(event, data) {
        const callbacks = this.subscribers.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event subscriber for ${event}:`, error);
                }
            });
        }
    }
}

// Export singleton instance to global namespace
window.QB = window.QB || {};
window.QB.eventBus = new EventBus();