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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    listForms,
    loadForm,
    formExists,
    saveForm,
    deleteForm,
    rateSimpleField,
    rateDetailedRow,
    exportFormToPdf,
    isFieldRatingError,
} from './formApi';
import { mockFetchResponse } from '@/test/utils';

describe('formApi', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('listForms', () => {
        it('should list forms without unpublished parameter', async () => {
            const mockForms = [
                { id: 'form1', name: 'Form 1', status: 'published' },
                { id: 'form2', name: 'Form 2', status: 'published' },
            ];

            global.fetch = vi.fn().mockResolvedValue(
                mockFetchResponse({ ok: true, data: mockForms })
            );

            const result = await listForms(false);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:4000/api/form/list',
                { cache: 'no-store' }
            );
            expect(result).toEqual(mockForms);
        });

        it('should list forms with unpublished parameter', async () => {
            const mockForms = [
                { id: 'form1', name: 'Form 1', status: 'published' },
                { id: 'form2', name: 'Form 2', status: 'draft' },
            ];

            global.fetch = vi.fn().mockResolvedValue(
                mockFetchResponse({ ok: true, data: mockForms })
            );

            const result = await listForms(true);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:4000/api/form/list?includeUnpublished=true',
                { cache: 'no-store' }
            );
            expect(result).toEqual(mockForms);
        });

        it('should return empty array on error', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                mockFetchResponse({ ok: false }, false)
            );

            const result = await listForms();

            expect(result).toEqual([]);
        });
    });

    describe('loadForm', () => {
        it('should load an existing form', async () => {
            const mockForm = { name: 'Test Form', sections: [] };

            global.fetch = vi.fn().mockResolvedValue(
                mockFetchResponse({ ok: true, data: mockForm })
            );

            const result = await loadForm('test-form');

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:4000/api/form/load/test-form',
                { cache: 'no-store' }
            );
            expect(result).toEqual(mockForm);
        });

        it('should return null for non-existing form', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
            } as Response);

            const result = await loadForm('non-existing');

            expect(result).toBeNull();
        });

        it('should handle response without data wrapper', async () => {
            const mockForm = { name: 'Test Form', sections: [] };

            global.fetch = vi.fn().mockResolvedValue(
                mockFetchResponse(mockForm)
            );

            const result = await loadForm('test-form');

            expect(result).toEqual(mockForm);
        });
    });

    describe('formExists', () => {
        it('should return true for existing form', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                mockFetchResponse({ ok: true, data: true })
            );

            const result = await formExists('test-form');

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:4000/api/form/exists/test-form'
            );
            expect(result).toBe(true);
        });

        it('should return false for non-existing form', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                mockFetchResponse({ ok: true, data: false })
            );

            const result = await formExists('non-existing');

            expect(result).toBe(false);
        });

        it('should return false on error', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
            } as Response);

            const result = await formExists('test-form');

            expect(result).toBe(false);
        });
    });

    describe('saveForm', () => {
        it('should save a form successfully', async () => {
            const mockSpec = { name: 'Test Form', sections: [] };

            global.fetch = vi.fn().mockResolvedValue(
                mockFetchResponse({ ok: true })
            );

            await saveForm(mockSpec as any);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:4000/api/form/save',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(mockSpec),
                }
            );
        });

        it('should throw error on failed save', async () => {
            const mockSpec = { name: 'Test Form', sections: [] };

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
            } as Response);

            await expect(saveForm(mockSpec as any)).rejects.toThrow('save failed: 500');
        });
    });

    describe('deleteForm', () => {
        it('should delete a form successfully', async () => {
            global.fetch = vi.fn().mockResolvedValue(
                mockFetchResponse({ ok: true })
            );

            await deleteForm('test-form');

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:4000/api/form/delete/test-form',
                { method: 'DELETE' }
            );
        });

        it('should throw error on failed delete', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
            } as Response);

            await expect(deleteForm('test-form')).rejects.toThrow('delete failed: 500');
        });
    });

    describe('rateSimpleField', () => {
        it('should rate a simple field successfully', async () => {
            const mockRating = {
                rate: 'valid' as const,
                comment: 'Good answer',
            };

            global.fetch = vi.fn().mockResolvedValue(
                mockFetchResponse({ ok: true, data: mockRating })
            );

            const result = await rateSimpleField('What is your name?', 'John Doe');

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:4000/api/llm/rate-simple-field',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question: 'What is your name?',
                        value: 'John Doe',
                        examples: undefined,
                        promptConfig: undefined,
                    }),
                }
            );
            expect(result).toEqual(mockRating);
        });

        it('should include examples and promptConfig', async () => {
            const mockRating = { rate: 'valid' as const, comment: 'Good' };
            const examples = ['Jane Smith', 'Bob Johnson'];
            const promptConfig = { task: 'Validate name', role: 'validator' };

            global.fetch = vi.fn().mockResolvedValue(
                mockFetchResponse({ ok: true, data: mockRating })
            );

            await rateSimpleField('What is your name?', 'John Doe', examples, promptConfig);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:4000/api/llm/rate-simple-field',
                expect.objectContaining({
                    body: JSON.stringify({
                        question: 'What is your name?',
                        value: 'John Doe',
                        examples,
                        promptConfig,
                    }),
                })
            );
        });

        it('should return error object on HTTP error', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                text: () => Promise.resolve('Server error'),
            } as Response);

            const result = await rateSimpleField('What is your name?', 'John Doe');

            expect(result).toEqual({
                error: true,
                message: 'Validation service unavailable , try again later.',
            });
        });

        it('should return error object on network error', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const result = await rateSimpleField('What is your name?', 'John Doe');

            expect(result).toEqual({
                error: true,
                message: 'Validation failed: Network error',
            });
        });
    });

    describe('rateDetailedRow', () => {
        it('should rate a detailed row successfully', async () => {
            const mockRating = {
                rate: 'valid' as const,
                comment: 'Good answer',
            };

            global.fetch = vi.fn().mockResolvedValue(
                mockFetchResponse({ ok: true, data: mockRating })
            );

            const result = await rateDetailedRow(
                'Product details',
                'Product Name',
                'Widget Pro',
                { price: '99.99' }
            );

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:4000/api/llm/rate-detailed-row',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question: 'Product details',
                        attributeName: 'Product Name',
                        attributeValue: 'Widget Pro',
                        rowData: { price: '99.99' },
                        examples: undefined,
                        promptConfig: undefined,
                    }),
                }
            );
            expect(result).toEqual(mockRating);
        });

        it('should return error object on HTTP error', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 503,
                text: () => Promise.resolve('Service unavailable'),
            } as Response);

            const result = await rateDetailedRow(
                'Product details',
                'Product Name',
                'Widget Pro',
                {}
            );

            expect(result).toEqual({
                error: true,
                message: 'Validation service unavailable , try again later.',
            });
        });
    });

    describe('exportFormToPdf', () => {
        it('should export form to PDF successfully', async () => {
            const mockSpec = { name: 'Test Form', sections: [] };
            const mockValue = { field1: 'value1' };
            const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });

            // Mock document.createElement
            const mockAnchor = {
                href: '',
                download: '',
                click: vi.fn(),
            } as any;

            vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
            vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor);
            vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockAnchor);

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                blob: () => Promise.resolve(mockBlob),
            } as Response);

            await exportFormToPdf(mockSpec as any, mockValue);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:4000/api/form/export-pdf',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ spec: mockSpec, value: mockValue }),
                }
            );

            expect(mockAnchor.download).toBe('test-form.pdf');
            expect(mockAnchor.click).toHaveBeenCalled();
        });

        it('should throw error on failed export', async () => {
            const mockSpec = { name: 'Test Form', sections: [] };
            const mockValue = { field1: 'value1' };

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                json: () => Promise.resolve({ error: 'Export failed' }),
            } as Response);

            await expect(exportFormToPdf(mockSpec as any, mockValue)).rejects.toThrow(
                'Export failed'
            );
        });
    });

    describe('isFieldRatingError', () => {
        it('should return true for error response', () => {
            const errorResponse = { error: true as const, message: 'Test error' };
            expect(isFieldRatingError(errorResponse)).toBe(true);
        });

        it('should return false for success response', () => {
            const successResponse = { rate: 'valid' as const, comment: 'Good' };
            expect(isFieldRatingError(successResponse)).toBe(false);
        });

        it('should return false for null', () => {
            expect(isFieldRatingError(null)).toBe(false);
        });
    });
});
