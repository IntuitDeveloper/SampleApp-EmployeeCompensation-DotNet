// QuickBooks Employee Compensation Setup Wizard

// Create QB namespace if not exists
window.QB = window.QB || {};

// Only define SetupWizard if it doesn't exist
window.QB.SetupWizard = window.QB.SetupWizard || class {
    constructor(stateManager) {
        // Initialize properties
        this.stateManager = stateManager;
        this.currentStep = 1;
        this.totalSteps = 8;
        this.loadingManager = QB.loadingManager; // Use the singleton instance

        // Initialize immediately since dependencies should be available by now
        this.init();
    }

    // Navigation methods
    nextStep = () => {
        try {
            const currentStep = this.currentStep;
            if (currentStep < this.totalSteps && this.validateCurrentStep()) {
                this.loadStep(currentStep + 1);
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    prevStep = () => {
        try {
            const currentStep = this.currentStep;
            if (currentStep > 1) {
                this.loadStep(currentStep - 1);
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    validateCurrentStep() {
        const state = this.stateManager.state;
        switch (this.currentStep) {
            case 1: // Auth
                return state.oauth && state.oauth.isAuthenticated;
            case 2: // Pre-check
                return state.preChecks && state.preChecks.allChecksPassed;
            case 3: // Employee
                return state.selectedEmployee !== null;
            case 4: // Compensation
                return state.selectedCompensation !== null;
            case 5: // Project
                return state.selectedProject !== null;
            case 6: // Customer
                return state.selectedCustomer !== null;
            case 7: // Item
                return state.selectedItems && state.selectedItems.length > 0;
            default:
                return true;
        }
    }

    // OAuth handlers
    startOAuth = async () => {
        try {
            this.loadingManager.startLoading(QB.LOADING_STATES.OAUTH, 'Connecting to QuickBooks...');
            
            // First, get the authorization URL from the server
            const response = await QB.ApiService.get('/api/oauth/authorize');
            
            if (response.success && response.data.authorizationUrl) {
                // Open the QuickBooks authorization URL in a popup
                const width = 600;
                const height = 700;
                const left = (window.innerWidth - width) / 2;
                const top = (window.innerHeight - height) / 2;
                
                const authWindow = window.open(
                    response.data.authorizationUrl,
                    'QuickBooks OAuth',
                    `width=${width},height=${height},left=${left},top=${top}`
                );
                
                if (authWindow) {
                    authWindow.focus();
                    
                    // Listen for OAuth completion messages
                    const messageHandler = (event) => {
                        if (event.data.type === 'oauth_success') {
                            window.removeEventListener('message', messageHandler);
                            this.handleOAuthSuccess(event.data);
                            this.loadingManager.stopLoading(QB.LOADING_STATES.OAUTH);
                        } else if (event.data.type === 'oauth_error') {
                            window.removeEventListener('message', messageHandler);
                            this.handleOAuthError(event.data.error);
                            this.loadingManager.stopLoading(QB.LOADING_STATES.OAUTH);
                        }
                    };
                    
                    window.addEventListener('message', messageHandler);
                    
                    // Check if popup was closed without completing OAuth
                    const checkClosed = setInterval(() => {
                        if (authWindow.closed) {
                            clearInterval(checkClosed);
                            window.removeEventListener('message', messageHandler);
                            this.loadingManager.stopLoading(QB.LOADING_STATES.OAUTH);
                        }
                    }, 1000);
                }
            } else {
                throw new Error(response.errorMessage || 'Failed to get authorization URL');
            }
        } catch (error) {
            this.loadingManager.stopLoading(QB.LOADING_STATES.OAUTH);
            this.handleError(error);
        }
    }

    disconnectAuth = () => {
        try {
            this.loadingManager.startLoading(QB.LOADING_STATES.OAUTH, 'Disconnecting from QuickBooks...');
            QB.ApiService.post('/api/oauth/disconnect')
                .then(() => {
                    this.stateManager.setState({ oauth: null });
                    this.loadAuthStep();
                })
                .catch(error => QB.errorBoundary.handleError(error))
                .finally(() => this.loadingManager.stopLoading(QB.LOADING_STATES.OAUTH));
        } catch (error) {
            this.handleError(error);
        }
    }

    handleOAuthSuccess = (data) => {
        try {
            this.stateManager.setState({ oauth: data });
            this.loadAuthStep();
        } catch (error) {
            this.handleError(error);
        }
    }

    handleOAuthError = (error) => {
        QB.errorBoundary.handleError(error);
    }

    // State management
    handleStateChange = (state) => {
        try {
            this.updateProgress(state.currentStep, state.totalSteps);
            this.updateNavigation(state.currentStep, state.totalSteps, state.selectedEmployee);
        } catch (error) {
            this.handleError(error);
        }
    }

    updateProgress(currentStep, totalSteps) {
        try {
            const percent = (currentStep / totalSteps) * 100;
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            
            if (progressBar) {
                progressBar.style.width = `${percent}%`;
                progressBar.setAttribute('aria-valuenow', percent);
            }
            
            if (progressText) {
                progressText.textContent = `Step ${currentStep} of ${totalSteps}`;
            }

            // Update step indicators
            for (let i = 1; i <= totalSteps; i++) {
                const stepCircle = document.getElementById(`step${i}`);
                if (stepCircle) {
                    stepCircle.className = 'step-circle';
                    
                    if (i < currentStep) {
                        stepCircle.classList.add('completed');
                    } else if (i === currentStep) {
                        stepCircle.classList.add('active');
                    }
                }
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    updateNavigation(currentStep, totalSteps, selectedEmployee) {
        try {
            const nextBtn = document.getElementById('nextBtn');
            const prevBtn = document.getElementById('prevBtn');
            
            if (nextBtn) {
                nextBtn.disabled = !this.validateCurrentStep();
                
                if (currentStep === totalSteps) {
                    nextBtn.innerHTML = '<i class="fas fa-check"></i> Complete Setup';
                } else {
                    nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
                }
            }
            
            if (prevBtn) {
                prevBtn.disabled = currentStep === 1;
            }

            // Show warning on employee step if no employee selected
            if (currentStep === 3 && !selectedEmployee) {
                this.showEmployeeMessage('Please select an employee to continue.', 'warning');
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    // Error handling method
    handleError(error) {
        console.error('SetupWizard error:', error);
        if (QB.errorBoundary && QB.errorBoundary.handleError) {
            QB.errorBoundary.handleError(error);
        } else {
            // Fallback error handling
            console.error('Error boundary not available, using fallback:', error);
            if (window.UIUtils && window.UIUtils.showAlert) {
                UIUtils.showAlert(error.message || 'An error occurred', 'danger');
            }
        }
    }

    init() {
        try {
            // Check for URL parameters to set initial step
            const urlParams = new URLSearchParams(window.location.search);
            const stepParam = urlParams.get('step');
            
            if (stepParam && !isNaN(stepParam)) {
                this.currentStep = Math.max(1, Math.min(8, parseInt(stepParam)));
                // Clear state when jumping to a specific step from dashboard
                if (this.currentStep > 1) {
                    this.stateManager.clearState();
                }
            }
            
            // Set initial state
            this.stateManager.setState({
                currentStep: this.currentStep,
                totalSteps: this.totalSteps,
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
                selectedItem: null
            });

            // Bind events and load first step
            this.bindEvents();
            this.loadStep(1);
        } catch (error) {
            this.handleError(error);
        }
    }

    loadStep(step) {
        try {
            this.currentStep = step;
            this.stateManager.setState({ currentStep: step });

            // Clear previous step content
            const container = document.getElementById('stepContent');
            if (!container) return;

            container.innerHTML = '';
            container.classList.add('fade-in');

            // Load appropriate step
            switch (step) {
                case 1:
                    this.loadAuthStep();
                    break;
                case 2:
                    this.loadPreCheckStep();
                    break;
                case 3:
                    this.loadEmployeeStep();
                    break;
                case 4:
                    this.loadCompensationStep();
                    break;
                case 5:
                    this.loadProjectStep();
                    break;
                case 6:
                    this.loadCustomerStep();
                    break;
                case 7:
                    this.loadItemStep();
                    break;
                case 8:
                    this.loadTimeActivityStep();
                    break;
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    bindEvents() {
        try {
            // Add event listeners for navigation
            const nextBtn = document.getElementById('nextBtn');
            const prevBtn = document.getElementById('prevBtn');
            const downloadBtn = document.getElementById('downloadResults');

            // Navigation handlers
            if (nextBtn) {
                nextBtn.addEventListener('click', this.nextStep);
            }

            if (prevBtn) {
                prevBtn.addEventListener('click', this.prevStep);
            }

            if (downloadBtn) {
                downloadBtn.addEventListener('click', this.downloadResults);
            }

            // Listen for OAuth success messages from popup
            window.addEventListener('message', (event) => {
                if (event.data.type === 'oauth_success') {
                    this.handleOAuthSuccess(event.data);
                } else if (event.data.type === 'oauth_error') {
                    this.handleOAuthError(event.data);
                }
            });

            // Listen for state changes
            this.stateManager.addListener(this.handleStateChange);

            // Listen for UI events (with safety checks)
            if (QB.eventBus && QB.EVENTS) {
                QB.eventBus.subscribe(QB.EVENTS.UI_REFRESH, () => this.loadStep(this.currentStep));
            } else {
                console.error('EventBus or EVENTS not available for UI event subscription');
            }

            // Add error boundary (with safety checks)
            window.onerror = (message, source, lineno, colno, error) => {
                if (QB.errorBoundary && QB.errorBoundary.handleError) {
                    QB.errorBoundary.handleError(error || message);
                } else {
                    console.error('Error boundary not available:', error || message);
                }
                return true;
            };

            window.addEventListener('unhandledrejection', (event) => {
                if (QB.errorBoundary && QB.errorBoundary.handleError) {
                    QB.errorBoundary.handleError(event.reason);
                } else {
                    console.error('Error boundary not available for unhandled rejection:', event.reason);
                }
            });
        } catch (error) {
            this.handleError(error);
        }
    }

    // Step loading methods
    loadAuthStep() {
        try {
            const container = document.getElementById('stepContent');
            if (!container) return;

            if (this.loadingManager && QB.LOADING_STATES) {
                this.loadingManager.startLoading(QB.LOADING_STATES.OAUTH, 'Checking authentication status...');
            } else {
                console.error('LoadingManager or LOADING_STATES not available');
            }
            
            QB.ApiService.get('/api/oauth/status')
                .then(response => {
                    const template = response.data.isAuthenticated
                        ? templates.authConnected
                        : templates.authDisconnected;
                    
                    container.innerHTML = template;
                    
                    // Populate connection information if authenticated
                    if (response.data.isAuthenticated) {
                        this.populateConnectionInfo(response.data);
                    }
                    
                    // Add event listeners
                    const connectBtn = document.getElementById('connectBtn');
                    const disconnectBtn = document.getElementById('disconnectBtn');
                    
                    if (connectBtn) {
                        connectBtn.addEventListener('click', this.startOAuth);
                    }
                    
                    if (disconnectBtn) {
                        disconnectBtn.addEventListener('click', this.disconnectAuth);
                    }
                    
                    this.stateManager.setState({ oauth: response.data });
                })
                .catch(error => QB.errorBoundary.handleError(error))
                .finally(() => this.loadingManager.stopLoading(QB.LOADING_STATES.OAUTH));
        } catch (error) {
            this.handleError(error);
        }
    }

    // Populate connection information in the auth connected template
    populateConnectionInfo(authData) {
        try {
            // Update company name
            const companyNameEl = document.getElementById('companyName');
            if (companyNameEl && authData.companyName) {
                companyNameEl.textContent = authData.companyName;
            } else if (companyNameEl) {
                companyNameEl.textContent = 'QuickBooks Company';
            }

            // Update realm ID
            const realmIdEl = document.getElementById('realmId');
            if (realmIdEl && authData.realmId) {
                realmIdEl.textContent = `ID: ${authData.realmId}`;
            } else if (realmIdEl) {
                realmIdEl.textContent = 'Connected';
            }

            // Update connection time
            const connectionTimeEl = document.getElementById('connectionTime');
            if (connectionTimeEl) {
                const now = new Date();
                connectionTimeEl.textContent = now.toLocaleString();
            }
        } catch (error) {
            console.warn('Error populating connection info:', error);
        }
    }

    loadPreCheckStep() {
        try {
            const container = document.getElementById('stepContent');
            if (!container) {
                console.error('stepContent container not found');
                return;
            }

            console.log('Loading precheck step...');
            
            // Show the precheck template immediately
            container.innerHTML = templates.preCheck;
            console.log('Precheck template loaded');
            
            // Start the progressive precheck sequence
            this.startProgressivePrecheck();
        } catch (error) {
            console.error('Exception in loadPreCheckStep:', error);
            this.handleError(error);
        }
    }

    // Start progressive precheck sequence
    startProgressivePrecheck() {
        console.log('🚀 Starting progressive precheck sequence...');
        
        // Start with Projects check
        setTimeout(() => {
            this.performProjectsCheck();
        }, 500);
    }

    // Perform Projects check
    async performProjectsCheck() {
        console.log('📋 Starting Projects check...');
        
        try {
            const response = await fetch('/api/setup/precheck/projects');
            const data = await response.json();
            
            if (data.success) {
                const isEnabled = data.data.projectsEnabled;
                const message = isEnabled ? 'Projects are enabled and ready to use' : 'Projects feature is not enabled in QuickBooks';
                this.updateCheckItem('projectsCheck', isEnabled, 'Projects Feature', message);
                console.log(`✅ Projects check completed: ${isEnabled}`);
            } else {
                this.updateCheckItem('projectsCheck', false, 'Projects Feature', 'Error checking projects status');
                console.error('❌ Projects check failed:', data.errorMessage);
            }
        } catch (error) {
            console.error('❌ Projects check error:', error);
            this.updateCheckItem('projectsCheck', false, 'Projects Feature', 'Error checking projects status');
        }
        
        // Move to Time Tracking check
        setTimeout(() => {
            this.performTimeTrackingCheck();
        }, 800);
    }

    // Perform Time Tracking check
    async performTimeTrackingCheck() {
        console.log('⏰ Starting Time Tracking check...');
        
        try {
            const response = await fetch('/api/setup/precheck/timetracking');
            const data = await response.json();
            
            if (data.success) {
                const isEnabled = data.data.timeTrackingEnabled;
                const message = isEnabled ? 'Time tracking is enabled and available' : 'Time tracking feature is not enabled in QuickBooks';
                this.updateCheckItem('timeTrackingCheck', isEnabled, 'Time Tracking', message);
                console.log(`✅ Time Tracking check completed: ${isEnabled}`);
            } else {
                this.updateCheckItem('timeTrackingCheck', false, 'Time Tracking', 'Error checking time tracking status');
                console.error('❌ Time Tracking check failed:', data.errorMessage);
            }
        } catch (error) {
            console.error('❌ Time Tracking check error:', error);
            this.updateCheckItem('timeTrackingCheck', false, 'Time Tracking', 'Error checking time tracking status');
        }
        
        // Move to Preferences check
        setTimeout(() => {
            this.performPreferencesCheck();
        }, 800);
    }

    // Perform Preferences check
    async performPreferencesCheck() {
        console.log('⚙️ Starting Preferences check...');
        
        try {
            const response = await fetch('/api/setup/precheck/preferences');
            const data = await response.json();
            
            if (data.success) {
                const isAccessible = data.data.preferencesAccessible;
                const message = isAccessible ? 'System preferences are accessible' : 'Unable to access QuickBooks preferences';
                this.updateCheckItem('preferencesCheck', isAccessible, 'Preferences Access', message);
                console.log(`✅ Preferences check completed: ${isAccessible}`);
            } else {
                this.updateCheckItem('preferencesCheck', false, 'Preferences Access', 'Error checking preferences accessibility');
                console.error('❌ Preferences check failed:', data.errorMessage);
            }
        } catch (error) {
            console.error('❌ Preferences check error:', error);
            this.updateCheckItem('preferencesCheck', false, 'Preferences Access', 'Error checking preferences accessibility');
        }
        
        // Show final summary and get complete results
        setTimeout(() => {
            this.performCompletePrecheck();
        }, 800);
    }

    // Perform complete precheck and store results
    async performCompletePrecheck() {
        console.log('🔄 Getting complete precheck results...');
        
        try {
            const response = await fetch('/api/setup/precheck');
            const data = await response.json();
            
            if (data.success) {
                const precheckData = data.data;
                console.log('📊 Complete precheck results:', precheckData);
                
                // Store the actual results
                this.stateManager.setState({ 
                    preChecks: {
                        projectsEnabled: precheckData.projectsEnabled,
                        timeTrackingEnabled: precheckData.timeTrackingEnabled,
                        preferencesAccessible: precheckData.preferencesAccessible,
                        allChecksPassed: precheckData.allChecksPassed
                    }
                });
                
                // Show summary with actual results
                this.showPrecheckSummary(precheckData.allChecksPassed);
                console.log('🎉 All precheck stages completed with real API data');
            } else {
                console.error('❌ Complete precheck failed:', data.errorMessage);
                this.showPrecheckSummary(false);
            }
        } catch (error) {
            console.error('❌ Complete precheck error:', error);
            this.showPrecheckSummary(false);
        }
    }

    // Update precheck results in the UI
    updatePrecheckResults(data) {
        try {
            console.log('🔄 Updating precheck results with data:', data);
            
            // Update Projects Check
            console.log('📋 Updating Projects Check:', data.projectsEnabled);
            this.updateCheckItem('projectsCheck', data.projectsEnabled, 
                'Projects Feature', 'Projects are enabled and ready to use');
            
            // Update Time Tracking Check
            console.log('⏰ Updating Time Tracking Check:', data.timeTrackingEnabled);
            this.updateCheckItem('timeTrackingCheck', data.timeTrackingEnabled, 
                'Time Tracking', 'Time tracking is available');
            
            // Update Preferences Check
            console.log('⚙️ Updating Preferences Check:', data.preferencesAccessible);
            this.updateCheckItem('preferencesCheck', data.preferencesAccessible, 
                'Preferences Access', 'System preferences are accessible');
            
            // Show summary
            console.log('📊 Showing summary, all passed:', data.allChecksPassed);
            this.showPrecheckSummary(data.allChecksPassed);
            
            console.log('✅ Precheck results update completed successfully');
            
        } catch (error) {
            console.error('❌ Error updating precheck results:', error);
        }
    }

    // Update individual check item
    updateCheckItem(itemId, passed, title, successMessage) {
        console.log(`Updating check item: ${itemId}, passed: ${passed}`);
        
        const item = document.getElementById(itemId);
        if (!item) {
            console.error(`Check item not found: ${itemId}`);
            return;
        }

        const icon = item.querySelector('i');
        const statusBadge = item.querySelector('.status-badge');
        const smallText = item.querySelector('small');

        if (!icon || !statusBadge || !smallText) {
            console.error(`Missing elements in check item ${itemId}:`, {
                icon: !!icon,
                statusBadge: !!statusBadge,
                smallText: !!smallText
            });
            return;
        }

        if (passed) {
            icon.className = 'fas fa-check-circle text-success me-3';
            statusBadge.innerHTML = '<span class="badge bg-success">✓ Passed</span>';
            smallText.textContent = successMessage;
            item.classList.add('border-success');
            item.classList.remove('border-danger', 'border-warning');
        } else {
            icon.className = 'fas fa-times-circle text-danger me-3';
            statusBadge.innerHTML = '<span class="badge bg-danger">✗ Failed</span>';
            smallText.textContent = 'This feature needs to be enabled in QuickBooks';
            item.classList.add('border-danger');
            item.classList.remove('border-success', 'border-warning');
        }
        
        console.log(`Successfully updated check item: ${itemId}`);
    }

    // Show precheck summary
    showPrecheckSummary(allPassed) {
        const summary = document.getElementById('precheckSummary');
        const alert = document.getElementById('summaryAlert');
        const icon = alert.querySelector('.summary-icon');
        const title = alert.querySelector('.summary-title');
        const text = alert.querySelector('.summary-text');

        if (allPassed) {
            alert.className = 'alert alert-success';
            icon.className = 'fas fa-check-circle text-success';
            title.textContent = 'All Pre-checks Passed!';
            text.textContent = 'Your QuickBooks account is properly configured. You can continue with the setup.';
        } else {
            alert.className = 'alert alert-warning';
            icon.className = 'fas fa-exclamation-triangle text-warning';
            title.textContent = 'Some Pre-checks Failed';
            text.textContent = 'Please enable the required features in your QuickBooks settings before continuing.';
        }

        summary.style.display = 'block';
    }

    // Handle precheck errors
    updatePrecheckError(error) {
        const items = ['projectsCheck', 'timeTrackingCheck', 'preferencesCheck'];
        items.forEach(itemId => {
            const item = document.getElementById(itemId);
            if (item) {
                const icon = item.querySelector('i');
                const statusBadge = item.querySelector('.status-badge');
                const smallText = item.querySelector('small');
                
                icon.className = 'fas fa-exclamation-circle text-warning me-3';
                statusBadge.innerHTML = '<span class="badge bg-warning">Error</span>';
                smallText.textContent = 'Unable to verify this feature';
                item.classList.add('border-warning');
            }
        });

        // Show error summary
        const summary = document.getElementById('precheckSummary');
        const alert = document.getElementById('summaryAlert');
        const icon = alert.querySelector('.summary-icon');
        const title = alert.querySelector('.summary-title');
        const text = alert.querySelector('.summary-text');

        alert.className = 'alert alert-danger';
        icon.className = 'fas fa-times-circle text-danger';
        title.textContent = 'Pre-check Error';
        text.textContent = 'Unable to complete system verification. Please check your connection and try again.';

        summary.style.display = 'block';
    }

    loadEmployeeStep() {
        try {
            const container = document.getElementById('stepContent');
            if (!container) return;

            // Render the employee template
            container.innerHTML = templates.employeeList;
            
            // Initialize pagination state
            this.currentEmployeePage = 1;
            this.employeesPerPage = 10;
            
            // Load first page
            this.loadEmployeePage(1);
            
            // Disable next button initially
            this.updateNextButtonState(false);
            
        } catch (error) {
            this.handleError(error);
        }
    }

    loadEmployeePage(page = 1) {
        try {
            this.currentEmployeePage = page;
            
            QB.ApiService.get(`/api/setup/employees?page=${page}&pageSize=${this.employeesPerPage}`)
                .then(response => {
                    const { employees, pagination } = response.data;
                    
                    // Update employee list
                    const container = document.getElementById('employeeListContainer');
                    if (container) {
                        const state = this.stateManager.state;
                        const selectedEmployeeId = state.selectedEmployee?.id;
                        
                        container.innerHTML = templates.employeeListContainer(employees, selectedEmployeeId);
                        
                        // Bind click events to employee cards
                        this.bindEmployeeCardEvents();
                    }
                    
                    // Update pagination
                    this.updateEmployeePagination(pagination);
                    
                    // Store current page data
                    this.stateManager.setState({ 
                        currentEmployees: employees,
                        employeePagination: pagination
                    });
                    
                })
                .catch(error => {
                    const container = document.getElementById('employeeListContainer');
                    if (container) {
                        container.innerHTML = templates.error('Failed to load employees. Please try again.');
                    }
                    QB.errorBoundary.handleError(error);
                });
        } catch (error) {
            this.handleError(error);
        }
    }

    bindEmployeeCardEvents() {
        // Bind radio button change events
        const radioButtons = document.querySelectorAll('.employee-radio');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectEmployee(e.target.value);
                }
            });
        });
        
        // Bind card click events (clicking anywhere on the card selects the employee)
        const employeeCards = document.querySelectorAll('.employee-card');
        employeeCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on the radio button directly
                if (e.target.type !== 'radio') {
                    const employeeId = card.dataset.employeeId;
                    const radioButton = card.querySelector('.employee-radio');
                    if (radioButton && employeeId) {
                        radioButton.checked = true;
                        this.selectEmployee(employeeId);
                    }
                }
            });
        });
    }

    selectEmployee(employeeId) {
        try {
            const state = this.stateManager.state;
            const currentEmployees = state.currentEmployees || [];
            const selectedEmployee = currentEmployees.find(emp => emp.id === employeeId);
            
            if (selectedEmployee) {
                // Update state
                this.stateManager.setState({ selectedEmployee });
                
                // Update UI
                this.updateEmployeeSelection(employeeId);
                
                // Clear any warning messages
                this.clearEmployeeMessages();
                
                // Enable next button
                this.updateNextButtonState(true);
                
                console.log('Employee selected:', selectedEmployee);
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    updateEmployeeSelection(selectedEmployeeId) {
        // Remove previous selection styling
        document.querySelectorAll('.employee-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection styling to the selected card
        const selectedCard = document.querySelector(`[data-employee-id="${selectedEmployeeId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
    }

    updateEmployeePagination(pagination) {
        const paginationContainer = document.getElementById('employeePaginationContainer');
        const paginationList = document.getElementById('employeePagination');
        const paginationInfo = document.getElementById('employeePaginationInfo');
        
        if (pagination.totalPages > 1) {
            paginationContainer.style.display = 'block';
            
            // Update pagination buttons
            if (paginationList) {
                paginationList.innerHTML = templates.pagination(pagination);
                
                // Bind pagination click events
                paginationList.addEventListener('click', (e) => {
                    e.preventDefault();
                    const pageLink = e.target.closest('[data-page]');
                    if (pageLink) {
                        const page = parseInt(pageLink.dataset.page);
                        if (page && page !== this.currentEmployeePage) {
                            this.loadEmployeePage(page);
                        }
                    }
                });
            }
            
            // Update pagination info
            if (paginationInfo) {
                paginationInfo.innerHTML = templates.paginationInfo(pagination);
            }
        } else {
            paginationContainer.style.display = 'none';
        }
    }

    updateNextButtonState(enabled) {
        const nextButton = document.querySelector('.btn-primary[onclick*="nextStep"]');
        if (nextButton) {
            nextButton.disabled = !enabled;
            if (enabled) {
                nextButton.classList.remove('btn-secondary');
                nextButton.classList.add('btn-primary');
            } else {
                nextButton.classList.remove('btn-primary');
                nextButton.classList.add('btn-secondary');
            }
        }
    }

    loadCompensationStep() {
        try {
            const container = document.getElementById('stepContent');
            if (!container) return;

            const state = this.stateManager.state;
            if (!state.selectedEmployee) {
                container.innerHTML = templates.error('Please select an employee first');
                return;
            }

            this.loadingManager.startLoading(QB.LOADING_STATES.COMPENSATIONS, 'Loading compensation details...');
            
            // Use the new GraphQL endpoint for employee compensation
            const requestData = {
                filter: {
                    employeeId: state.selectedEmployee.id,
                    active: true
                },
                first: 10,
                after: null
            };

            QB.ApiService.post('/api/setup/employee-compensation/query', requestData)
                .then(response => {
                    container.innerHTML = templates.compensationList;
                    
                    const listContainer = document.getElementById('compensationListContainer');
                    if (listContainer && response.data && response.data.nodes) {
                        // Get initially selected compensations (active ones)
                        const initiallySelected = response.data.nodes.filter(c => c.active === true);
                        const selectedIds = initiallySelected.map(c => c.id);
                        
                        // Render compensation cards
                        listContainer.innerHTML = templates.compensationListContainer(response.data.nodes, selectedIds);
                        
                        // Bind events to compensation cards
                        this.bindCompensationCardEvents();
                        
                        // Set initial state
                        this.stateManager.setState({ selectedCompensation: initiallySelected });
                        this.updateNextButtonState(initiallySelected.length > 0);
                    }
                    
                    // Store all compensations in state
                    this.stateManager.setState({ 
                        compensations: response.data ? response.data.nodes : [] 
                    });
                })
                .catch(error => {
                    console.error('Error loading compensations:', error);
                    container.innerHTML = templates.error('Failed to load compensation details. Please try again.');
                    QB.errorBoundary.handleError(error);
                })
                .finally(() => this.loadingManager.stopLoading(QB.LOADING_STATES.COMPENSATIONS));
        } catch (error) {
            this.handleError(error);
        }
    }

    bindCompensationCardEvents() {
        // Bind checkbox change events
        const checkboxes = document.querySelectorAll('.compensation-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.updateCompensationSelection();
            });
        });
        
        // Bind card click events (clicking anywhere on the card toggles the checkbox)
        const compensationCards = document.querySelectorAll('.compensation-card');
        compensationCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on the checkbox directly
                if (e.target.type !== 'checkbox') {
                    const checkbox = card.querySelector('.compensation-checkbox');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        this.updateCompensationSelection();
                    }
                }
            });
        });
    }

    updateCompensationSelection() {
        try {
            const state = this.stateManager.state;
            const compensations = state.compensations || [];
            
            // Get selected checkbox values
            const selectedValues = Array.from(document.querySelectorAll('.compensation-checkbox:checked')).map(cb => cb.value);
            const selectedCompensations = compensations.filter(c => selectedValues.includes(c.id));
            
            // Update state
            this.stateManager.setState({ selectedCompensation: selectedCompensations });
            
            // Update card styling
            this.updateCompensationCardStyling(selectedValues);
            
            // Enable/disable next button
            this.updateNextButtonState(selectedCompensations.length > 0);
            
            console.log('Compensations selected:', selectedCompensations);
        } catch (error) {
            this.handleError(error);
        }
    }

    updateCompensationCardStyling(selectedIds) {
        // Remove previous selection styling
        document.querySelectorAll('.compensation-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection styling to selected cards
        selectedIds.forEach(id => {
            const card = document.querySelector(`[data-compensation-id="${id}"]`);
            if (card) {
                card.classList.add('selected');
            }
        });
    }

    loadProjectStep() {
        try {
            const container = document.getElementById('stepContent');
            if (!container) return;

            container.innerHTML = templates.projectFilters;
            
            const applyFilters = () => {
                const startDateFrom = document.getElementById('startDateFrom')?.value;
                const startDateTo = document.getElementById('startDateTo')?.value;
                const dueDateFrom = document.getElementById('dueDateFrom')?.value;
                const dueDateTo = document.getElementById('dueDateTo')?.value;
                
                // Require at least one date range
                const hasStartDateRange = startDateFrom || startDateTo;
                const hasDueDateRange = dueDateFrom || dueDateTo;
                
                if (!hasStartDateRange && !hasDueDateRange) {
                    UIUtils.showAlert('Please specify at least one date range to filter projects.', 'warning');
                    return;
                }
                
                this.loadingManager.startLoading(QB.LOADING_STATES.PROJECTS, 'Loading projects with date filters...');
                
                // Build query parameters for the API
                const params = {};
                if (startDateFrom) params.startDateFrom1 = startDateFrom;
                if (startDateTo) params.startDateTo1 = startDateTo;
                if (dueDateFrom) params.dueDateFrom1 = dueDateFrom;
                if (dueDateTo) params.dueDateTo1 = dueDateTo;
                
                QB.ApiService.get('/api/setup/projects', { params })
                    .then(response => {
                        const cardsContainer = document.getElementById('projectCardsContainer');
                        const container = document.getElementById('projectListContainer');
                        
                        if (cardsContainer && container) {
                            if (response.data && response.data.length > 0) {
                                // Render project cards
                                cardsContainer.innerHTML = templates.projectListContainer(response.data);
                                
                                // Show the project list
                                container.style.display = 'block';
                                
                                // Bind events to project cards
                                this.bindProjectCardEvents();
                                
                                UIUtils.showAlert(`Found ${response.data.length} projects matching your criteria.`, 'success');
                            } else {
                                cardsContainer.innerHTML = '<div class="text-center py-4"><p class="text-muted">No projects found for the specified date range.</p></div>';
                                container.style.display = 'block';
                                UIUtils.showAlert('No projects found for the specified date range. Try adjusting your filters.', 'info');
                            }
                        }
                        
                        this.stateManager.setState({ projects: response.data || [] });
                    })
                    .catch(error => {
                        console.error('Error loading projects:', error);
                        UIUtils.showAlert('Failed to load projects. Please try again.', 'error');
                        QB.errorBoundary.handleError(error);
                    })
                    .finally(() => this.loadingManager.stopLoading(QB.LOADING_STATES.PROJECTS));
            };
            
            const clearFilters = () => {
                document.getElementById('startDateFrom').value = '';
                document.getElementById('startDateTo').value = '';
                document.getElementById('dueDateFrom').value = '';
                document.getElementById('dueDateTo').value = '';
                
                const container = document.getElementById('projectListContainer');
                if (container) {
                    container.style.display = 'none';
                }
                
                this.stateManager.setState({ projects: [], selectedProject: null });
                this.updateNextButtonState(false);
            };
            
            // Add event listeners
            const filterBtn = document.getElementById('applyFilters');
            const clearBtn = document.getElementById('clearFilters');
            
            if (filterBtn) {
                filterBtn.addEventListener('click', applyFilters);
            }
            
            if (clearBtn) {
                clearBtn.addEventListener('click', clearFilters);
            }
            
            // Set default date ranges (last 30 days to next 365 days)
            const today = new Date();
            const pastDate = new Date(today);
            pastDate.setDate(pastDate.getDate() - 30);
            const futureDate = new Date(today);
            futureDate.setDate(futureDate.getDate() + 365);
            
            document.getElementById('dueDateFrom').value = pastDate.toISOString().split('T')[0];
            document.getElementById('dueDateTo').value = futureDate.toISOString().split('T')[0];
            
        } catch (error) {
            this.handleError(error);
        }
    }

    bindProjectCardEvents() {
        // Bind radio button change events
        const radioButtons = document.querySelectorAll('.project-radio');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectProject(e.target.value);
                }
            });
        });
        
        // Bind card click events (clicking anywhere on the card selects the project)
        const projectCards = document.querySelectorAll('.project-card');
        projectCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on the radio button directly
                if (e.target.type !== 'radio') {
                    const projectId = card.dataset.projectId;
                    const radioButton = card.querySelector('.project-radio');
                    if (radioButton && projectId) {
                        radioButton.checked = true;
                        this.selectProject(projectId);
                    }
                }
            });
        });
    }

    selectProject(projectId) {
        try {
            const state = this.stateManager.state;
            const currentProjects = state.projects || [];
            const selectedProject = currentProjects.find(proj => proj.id === projectId);
            
            if (selectedProject) {
                // Update state
                this.stateManager.setState({ selectedProject });
                
                // Update UI
                this.updateProjectSelection(projectId);
                
                // Enable next button
                this.updateNextButtonState(true);
                
                console.log('Project selected:', selectedProject);
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    updateProjectSelection(selectedProjectId) {
        // Remove previous selection styling
        document.querySelectorAll('.project-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection styling to selected card
        const selectedCard = document.querySelector(`[data-project-id="${selectedProjectId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
    }

    loadCustomerStep() {
        try {
            const container = document.getElementById('stepContent');
            if (!container) return;

            const state = this.stateManager.state;
            if (!state.selectedProject) {
                container.innerHTML = templates.error('Please select a project first');
                return;
            }

            this.loadingManager.startLoading(QB.LOADING_STATES.CUSTOMERS, 'Loading customers...');
            
            QB.ApiService.get('/api/setup/customers', { 
                params: { projectId: state.selectedProject?.id } 
            })
                .then(response => {
                    container.innerHTML = templates.customerList;
                    
                    const listContainer = document.getElementById('customerListContainer');
                    if (listContainer && response.data) {
                        // Find the customer associated with the selected project
                        const selectedProject = state.selectedProject;
                        const projectCustomerId = selectedProject.customerId || selectedProject.customer?.id;
                        
                        // Auto-select the customer if it matches the project's customer
                        let selectedCustomerId = null;
                        if (projectCustomerId) {
                            const matchingCustomer = response.data.find(c => c.id === projectCustomerId);
                            if (matchingCustomer) {
                                selectedCustomerId = projectCustomerId;
                                this.stateManager.setState({ selectedCustomer: matchingCustomer });
                                this.updateNextButtonState(true);
                            }
                        } else if (response.data && response.data.length === 1) {
                            // If only one customer available, auto-select it
                            const singleCustomer = response.data[0];
                            selectedCustomerId = singleCustomer.id;
                            this.stateManager.setState({ selectedCustomer: singleCustomer });
                            this.updateNextButtonState(true);
                        }
                        
                        // Render customer cards
                        listContainer.innerHTML = templates.customerListContainer(response.data, selectedCustomerId);
                        
                        // Bind events to customer cards
                        this.bindCustomerCardEvents();
                        
                        // Show success message
                        if (selectedCustomerId) {
                            const selectedCustomer = response.data.find(c => c.id === selectedCustomerId);
                            UIUtils.showAlert(`Customer "${selectedCustomer.displayName || selectedCustomer.name}" automatically selected based on your project.`, 'success');
                        }
                    }
                    
                    this.stateManager.setState({ customers: response.data });
                })
                .catch(error => {
                    console.error('Error loading customers:', error);
                    container.innerHTML = templates.error('Failed to load customers. Please try again.');
                    QB.errorBoundary.handleError(error);
                })
                .finally(() => this.loadingManager.stopLoading(QB.LOADING_STATES.CUSTOMERS));
        } catch (error) {
            this.handleError(error);
        }
    }

    bindCustomerCardEvents() {
        // Bind radio button change events
        const radioButtons = document.querySelectorAll('.customer-radio');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectCustomer(e.target.value);
                }
            });
        });
        
        // Bind card click events (clicking anywhere on the card selects the customer)
        const customerCards = document.querySelectorAll('.customer-card');
        customerCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on the radio button directly
                if (e.target.type !== 'radio') {
                    const customerId = card.dataset.customerId;
                    const radioButton = card.querySelector('.customer-radio');
                    if (radioButton && customerId) {
                        radioButton.checked = true;
                        this.selectCustomer(customerId);
                    }
                }
            });
        });
    }

    selectCustomer(customerId) {
        try {
            const state = this.stateManager.state;
            const currentCustomers = state.customers || [];
            const selectedCustomer = currentCustomers.find(cust => cust.id === customerId);
            
            if (selectedCustomer) {
                // Update state
                this.stateManager.setState({ selectedCustomer });
                
                // Update UI
                this.updateCustomerSelection(customerId);
                
                // Enable next button
                this.updateNextButtonState(true);
                
                console.log('Customer selected:', selectedCustomer);
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    updateCustomerSelection(selectedCustomerId) {
        // Remove previous selection styling
        document.querySelectorAll('.customer-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection styling to selected card
        const selectedCard = document.querySelector(`[data-customer-id="${selectedCustomerId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
    }

    loadItemStep() {
        try {
            const container = document.getElementById('stepContent');
            if (!container) return;

            container.innerHTML = templates.itemList;
            this.loadingManager.startLoading(QB.LOADING_STATES.ITEMS, 'Loading items...');
            
            QB.ApiService.get('/api/setup/items')
                .then(response => {
                    const listContainer = document.getElementById('itemListContainer');
                    if (listContainer && response.data) {
                        // Initialize pagination
                        this.currentItemPage = 1;
                        this.itemsPerPage = 5;
                        this.allItems = response.data;
                        
                        // Load first page
                        this.loadItemPage(1);
                        
                        // Bind events to item cards
                        this.bindItemCardEvents();
                        
                        // Show pagination if needed
                        this.updateItemPagination();
                        
                        // Initialize message display (ensure notice shows, success hidden)
                        this.updateItemSelectionMessages(0);
                    }
                    
                    this.stateManager.setState({ items: response.data });
                })
                .catch(error => {
                    console.error('Error loading items:', error);
                    container.innerHTML = templates.error('Failed to load items. Please try again.');
                    QB.errorBoundary.handleError(error);
                })
                .finally(() => this.loadingManager.stopLoading(QB.LOADING_STATES.ITEMS));
        } catch (error) {
            this.handleError(error);
        }
    }

    loadItemPage(page) {
        try {
            const startIndex = (page - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const pageItems = this.allItems.slice(startIndex, endIndex);
            
            const listContainer = document.getElementById('itemListContainer');
            if (listContainer) {
                const state = this.stateManager.state;
                const selectedItemIds = Array.isArray(state.selectedItems) ? 
                    state.selectedItems.map(item => item.id) : [];
                
                listContainer.innerHTML = templates.itemListContainer(pageItems, selectedItemIds);
                this.bindItemCardEvents();
            }
            
            this.currentItemPage = page;
        } catch (error) {
            this.handleError(error);
        }
    }

    bindItemCardEvents() {
        // Bind checkbox change events
        const checkboxes = document.querySelectorAll('.item-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.updateItemSelection();
            });
        });
        
        // Bind card click events (clicking anywhere on the card toggles the checkbox)
        const itemCards = document.querySelectorAll('.item-card');
        
        itemCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on the checkbox area (item-selection wrapper)
                const isCheckboxArea = e.target.type === 'checkbox' || 
                                     e.target.closest('.item-selection') || 
                                     e.target.classList.contains('item-selection') ||
                                     e.target.classList.contains('form-check-input') ||
                                     e.target.classList.contains('form-check-label');
                
                if (!isCheckboxArea) {
                    const itemId = card.dataset.itemId;
                    const checkbox = card.querySelector('.item-checkbox');
                    
                    console.log('Card clicked, itemId:', itemId, 'checkbox found:', !!checkbox);
                    
                    if (checkbox && itemId) {
                        checkbox.checked = !checkbox.checked;
                        console.log('Checkbox toggled to:', checkbox.checked);
                        
                        // Force visual update of checkbox
                        if (checkbox.checked) {
                            checkbox.setAttribute('checked', 'checked');
                        } else {
                            checkbox.removeAttribute('checked');
                        }
                        
                        // Trigger change event to ensure all handlers fire
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            });
        });
    }

    updateItemSelection() {
        try {
            const state = this.stateManager.state;
            const items = state.items || [];
            
            // Get selected checkbox values
            const selectedValues = Array.from(document.querySelectorAll('.item-checkbox:checked')).map(cb => cb.value);
            const selectedItems = items.filter(item => selectedValues.includes(item.id));
            
            console.log('updateItemSelection called, selectedValues:', selectedValues, 'selectedItems:', selectedItems.length);
            
            // Update state
            this.stateManager.setState({ selectedItems: selectedItems });
            
            // Update card styling
            this.updateItemCardStyling(selectedValues);
            
            // Update selection messages
            this.updateItemSelectionMessages(selectedItems.length);
            
            // Enable/disable next button
            this.updateNextButtonState(selectedItems.length > 0);
        } catch (error) {
            this.handleError(error);
        }
    }

    updateItemCardStyling(selectedIds) {
        // Remove previous selection styling and uncheck all checkboxes
        document.querySelectorAll('.item-card').forEach(card => {
            card.classList.remove('selected');
            const checkbox = card.querySelector('.item-checkbox');
            if (checkbox) {
                checkbox.checked = false;
                checkbox.removeAttribute('checked');
            }
        });
        
        // Add selection styling to selected cards and check their checkboxes
        selectedIds.forEach(id => {
            const selectedCard = document.querySelector(`[data-item-id="${id}"]`);
            if (selectedCard) {
                selectedCard.classList.add('selected');
                const checkbox = selectedCard.querySelector('.item-checkbox');
                if (checkbox) {
                    checkbox.checked = true;
                    checkbox.setAttribute('checked', 'checked');
                }
            }
        });
    }

    updateItemSelectionMessages(selectedCount) {
        const successMessage = document.getElementById('itemSelectionSuccess');
        const warningMessage = document.getElementById('itemSelectionWarning');
        const countSpan = document.getElementById('itemSelectionCount');
        
        console.log('Updating messages, selectedCount:', selectedCount);
        
        if (selectedCount > 0) {
            // Hide warning message
            if (warningMessage) {
                warningMessage.style.display = 'none';
                console.log('Hiding warning message');
            }
            // Show success message
            if (successMessage) {
                successMessage.style.display = 'flex';
                console.log('Showing success message');
            }
            if (countSpan) {
                countSpan.textContent = selectedCount;
            }
        } else {
            // Hide success message
            if (successMessage) {
                successMessage.style.display = 'none';
                console.log('Hiding success message');
            }
            // Show warning message
            if (warningMessage) {
                warningMessage.style.display = 'flex';
                console.log('Showing warning message');
            }
        }
    }

    showEmployeeMessage(message, type = 'info') {
        const messagesContainer = document.getElementById('employeeMessages');
        if (!messagesContainer) return;
        
        const iconClass = type === 'success' ? 'check-circle' : 
                         type === 'warning' ? 'exclamation-triangle' : 
                         type === 'danger' ? 'times-circle' : 'info-circle';
        
        const messageHtml = `
            <div class="alert alert-${type} d-flex align-items-center" role="alert">
                <i class="fas fa-${iconClass} me-2"></i>
                <div>${message}</div>
            </div>
        `;
        
        messagesContainer.innerHTML = messageHtml;
        messagesContainer.style.display = 'block';
    }

    clearEmployeeMessages() {
        const messagesContainer = document.getElementById('employeeMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
            messagesContainer.style.display = 'none';
        }
    }

    updateItemPagination() {
        try {
            const totalItems = this.allItems ? this.allItems.length : 0;
            const totalPages = Math.ceil(totalItems / this.itemsPerPage);
            
            const paginationContainer = document.getElementById('itemPaginationContainer');
            const pagination = document.getElementById('itemPagination');
            
            if (totalPages <= 1) {
                paginationContainer.style.display = 'none';
                return;
            }
            
            paginationContainer.style.display = 'block';
            
            const paginationData = {
                currentPage: this.currentItemPage,
                totalPages: totalPages,
                hasNextPage: this.currentItemPage < totalPages,
                hasPreviousPage: this.currentItemPage > 1
            };
            
            pagination.innerHTML = templates.pagination(paginationData);
            
            // Bind pagination events
            pagination.querySelectorAll('[data-page]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = parseInt(e.target.getAttribute('data-page'));
                    if (page && page !== this.currentItemPage) {
                        this.loadItemPage(page);
                        this.updateItemPagination();
                    }
                });
            });
        } catch (error) {
            this.handleError(error);
        }
    }

    loadSummaryStep() {
        try {
            const container = document.getElementById('stepContent');
            if (!container) return;

            const state = this.stateManager.state;
            container.innerHTML = templates.summary(state);
            
            const downloadBtn = document.getElementById('downloadResults');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', this.downloadResults);
            }
            
            const showApiPayloadBtn = document.getElementById('showApiPayload');
            if (showApiPayloadBtn) {
                showApiPayloadBtn.addEventListener('click', () => this.showApiPayload(state));
            }
            
            const createNewActivityBtn = document.getElementById('createNewActivity');
            if (createNewActivityBtn) {
                createNewActivityBtn.addEventListener('click', () => this.createNewActivity());
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    loadTimeActivityStep() {
        try {
            const container = document.getElementById('stepContent');
            if (!container) return;

            // Create time activity step content
            container.innerHTML = this.createTimeActivityStepContent();
            
            // Initialize time activity step functionality
            this.initializeTimeActivityStep();
            
            // Bind events after DOM content is created
            setTimeout(() => {
                this.bindTimeActivityStepEvents();
            }, 50);
            
            // Hide navigation buttons for final step
            this.hideNavigationButtons();
            
        } catch (error) {
            this.handleError(error);
        }
    }
    
    createTimeActivityStepContent() {
        const state = this.stateManager.state;
        return `
            <div class="time-activity-step">
                <div class="text-center mb-4">
                    <h2 class="text-success">
                        <i class="fas fa-check-circle me-2"></i>Setup Complete!
                    </h2>
                    <p class="lead">Your configuration is ready. Create and manage time activities below.</p>
                </div>
                
                <div class="row">
                    <!-- Left Side: Time Activity Creation -->
                    <div class="col-lg-6">
                        <div class="card h-100">
                            <div class="card-header bg-primary text-white">
                                <h5 class="mb-0">
                                    <i class="fas fa-plus me-2"></i>Create Time Activity
                                </h5>
                            </div>
                            <div class="card-body">
                                <!-- Configuration Summary -->
                                <div class="mb-4">
                                    <h6 class="text-muted mb-3">Selected Configuration:</h6>
                                    <div class="row g-2">
                                        <div class="col-6">
                                            <small class="text-muted">Employee:</small><br>
                                            <span class="fw-bold">${state.selectedEmployee?.displayName || 'Not selected'}</span>
                                        </div>
                                        <div class="col-6">
                                            <small class="text-muted">Compensation:</small><br>
                                            <span class="fw-bold">${state.selectedCompensation?.map(comp => comp.payrollItem?.name || comp.name || 'Unknown').join(', ') || 'Not selected'}</span>
                                        </div>
                                        <div class="col-6">
                                            <small class="text-muted">Project:</small><br>
                                            <span class="fw-bold">${state.selectedProject?.name || 'Not selected'}</span>
                                        </div>
                                        <div class="col-6">
                                            <small class="text-muted">Customer:</small><br>
                                            <span class="fw-bold">${state.selectedCustomer?.displayName || 'Not selected'}</span>
                                        </div>
                                        <div class="col-12">
                                            <small class="text-muted">Items:</small><br>
                                            <span class="fw-bold">${state.selectedItems?.map(item => item.name).join(', ') || 'Not selected'}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Time Activity Form -->
                                <div class="mb-4">
                                    <h6 class="text-muted mb-3">Time Activity Details:</h6>
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label for="activityDate" class="form-label">Date</label>
                                            <input type="date" class="form-control" id="activityDate" value="${new Date().toISOString().split('T')[0]}">
                                        </div>
                                        <div class="col-md-6">
                                            <label for="activityTime" class="form-label">Time</label>
                                            <input type="time" class="form-control" id="activityTime" value="${new Date().toTimeString().slice(0, 5)}">
                                        </div>
                                        <div class="col-md-6">
                                            <label for="activityHours" class="form-label">Hours</label>
                                            <input type="number" class="form-control" id="activityHours" min="0" max="24" value="8">
                                        </div>
                                        <div class="col-md-6">
                                            <label for="activityMinutes" class="form-label">Minutes</label>
                                            <input type="number" class="form-control" id="activityMinutes" min="0" max="59" value="0">
                                        </div>
                                        <div class="col-12">
                                            <label for="activityDescription" class="form-label">Description</label>
                                            <textarea class="form-control" id="activityDescription" rows="2" placeholder="Enter activity description...">Time activity created from setup wizard</textarea>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Action Buttons -->
                                <div class="d-grid gap-2">
                                    <button class="btn btn-success" id="createTimeActivityFromSetup">
                                        <i class="fas fa-plus me-2"></i>Create Time Activity
                                    </button>
                                    <div class="row g-2">
                                        <div class="col">
                                            <button class="btn btn-outline-secondary w-100" id="updatePayloadPreview">
                                                <i class="fas fa-refresh me-2"></i>Update Preview
                                            </button>
                                        </div>
                                        <div class="col">
                                            <a href="/?step=3" class="btn btn-outline-primary w-100">
                                                <i class="fas fa-edit me-2"></i>Modify Setup
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Right Side: API Payload Preview -->
                    <div class="col-lg-6">
                        <div class="card h-100">
                            <div class="card-header bg-info text-white">
                                <h5 class="mb-0">
                                    <i class="fas fa-code me-2"></i>API Payload Preview
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="mb-3">
                                    <small class="text-muted d-block mb-2">
                                        <i class="fas fa-info-circle me-1"></i>
                                        This payload will be sent to QuickBooks API
                                    </small>
                                    <div class="bg-light p-3 rounded border" style="height: 400px; overflow-y: auto;">
                                        <pre id="payloadPreview" class="mb-0 small text-dark"></pre>
                                    </div>
                                </div>
                                
                                <!-- API Endpoint Info -->
                                <div class="alert alert-light border">
                                    <div class="d-flex align-items-center">
                                        <span class="badge bg-success me-2">POST</span>
                                        <code class="text-dark">/api/setup/timeactivity</code>
                                    </div>
                                </div>
                                
                                <!-- Quick Actions -->
                                <div class="d-grid gap-2">
                                    <button class="btn btn-outline-primary btn-sm" id="copyPayloadToClipboard">
                                        <i class="fas fa-copy me-1"></i>Copy to Clipboard
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Bottom Section: Time Activities List -->
                <div class="row mt-4">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <div class="d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0">
                                        <i class="fas fa-list me-2"></i>All Time Activities
                                    </h5>
                                    <button class="btn btn-sm btn-outline-primary" id="refreshTimeActivities">
                                        <i class="fas fa-sync-alt me-1"></i>Refresh
                                    </button>
                                </div>
                            </div>
                            <div class="card-body p-0">
                                <!-- Stats Row -->
                                <div class="p-3 border-bottom bg-light">
                                    <div class="row text-center">
                                        <div class="col-3">
                                            <h5 id="totalActivitiesCount" class="text-primary mb-0">0</h5>
                                            <small class="text-muted">Total Activities</small>
                                        </div>
                                        <div class="col-3">
                                            <h5 id="totalHoursCount" class="text-success mb-0">0h</h5>
                                            <small class="text-muted">Total Hours</small>
                                        </div>
                                        <div class="col-3">
                                            <h5 id="billableHoursCount" class="text-warning mb-0">0h</h5>
                                            <small class="text-muted">Billable Hours</small>
                                        </div>
                                        <div class="col-3">
                                            <h5 id="activeEmployeesCount" class="text-info mb-0">0</h5>
                                            <small class="text-muted">Active Employees</small>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Activities Table -->
                                <div class="table-responsive">
                                    <table class="table table-hover mb-0">
                                        <thead class="table-light">
                                            <tr>
                                                <th>Date</th>
                                                <th>Employee</th>
                                                <th>Customer</th>
                                                <th>Item</th>
                                                <th>Hours</th>
                                                <th>Status</th>
                                                <th>Description</th>
                                            </tr>
                                        </thead>
                                        <tbody id="timeActivitiesTableBody">
                                            <tr>
                                                <td colspan="7" class="text-center py-4">
                                                    <div class="spinner-border text-primary" role="status">
                                                        <span class="visually-hidden">Loading...</span>
                                                    </div>
                                                    <p class="mt-2 mb-0">Loading time activities...</p>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                
                                <!-- Pagination -->
                                <div class="p-3 border-top bg-light">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span id="dashboardPaginationInfo" class="text-muted">Showing 0 - 0 of 0 activities</span>
                                        <nav>
                                            <ul class="pagination mb-0" id="dashboardPagination">
                                            </ul>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    initializeTimeActivityStep() {
        // Initialize time activity step functionality
        this.dashboardManager = {
            currentPage: 1,
            pageSize: 10,
            totalPages: 0,
            totalItems: 0,
            filters: { employeeId: '', startDate: '', endDate: '' },
            employees: [],
            timeActivities: []
        };
        
        // Note: Event binding is now handled in loadTimeActivityStep() after DOM creation
        
        // Load initial data and update payload preview
        this.updatePayloadPreview();
        this.loadDashboardTimeActivities();
    }
    
    bindTimeActivityStepEvents() {
        // Create time activity from setup
        const createBtn = document.getElementById('createTimeActivityFromSetup');
        console.log('Binding events - createBtn found:', !!createBtn);
        console.log('Available elements with IDs:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
        
        if (createBtn) {
            createBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Create Time Activity button clicked!');
                this.createTimeActivityFromSetup();
            });
            console.log('Event listener added successfully');
        } else {
            console.error('Create Time Activity button not found!');
            console.log('Trying to find button by class or other selectors...');
            const btnByClass = document.querySelector('.btn-success');
            console.log('Button found by class:', !!btnByClass);
        }
        
        // Update payload preview
        const updatePayloadBtn = document.getElementById('updatePayloadPreview');
        if (updatePayloadBtn) {
            updatePayloadBtn.addEventListener('click', () => this.updatePayloadPreview());
        }
        
        // Refresh time activities
        const refreshBtn = document.getElementById('refreshTimeActivities');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDashboardTimeActivities());
        }
        
        // Copy payload to clipboard
        const copyBtn = document.getElementById('copyPayloadToClipboard');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyPayloadToClipboard());
        }
        
        // Form change events to auto-update payload
        ['activityDate', 'activityTime', 'activityHours', 'activityMinutes', 'activityDescription'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updatePayloadPreview());
                element.addEventListener('input', () => this.updatePayloadPreview());
            }
        });
    }
    
    hideNavigationButtons() {
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        
        if (nextBtn) nextBtn.style.display = 'none';
        if (prevBtn) prevBtn.style.display = 'none';
    }
    
    updatePayloadPreview() {
        try {
            const state = this.stateManager.state;
            const payload = this.generateTimeActivityPayloadFromForm(state);
            
            const previewElement = document.getElementById('payloadPreview');
            if (previewElement) {
                previewElement.textContent = JSON.stringify(payload, null, 2);
            }
        } catch (error) {
            console.error('Error updating payload preview:', error);
        }
    }
    
    async copyPayloadToClipboard() {
        try {
            const previewElement = document.getElementById('payloadPreview');
            if (previewElement && previewElement.textContent) {
                await navigator.clipboard.writeText(previewElement.textContent);
                
                // Show temporary success feedback
                const copyBtn = document.getElementById('copyPayloadToClipboard');
                if (copyBtn) {
                    const originalText = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<i class="fas fa-check me-1"></i>Copied!';
                    copyBtn.classList.add('btn-success');
                    copyBtn.classList.remove('btn-outline-primary');
                    
                    setTimeout(() => {
                        copyBtn.innerHTML = originalText;
                        copyBtn.classList.remove('btn-success');
                        copyBtn.classList.add('btn-outline-primary');
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            UIUtils.showAlert('Failed to copy to clipboard', 'error');
        }
    }
    
    generateTimeActivityPayloadFromForm(state) {
        const dateInput = document.getElementById('activityDate')?.value || new Date().toISOString().split('T')[0];
        const timeInput = document.getElementById('activityTime')?.value || new Date().toTimeString().slice(0, 5);
        const hoursInput = parseInt(document.getElementById('activityHours')?.value || '8');
        const minutesInput = parseInt(document.getElementById('activityMinutes')?.value || '0');
        const descriptionInput = document.getElementById('activityDescription')?.value || 'Time activity created from setup wizard';
        
        // Combine date and time
        const combinedDateTime = new Date(`${dateInput}T${timeInput}`).toISOString();
        
        const firstCompensation = state.selectedCompensation && state.selectedCompensation.length > 0 ? state.selectedCompensation[0] : null;
        const selectedItems = state.selectedItems || [];

        // Create base payload without ItemRef
        const basePayload = {
            "TxnDate": combinedDateTime,
            "NameOf": "Employee",
            "EmployeeRef": { "value": state.selectedEmployee?.id || "400000011" },
            "PayrollItemRef": { "value": firstCompensation?.id || "626270109" },
            "CustomerRef": { "value": state.selectedCustomer?.id || "8" },
            "ProjectRef": { "value": state.selectedProject?.id || "416296152" },
            "Hours": hoursInput,
            "Minutes": minutesInput,
            "Description": descriptionInput
        };

        // If multiple items selected, create array of payloads (one per item)
        if (selectedItems.length > 1) {
            return selectedItems.map((item, index) => ({
                ...basePayload,
                "ItemRef": { "value": item.id },
                "Description": `${descriptionInput} - Item: ${item.name || item.id} (${index + 1}/${selectedItems.length})`
            }));
        } else if (selectedItems.length === 1) {
            // Single item - return single payload
            return {
                ...basePayload,
                "ItemRef": { "value": selectedItems[0].id }
            };
        } else {
            // No items selected - return base payload without ItemRef
            return basePayload;
        }
    }
    
    async createTimeActivityFromSetup() {
        console.log('createTimeActivityFromSetup method called');
        try {
            const state = this.stateManager.state;
            console.log('Current state:', state);
            const payload = this.generateTimeActivityPayloadFromForm(state);
            console.log('Generated payload:', payload);
            
            // Show confirmation
            console.log('Showing confirmation modal for payload:', payload);
            if (await this.confirmTimeActivityCreation(payload)) {
                console.log('User confirmed creation');
                // Show loading state
                const createBtn = document.getElementById('createTimeActivityFromSetup');
                const originalText = createBtn.innerHTML;
                createBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating...';
                createBtn.disabled = true;
                
                let allSuccessful = true;
                let results = [];
                
                // Handle multiple items (array of payloads) or single item
                if (Array.isArray(payload)) {
                    console.log(`Creating ${payload.length} time activity records`);
                    // Multiple items - create multiple TimeActivity records
                    for (let i = 0; i < payload.length; i++) {
                        try {
                            console.log(`Creating time activity ${i + 1}/${payload.length}:`, payload[i]);
                            const response = await fetch('/api/setup/timeactivity', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload[i])
                            });
                            
                            const result = await response.json();
                            console.log(`Result for time activity ${i + 1}:`, result);
                            results.push(result);
                            
                            if (!response.ok || !result.success) {
                                allSuccessful = false;
                                console.error(`Failed to create time activity ${i + 1}:`, result);
                            }
                        } catch (error) {
                            allSuccessful = false;
                            console.error(`Error creating time activity ${i + 1}:`, error);
                            results.push({ success: false, error: error.message });
                        }
                    }
                } else {
                    console.log('Creating single time activity record:', payload);
                    // Single item - create one TimeActivity record
                    const response = await fetch('/api/setup/timeactivity', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    
                    const result = await response.json();
                    console.log('Single time activity result:', result);
                    results.push(result);
                    allSuccessful = response.ok && result.success;
                }
                
                // Restore button state
                createBtn.innerHTML = originalText;
                createBtn.disabled = false;
                
                // Show results
                if (allSuccessful) {
                    const itemCount = Array.isArray(payload) ? payload.length : 1;
                    UIUtils.showAlert(`${itemCount} time activity record(s) created successfully!`, 'success');
                    // Auto-refresh the time activities list
                    await this.loadDashboardTimeActivities();
                } else {
                    const successCount = results.filter(r => r.success).length;
                    const totalCount = results.length;
                    UIUtils.showAlert(`Created ${successCount}/${totalCount} time activity records. Some failed.`, 'warning');
                }
            }
        } catch (error) {
            // Restore button state on error
            const createBtn = document.getElementById('createTimeActivityFromSetup');
            if (createBtn) {
                createBtn.innerHTML = '<i class="fas fa-plus me-2"></i>Create Time Activity';
                createBtn.disabled = false;
            }
            UIUtils.showAlert('Error creating time activity: ' + error.message, 'error');
        }
    }
    
    generateSetupTimeActivityPayload(state) {
        const currentDate = new Date().toISOString();
        const firstCompensation = state.selectedCompensation && state.selectedCompensation.length > 0 ? state.selectedCompensation[0] : null;
        const firstItem = state.selectedItems && state.selectedItems.length > 0 ? state.selectedItems[0] : null;

        return {
            "TxnDate": currentDate,
            "NameOf": "Employee",
            "EmployeeRef": { "value": state.selectedEmployee?.id || "1" },
            "PayrollItemRef": { "value": firstCompensation?.id || "626270109" },
            "CustomerRef": { "value": state.selectedCustomer?.id || "2" },
            "ProjectRef": { "value": state.selectedProject?.id || "416296152" },
            "ItemRef": { "value": firstItem?.id || "1" },
            "Hours": 8,
            "Minutes": 0,
            "Description": "Time activity created from setup wizard"
        };
    }
    
    async confirmTimeActivityCreation(payload) {
        return new Promise((resolve) => {
            console.log('confirmTimeActivityCreation called with:', payload);
            
            // Handle array of payloads vs single payload
            const isArray = Array.isArray(payload);
            const firstPayload = isArray ? payload[0] : payload;
            const itemCount = isArray ? payload.length : 1;
            
            const modalHtml = `
                <div class="modal fade" id="confirmSetupModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Create Time Activity</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <p>Create ${itemCount} time activity record(s) with the following details:</p>
                                <ul>
                                    <li><strong>Date:</strong> ${new Date(firstPayload.TxnDate).toLocaleString()}</li>
                                    <li><strong>Employee:</strong> ${firstPayload.EmployeeRef.value}</li>
                                    <li><strong>Hours:</strong> ${firstPayload.Hours}h ${firstPayload.Minutes}m</li>
                                    <li><strong>Description:</strong> ${firstPayload.Description}</li>
                                    ${isArray ? `<li><strong>Items:</strong> ${itemCount} different items selected</li>` : ''}
                                </ul>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="cancelSetupCreate">Cancel</button>
                                <button type="button" class="btn btn-success" id="confirmSetupCreate">Create ${itemCount} Time Activity Record(s)</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('confirmSetupModal'));
            
            document.getElementById('confirmSetupCreate').addEventListener('click', () => {
                console.log('User clicked confirm button');
                modal.hide();
                document.getElementById('confirmSetupModal').remove();
                resolve(true);
            });
            
            document.getElementById('cancelSetupCreate').addEventListener('click', () => {
                modal.hide();
                document.getElementById('confirmSetupModal').remove();
                resolve(false);
            });
            
            modal.show();
        });
    }

    async loadDashboardTimeActivities() {
        try {
            // Show loading state
            const tableBody = document.getElementById('timeActivitiesTableBody');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center py-4">
                            <div class="spinner-border spinner-border-sm text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-2 mb-0 small">Loading time activities...</p>
                        </td>
                    </tr>
                `;
            }
            
            // Fetch time activities
            const response = await fetch('/api/setup/dashboard/timeactivities?page=1&pageSize=10');
            const result = await response.json();
            
            if (response.ok && result.success) {
                this.renderTimeActivitiesTable(result.data || []);
                this.updateTimeActivitiesStats(result.data || []);
                this.updateTimeActivitiesPagination(result.pagination || {});
            } else {
                this.renderTimeActivitiesError('Failed to load time activities: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error loading time activities:', error);
            this.renderTimeActivitiesError('Error loading time activities: ' + error.message);
        }
    }
    
    renderTimeActivitiesTable(activities) {
        const tableBody = document.getElementById('timeActivitiesTableBody');
        if (!tableBody) return;
        
        if (activities.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-muted">
                        <i class="fas fa-clock fa-2x mb-2"></i>
                        <p class="mb-0">No time activities found</p>
                        <small>Create your first time activity above</small>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = activities.map(activity => `
            <tr>
                <td class="small">${new Date(activity.txnDate).toLocaleDateString()}</td>
                <td class="small">${activity.employeeName || activity.employeeRef || 'N/A'}</td>
                <td class="small">${activity.customerName || activity.customerRef || 'N/A'}</td>
                <td class="small">${activity.itemName || activity.itemRef || 'N/A'}</td>
                <td class="small">${activity.hours || 0}h ${activity.minutes || 0}m</td>
                <td class="small">
                    <span class="badge ${activity.billable ? 'bg-success' : 'bg-secondary'}">${activity.billableStatus || (activity.billable ? 'Billable' : 'Not Billable')}</span>
                </td>
                <td class="small" title="${activity.description || 'No description'}">${(activity.description || 'No description').substring(0, 40)}${(activity.description || '').length > 40 ? '...' : ''}</td>
            </tr>
        `).join('');
    }
    
    renderTimeActivitiesError(errorMessage) {
        const tableBody = document.getElementById('timeActivitiesTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-danger">
                        <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                        <p class="mb-0">${errorMessage}</p>
                    </td>
                </tr>
            `;
        }
    }
    
    updateTimeActivitiesStats(activities) {
        const totalActivities = activities.length;
        const totalHours = activities.reduce((sum, activity) => sum + (activity.hours || 0), 0);
        const totalMinutes = activities.reduce((sum, activity) => sum + (activity.minutes || 0), 0);
        const billableHours = activities.filter(activity => activity.billableStatus === 'Billable').reduce((sum, activity) => sum + (activity.hours || 0), 0);
        const uniqueEmployees = new Set(activities.map(activity => activity.employeeRef?.value).filter(Boolean)).size;
        
        // Update stats display
        document.getElementById('totalActivitiesCount').textContent = totalActivities;
        document.getElementById('totalHoursCount').textContent = `${totalHours + Math.floor(totalMinutes / 60)}h`;
        document.getElementById('billableHoursCount').textContent = `${billableHours}h`;
        document.getElementById('activeEmployeesCount').textContent = uniqueEmployees;
    }
    
    updateTimeActivitiesPagination(pagination) {
        const paginationInfo = document.getElementById('dashboardPaginationInfo');
        const paginationNav = document.getElementById('dashboardPagination');
        
        if (paginationInfo && pagination) {
            const start = ((pagination.currentPage || 1) - 1) * (pagination.pageSize || 10) + 1;
            const end = Math.min(start + (pagination.pageSize || 10) - 1, pagination.totalItems || 0);
            paginationInfo.textContent = `Showing ${start} - ${end} of ${pagination.totalItems || 0} activities`;
        }
        
        if (paginationNav) {
            paginationNav.innerHTML = ''; // Simple pagination for now
        }
    }

    showApiPayload(state) {
        try {
            // Generate the API payload based on current state
            const payload = this.generateTimeActivityPayload(state);
            
            // Show the payload in the modal
            const payloadContent = document.getElementById('apiPayloadContent');
            if (payloadContent) {
                payloadContent.textContent = JSON.stringify(payload, null, 2);
            }
            
            // Set up copy to clipboard functionality
            const copyBtn = document.getElementById('copyPayload');
            if (copyBtn) {
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
                        UIUtils.showAlert('API payload copied to clipboard!', 'success');
                    }).catch(() => {
                        UIUtils.showAlert('Failed to copy to clipboard', 'error');
                    });
                };
            }
            
            // Show the modal
            const modal = new bootstrap.Modal(document.getElementById('apiPayloadModal'));
            modal.show();
        } catch (error) {
            this.handleError(error);
        }
    }

    generateTimeActivityPayload(state) {
        // Get current date for the example
        const currentDate = new Date().toISOString();
        
        // Get the first selected compensation (for PayrollItemRef)
        const firstCompensation = state.selectedCompensation && state.selectedCompensation.length > 0 
            ? state.selectedCompensation[0] : null;
            
        // Get the first selected item (for ItemRef)
        const firstItem = state.selectedItems && state.selectedItems.length > 0 
            ? state.selectedItems[0] : null;

        return {
            "TxnDate": currentDate,
            "NameOf": "Employee",
            "EmployeeRef": { 
                "value": state.selectedEmployee?.id || "400000011" 
            },
            "PayrollItemRef": {
                "value": firstCompensation?.id || "626270109"
            },
            "CustomerRef": {
                "value": state.selectedCustomer?.id || "8"
            },
            "ProjectRef": {
                "value": state.selectedProject?.id || "416296152"
            },
            "ItemRef": { 
                "value": firstItem?.id || "7" 
            },
            "Hours": 8,
            "Minutes": 0,
            "Description": "Construction:DailyWork"
        };
    }

    downloadResults = () => {
        try {
            const state = this.stateManager.state;
            this.loadingManager.startLoading(QB.LOADING_STATES.TIME_ACTIVITY, 'Generating time activity...');
            
            QB.ApiService.post('/api/setup/timeactivity', state)
                .then(response => {
                    const blob = new Blob([response.data], { type: 'application/json' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'employee-compensation.json';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                })
                .catch(error => QB.errorBoundary.handleError(error))
                .finally(() => this.loadingManager.stopLoading(QB.LOADING_STATES.TIME_ACTIVITY));
        } catch (error) {
            this.handleError(error);
        }
    }

    createNewActivity() {
        try {
            // Clear current state except auth token
            this.stateManager.clearState();
            
            // Reset to compensation step (step 3)
            this.currentStep = 3;
            this.updateProgressBar();
            this.loadCompensationStep();
            
            // Show success message
            UIUtils.showAlert('Ready to create a new time activity. Please select compensation details.', 'info');
        } catch (error) {
            this.handleError(error);
        }
    }
}