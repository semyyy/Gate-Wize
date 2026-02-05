/**
 * Copyright (c) 2026 EAExpertise
 *
 * This software is licensed under the MIT License with Commons Clause.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to use,
 * copy, modify, merge, publish, distribute, and sublicense the Software,
 * subject to the conditions of the MIT License and the Commons Clause.
 *
 * Commercial use of this Software is strictly prohibited unless explicit prior
 * written permission is obtained from EAExpertise.
 *
 * The Software may be used for internal business purposes, research,
 * evaluation, or other non-commercial purposes.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import '@testing-library/jest-dom';
import { beforeAll, afterEach, vi } from 'vitest';

// Mock environment variables
beforeAll(() => {
    process.env.NEXT_PUBLIC_BACKEND_URL = 'http://localhost:4000';

    // Mock URL.createObjectURL and revokeObjectURL for PDF export tests
    if (typeof window !== 'undefined') {
        window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
        window.URL.revokeObjectURL = vi.fn();
    }
});

// Mock fetch globally
global.fetch = vi.fn();

// Cleanup after each test
afterEach(() => {
    vi.clearAllMocks();
});
