// Integration Tests for API Calls

describe('API Integration Tests', () => {
    let token;

    beforeAll(async () => {
        // Get OAuth token
        const response = await fetch('/api/oauth/status');
        const data = await response.json();
        token = data.data;
        
        if (!token || !token.isAuthenticated) {
            throw new Error('OAuth token not available. Please authenticate first.');
        }
    });

    describe('OAuth Endpoints', () => {
        test('should get OAuth status', async () => {
            const response = await fetch('/api/oauth/status');
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.data.isAuthenticated).toBeDefined();
        });

        test('should handle OAuth disconnect', async () => {
            const response = await fetch('/api/oauth/disconnect', { method: 'POST' });
            const data = await response.json();
            expect(data.success).toBe(true);
        });
    });

    describe('Employee Endpoints', () => {
        test('should fetch employees', async () => {
            const response = await fetch('/api/employeecompensation/employees');
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(Array.isArray(data.data)).toBe(true);
        });

        test('should handle employee not found', async () => {
            const response = await fetch('/api/employeecompensation/employees/999999');
            const data = await response.json();
            expect(data.success).toBe(false);
            expect(data.errorMessage).toBeDefined();
        });
    });

    describe('Compensation Endpoints', () => {
        let employeeId;

        beforeAll(async () => {
            // Get first employee for testing
            const response = await fetch('/api/employeecompensation/employees');
            const data = await response.json();
            employeeId = data.data[0]?.id;
            
            if (!employeeId) {
                throw new Error('No employees available for testing');
            }
        });

        test('should fetch compensations for employee', async () => {
            const response = await fetch(`/api/employeecompensation/compensation?employeeId=${employeeId}`);
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(Array.isArray(data.data)).toBe(true);
        });

        test('should handle invalid employee ID', async () => {
            const response = await fetch('/api/employeecompensation/compensation?employeeId=invalid');
            const data = await response.json();
            expect(data.success).toBe(false);
            expect(data.errorMessage).toBeDefined();
        });
    });

    describe('Project Endpoints', () => {
        test('should fetch projects with date filters', async () => {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1);

            const params = new URLSearchParams({
                startDateFrom1: startDate.toISOString(),
                startDateTo1: endDate.toISOString()
            });

            const response = await fetch(`/api/employeecompensation/projects?${params}`);
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(Array.isArray(data.data)).toBe(true);
        });

        test('should handle invalid date filters', async () => {
            const params = new URLSearchParams({
                startDateFrom1: 'invalid',
                startDateTo1: 'invalid'
            });

            const response = await fetch(`/api/employeecompensation/projects?${params}`);
            const data = await response.json();
            expect(data.success).toBe(false);
            expect(data.errorMessage).toBeDefined();
        });
    });

    describe('TimeActivity Endpoints', () => {
        let timeActivityData;

        beforeAll(async () => {
            // Get necessary data for TimeActivity
            const [employeesRes, projectsRes] = await Promise.all([
                fetch('/api/employeecompensation/employees'),
                fetch('/api/employeecompensation/projects')
            ]);

            const [employeesData, projectsData] = await Promise.all([
                employeesRes.json(),
                projectsRes.json()
            ]);

            const employee = employeesData.data[0];
            const project = projectsData.data[0];

            if (!employee || !project) {
                throw new Error('Required data not available for testing');
            }

            timeActivityData = {
                employeeId: employee.id,
                projectId: project.id,
                customerId: project.customerId,
                date: new Date().toISOString(),
                hours: 8,
                description: 'Test TimeActivity'
            };
        });

        test('should create TimeActivity', async () => {
            const response = await fetch('/api/employeecompensation/timeactivity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(timeActivityData)
            });

            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.data.id).toBeDefined();
        });

        test('should handle invalid TimeActivity data', async () => {
            const invalidData = { ...timeActivityData, hours: -1 };
            const response = await fetch('/api/employeecompensation/timeactivity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(invalidData)
            });

            const data = await response.json();
            expect(data.success).toBe(false);
            expect(data.validationErrors).toBeDefined();
        });
    });

    describe('Pre-check Endpoints', () => {
        test('should check projects enabled', async () => {
            const response = await fetch('/api/employeecompensation/precheck/projects');
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(typeof data.data.projectsEnabled).toBe('boolean');
        });

        test('should check time tracking enabled', async () => {
            const response = await fetch('/api/employeecompensation/precheck/timetracking');
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(typeof data.data.timeTrackingEnabled).toBe('boolean');
        });
    });

    describe('Error Handling', () => {
        test('should handle network errors', async () => {
            const response = await fetch('/api/nonexistent/endpoint');
            expect(response.status).toBe(404);
        });

        test('should handle validation errors', async () => {
            const response = await fetch('/api/employeecompensation/timeactivity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            const data = await response.json();
            expect(data.success).toBe(false);
            expect(Array.isArray(data.validationErrors)).toBe(true);
        });

        test('should handle unauthorized access', async () => {
            // Clear token
            await fetch('/api/oauth/disconnect', { method: 'POST' });

            const response = await fetch('/api/employeecompensation/employees');
            expect(response.status).toBe(401);
        });
    });
});
