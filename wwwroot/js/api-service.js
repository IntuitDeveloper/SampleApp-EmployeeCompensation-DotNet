// API Service for QuickBooks Employee Compensation Setup Wizard

// Create QB namespace if not exists
window.QB = window.QB || {};

// Only define ApiService if it doesn't exist
if (!window.QB.ApiService) {
    // Define ApiService class
    class ApiService {
    static async get(endpoint, options = {}) {
        try {
            let url = endpoint;
            
            // Handle query parameters
            if (options.params) {
                const searchParams = new URLSearchParams();
                Object.entries(options.params).forEach(([key, value]) => {
                    if (value !== null && value !== undefined && value !== '') {
                        searchParams.append(key, value);
                    }
                });
                if (searchParams.toString()) {
                    url += (endpoint.includes('?') ? '&' : '?') + searchParams.toString();
                }
            }
            
            console.log(`API GET request to: ${url}`);
            const response = await fetch(url);
            console.log(`API response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                throw new QB.ApiError('HTTP error', response.status, response);
            }
            const data = await response.json();
            console.log(`API response data:`, data);
            
            if (!data.success) {
                throw new QB.ApiError(data.errorMessage || 'API error', response.status, data);
            }
            return data;
        } catch (error) {
            console.error(`API GET error for ${url || endpoint}:`, error);
            if (error instanceof QB.ApiError) {
                QB.errorBoundary.handleApiError(error);
            } else {
                QB.errorBoundary.handleError(error);
            }
            throw error;
        }
    }

    static async post(endpoint, data) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new QB.ApiError('HTTP error', response.status, response);
            }
            const responseData = await response.json();
            if (!responseData.success) {
                throw new QB.ApiError(responseData.errorMessage || 'API error', response.status, responseData);
            }
            return responseData;
        } catch (error) {
            if (error instanceof QB.ApiError) {
                QB.errorBoundary.handleApiError(error);
            } else {
                QB.errorBoundary.handleError(error);
            }
            throw error;
        }
    }
    }

    // Export to QB namespace
    window.QB.ApiService = ApiService;
}
