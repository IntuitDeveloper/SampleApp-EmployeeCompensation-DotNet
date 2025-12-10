// Unit Tests for Utility Functions

describe('UIUtils', () => {
    let statusMessages;

    beforeEach(() => {
        // Set up DOM elements
        document.body.innerHTML = `
            <div id="statusMessages"></div>
            <div id="testContainer"></div>
        `;
        statusMessages = document.getElementById('statusMessages');
    });

    afterEach(() => {
        // Clean up DOM elements
        document.body.innerHTML = '';
    });

    describe('showAlert', () => {
        test('should create alert with correct message and type', () => {
            UIUtils.showAlert('Test message', 'success');
            expect(statusMessages.innerHTML).toContain('Test message');
            expect(statusMessages.querySelector('.alert-success')).toBeTruthy();
        });

        test('should auto-dismiss alert after specified duration', async () => {
            jest.useFakeTimers();
            UIUtils.showAlert('Test message', 'success', 1000);
            expect(statusMessages.querySelector('.alert')).toBeTruthy();
            jest.advanceTimersByTime(1000);
            expect(statusMessages.querySelector('.alert')).toBeFalsy();
        });
    });

    describe('formatCurrency', () => {
        test('should format currency correctly', () => {
            expect(UIUtils.formatCurrency(1234.56)).toBe('$1,234.56');
            expect(UIUtils.formatCurrency(1000000)).toBe('$1,000,000.00');
            expect(UIUtils.formatCurrency(0)).toBe('$0.00');
        });

        test('should handle null/undefined values', () => {
            expect(UIUtils.formatCurrency(null)).toBe('N/A');
            expect(UIUtils.formatCurrency(undefined)).toBe('N/A');
        });
    });

    describe('formatDate', () => {
        test('should format date correctly', () => {
            const date = new Date('2025-01-01T00:00:00Z');
            expect(UIUtils.formatDate(date)).toBe('Jan 1, 2025');
        });

        test('should handle null/undefined values', () => {
            expect(UIUtils.formatDate(null)).toBe('N/A');
            expect(UIUtils.formatDate(undefined)).toBe('N/A');
        });
    });

    describe('createCard', () => {
        test('should create card with correct structure', () => {
            const card = UIUtils.createCard('Test Title', 'user', 'Test content', 'bg-primary');
            expect(card).toContain('Test Title');
            expect(card).toContain('fa-user');
            expect(card).toContain('Test content');
            expect(card).toContain('bg-primary');
        });
    });

    describe('createDataItem', () => {
        test('should create data item with correct structure', () => {
            const item = { id: '1', name: 'Test' };
            const dataItem = UIUtils.createDataItem(
                item,
                true,
                'testClick',
                'Primary Text',
                'Secondary Text',
                { class: 'bg-success', text: 'Active' }
            );
            expect(dataItem).toContain('Primary Text');
            expect(dataItem).toContain('Secondary Text');
            expect(dataItem).toContain('bg-success');
            expect(dataItem).toContain('Active');
            expect(dataItem).toContain('selected');
        });
    });
});

describe('ValidationService', () => {
    describe('validateEmployee', () => {
        test('should validate employee correctly', () => {
            const validEmployee = new Employee({ id: '1', name: 'Test' });
            const result = ValidationService.validateEmployee(validEmployee);
            expect(result.isValid).toBe(true);
        });

        test('should return errors for invalid employee', () => {
            const invalidEmployee = new Employee({});
            const result = ValidationService.validateEmployee(invalidEmployee);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Employee ID is required');
            expect(result.errors).toContain('Employee name is required');
        });
    });

    describe('validateCompensation', () => {
        test('should validate compensation correctly', () => {
            const validCompensation = new Compensation({
                id: '1',
                name: 'Test',
                type: 'HOURLY',
                amount: 50
            });
            const result = ValidationService.validateCompensation(validCompensation);
            expect(result.isValid).toBe(true);
        });

        test('should return errors for invalid compensation', () => {
            const invalidCompensation = new Compensation({});
            const result = ValidationService.validateCompensation(invalidCompensation);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Compensation ID is required');
            expect(result.errors).toContain('Compensation amount must be greater than 0');
        });
    });
});

describe('ApiService', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('get', () => {
        test('should handle successful GET request', async () => {
            const mockResponse = { success: true, data: { test: 'data' } };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await ApiService.get('/test');
            expect(result).toEqual(mockResponse);
        });

        test('should handle failed GET request', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            await expect(ApiService.get('/test')).rejects.toThrow('HTTP error');
        });
    });

    describe('post', () => {
        test('should handle successful POST request', async () => {
            const mockResponse = { success: true, data: { test: 'data' } };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await ApiService.post('/test', { test: 'data' });
            expect(result).toEqual(mockResponse);
        });

        test('should handle failed POST request', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            await expect(ApiService.post('/test', {})).rejects.toThrow('HTTP error');
        });
    });
});
