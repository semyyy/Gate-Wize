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

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

/**
 * Custom render function that wraps components with necessary providers
 */
export function customRender(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) {
    return render(ui, { ...options });
}

/**
 * Mock form spec factory
 */
export function createMockFormSpec(overrides = {}) {
    return {
        name: 'Test Form',
        status: 'published',
        sections: [],
        ...overrides,
    };
}

/**
 * Mock fetch response helper
 */
export function mockFetchResponse(data: any, ok = true, status = 200) {
    return Promise.resolve({
        ok,
        status,
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
        blob: () => Promise.resolve(new Blob([JSON.stringify(data)])),
    } as Response);
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { customRender as render };
