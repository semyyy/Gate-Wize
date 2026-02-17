# Testing Guide for Gate-Wize

This document provides comprehensive information about the testing infrastructure for the Gate-Wize application.

## Overview

Gate-Wize uses **Vitest** as the test runner for both backend and frontend, providing:
- Fast test execution with native ESM support
- Built-in coverage reporting
- Watch mode for development
- UI mode for interactive test exploration
- Compatible with Jest API (easy migration)

### Testing Stack

**Backend:**
- **Vitest** - Test runner
- **Supertest** - HTTP assertion library for testing Express routes
- **@vitest/coverage-v8** - Code coverage reporting

**Frontend:**
- **Vitest** - Test runner
- **React Testing Library** - Component testing utilities
- **@testing-library/jest-dom** - Custom DOM matchers
- **@testing-library/user-event** - User interaction simulation
- **jsdom** - DOM implementation for Node.js

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with interactive UI
npm run test:ui
```

### Frontend Tests

```bash
cd frontend

# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with interactive UI
npm run test:ui
```

## Running Specific Tests

### Run a Specific Test File

```bash
# Backend
cd backend
npm test -- src/routes/form.test.ts

# Frontend
cd frontend
npm test -- src/lib/formApi.test.ts
```

### Run Tests Matching a Pattern

```bash
# Run all tests with "form" in the name
npm test -- form

# Run all tests in a specific directory
npm test -- src/routes/
```

### Run a Specific Test Suite or Test Case

```bash
# Use the -t flag to filter by test name
npm test -- -t "should save a form"

# Run only tests in a specific describe block
npm test -- -t "Form Routes"
```

## Coverage Reports

### Backend Coverage

The backend has a **minimum 60% coverage threshold** for:
- Lines
- Functions
- Branches
- Statements

After running `npm run test:coverage`, view the HTML report:

```bash
# Open the coverage report in your browser
# Windows
start backend/coverage/index.html

# macOS
open backend/coverage/index.html

# Linux
xdg-open backend/coverage/index.html
```

The coverage report shows:
- Overall coverage percentages
- File-by-file coverage breakdown
- Line-by-line coverage visualization
- Uncovered lines highlighted in red

### Frontend Coverage

Frontend tests don't have strict coverage requirements but coverage can be enabled:

```bash
cd frontend
npm test -- --coverage
```

## Test Structure

### Backend Test Organization

```
backend/src/
├── test/
│   └── setup.ts                    # Global test setup
├── lib/
│   └── data/
│       └── services/
│           ├── formService.ts
│           └── formService.test.ts # Unit tests for service
└── routes/
    ├── form.ts
    ├── form.test.ts                # Integration tests for routes
    ├── rate-simple-field.ts
    ├── rate-simple-field.test.ts
    ├── rate-detailed-row.ts
    └── rate-detailed-row.test.ts
```

### Frontend Test Organization

```
frontend/src/
├── test/
│   ├── setup.ts                    # Global test setup
│   └── utils.tsx                   # Test utilities and helpers
└── lib/
    ├── formApi.ts
    └── formApi.test.ts             # API function tests
```

## Writing New Tests

### Backend Test Example

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import router from './my-route.js';

// Mock dependencies
vi.mock('../lib/myService.js', () => ({
  myFunction: vi.fn(),
}));

describe('My Route', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api', router);
  });

  it('should handle valid request', async () => {
    const { myFunction } = await import('../lib/myService.js');
    (myFunction as any).mockResolvedValue({ result: 'success' });

    const response = await request(app)
      .post('/api/endpoint')
      .send({ data: 'test' })
      .expect(200);

    expect(response.body).toEqual({ ok: true, data: { result: 'success' } });
    expect(myFunction).toHaveBeenCalledWith('test');
  });
});
```

### Frontend Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { myApiFunction } from './myApi';
import { mockFetchResponse } from '@/test/utils';

describe('myApiFunction', () => {
  it('should fetch data successfully', async () => {
    const mockData = { id: '1', name: 'Test' };
    
    global.fetch = vi.fn().mockResolvedValue(
      mockFetchResponse({ ok: true, data: mockData })
    );

    const result = await myApiFunction('1');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/api/endpoint/1',
      expect.any(Object)
    );
    expect(result).toEqual(mockData);
  });
});
```

## Test Coverage Areas

### Backend Tests

#### Form CRUD Operations
- `formService.test.ts` - Tests for form storage service
  - Save form with valid/invalid data
  - Load existing/non-existing forms
  - List forms with/without unpublished
  - Delete forms
  - Check form existence

- `form.test.ts` - Tests for form routes
  - POST `/save/` - Form saving with validation
  - GET `/load/:id` - Form loading
  - GET `/exists/:id` - Existence checks
  - GET `/list` - Listing with query parameters
  - DELETE `/delete/:id` - Form deletion

#### LLM Rating Endpoints
- `rate-simple-field.test.ts` - Tests for simple field rating
  - Valid request handling
  - Input validation (question, value, examples)
  - Response format validation
  - Error handling

- `rate-detailed-row.test.ts` - Tests for detailed row rating
  - Valid request handling
  - Input validation (question, attributeName, attributeValue, rowData)
  - Row data formatting
  - Error handling

#### Input Validation
All route tests include comprehensive input validation:
- Missing required fields
- Invalid field types
- Empty values
- Edge cases

### Frontend Tests

#### Form API Functions
- `formApi.test.ts` - Tests for all API functions
  - `listForms` - With/without unpublished parameter
  - `loadForm` - Successful/failed loads
  - `formExists` - Existence checks
  - `saveForm` - Saving with valid/invalid data
  - `deleteForm` - Deletion
  - `rateSimpleField` - Rating with various inputs
  - `rateDetailedRow` - Detailed rating
  - `exportFormToPdf` - PDF export
  - Error handling for all functions

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` to reset mocks and state
- Don't rely on test execution order

### 2. Mock External Dependencies
- Mock database/storage (MinIO)
- Mock LLM clients
- Mock fetch API for frontend tests
- Use `vi.mock()` for module mocking

### 3. Test Both Success and Failure Cases
- Happy path (valid inputs, successful operations)
- Error cases (invalid inputs, network errors, server errors)
- Edge cases (empty arrays, null values, etc.)

### 4. Use Descriptive Test Names
```typescript
// Good
it('should return 400 for missing question parameter')

// Bad
it('test validation')
```

### 5. Keep Tests Focused
- One assertion per test when possible
- Test one behavior at a time
- Use helper functions for setup

### 6. Maintain Test Coverage
- Run coverage reports regularly
- Add tests for new features
- Update tests when refactoring

## Continuous Integration

### Running Tests in CI/CD

Add these commands to your CI pipeline:

```bash
# Backend
cd backend
npm ci
npm run test:coverage

# Frontend
cd frontend
npm ci
npm test
```

### Coverage Enforcement

The backend tests will fail if coverage drops below 60% for any metric (lines, functions, branches, statements).

## Troubleshooting

### Tests Failing Locally

1. **Clear node_modules and reinstall**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check for environment variables**
   - Backend tests mock env vars in `src/test/setup.ts`
   - Frontend tests mock env vars in `src/test/setup.ts`

3. **Verify mocks are working**
   - Check that `vi.clearAllMocks()` is called in `beforeEach`
   - Ensure mocks are properly configured

### Coverage Not Meeting Threshold

1. **Identify uncovered code**
   - Open `backend/coverage/index.html`
   - Look for red-highlighted lines

2. **Add missing tests**
   - Focus on critical paths first
   - Add edge case tests
   - Test error handling

3. **Exclude non-testable code**
   - Update `vitest.config.ts` coverage exclusions if needed
   - Don't exclude code just to meet coverage

### Watch Mode Not Working

1. **Check file patterns**
   - Vitest watches `.ts`, `.tsx`, `.js`, `.jsx` files by default
   - Verify your test files match the pattern

2. **Restart watch mode**
   - Press `r` to restart all tests
   - Press `q` to quit and restart

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Testing Best Practices](https://testingjavascript.com/)

## Support

For questions or issues with testing:
1. Check this documentation first
2. Review existing test files for examples
3. Consult the Vitest documentation
4. Ask the development team
