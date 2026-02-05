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
import { saveForm, loadForm, listForms, deleteForm, formExists } from './formService.js';

// Mock the minioClient module
vi.mock('../minioClient.js', () => ({
    putJSON: vi.fn(),
    getJSON: vi.fn(),
    client: {
        listObjectsV2: vi.fn(),
        removeObject: vi.fn(),
    },
    ensureBucket: vi.fn(),
}));

describe('formService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('saveForm', () => {
        it('should save a form with valid spec', async () => {
            const { putJSON } = await import('../minioClient.js');
            const mockPutJSON = putJSON as any;
            mockPutJSON.mockResolvedValue(undefined);

            const spec = { name: 'Test Form', sections: [] };
            const result = await saveForm('test-form', spec);

            expect(mockPutJSON).toHaveBeenCalledWith('form/test-form.json', spec);
            expect(result).toEqual({ key: 'form/test-form.json' });
        });

        it('should handle object specs correctly', async () => {
            const { putJSON } = await import('../minioClient.js');
            const mockPutJSON = putJSON as any;
            mockPutJSON.mockResolvedValue(undefined);

            const spec = { name: 'Test Form', status: 'draft' };
            await saveForm('test-form', spec);

            expect(mockPutJSON).toHaveBeenCalledWith('form/test-form.json', expect.objectContaining(spec));
        });
    });

    describe('loadForm', () => {
        it('should load an existing form', async () => {
            const { getJSON } = await import('../minioClient.js');
            const mockGetJSON = getJSON as any;
            const mockForm = { name: 'Test Form', sections: [] };
            mockGetJSON.mockResolvedValue(mockForm);

            const result = await loadForm('test-form');

            expect(mockGetJSON).toHaveBeenCalledWith('form/test-form.json');
            expect(result).toEqual(mockForm);
        });

        it('should handle non-existing forms', async () => {
            const { getJSON } = await import('../minioClient.js');
            const mockGetJSON = getJSON as any;
            mockGetJSON.mockRejectedValue(new Error('Not found'));

            await expect(loadForm('non-existing')).rejects.toThrow('Not found');
        });
    });

    describe('formExists', () => {
        it('should return true for existing forms', async () => {
            const { getJSON } = await import('../minioClient.js');
            const mockGetJSON = getJSON as any;
            mockGetJSON.mockResolvedValue({ name: 'Test Form' });

            const result = await formExists('test-form');

            expect(result).toBe(true);
        });

        it('should return false for non-existing forms', async () => {
            const { getJSON } = await import('../minioClient.js');
            const mockGetJSON = getJSON as any;
            mockGetJSON.mockResolvedValue(null);

            const result = await formExists('non-existing');

            expect(result).toBe(false);
        });
    });

    describe('listForms', () => {
        it('should list all published forms by default', async () => {
            const { client, ensureBucket, getJSON } = await import('../minioClient.js');
            const mockEnsureBucket = ensureBucket as any;
            const mockGetJSON = getJSON as any;

            mockEnsureBucket.mockResolvedValue(undefined);

            // Mock the stream
            const mockStream = {
                on: vi.fn((event, handler) => {
                    if (event === 'data') {
                        handler({ name: 'form/test-form.json' });
                        handler({ name: 'form/another-form.json' });
                    } else if (event === 'end') {
                        handler();
                    }
                    return mockStream;
                }),
            };

            (client.listObjectsV2 as any).mockReturnValue(mockStream);

            mockGetJSON
                .mockResolvedValueOnce({ name: 'Test Form', status: 'published' })
                .mockResolvedValueOnce({ name: 'Another Form', status: 'draft' });

            const result = await listForms(false);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({ id: 'test-form', name: 'Test Form', status: 'published' });
        });

        it('should include unpublished forms when requested', async () => {
            const { client, ensureBucket, getJSON } = await import('../minioClient.js');
            const mockEnsureBucket = ensureBucket as any;
            const mockGetJSON = getJSON as any;

            mockEnsureBucket.mockResolvedValue(undefined);

            const mockStream = {
                on: vi.fn((event, handler) => {
                    if (event === 'data') {
                        handler({ name: 'form/test-form.json' });
                        handler({ name: 'form/draft-form.json' });
                    } else if (event === 'end') {
                        handler();
                    }
                    return mockStream;
                }),
            };

            (client.listObjectsV2 as any).mockReturnValue(mockStream);

            mockGetJSON
                .mockResolvedValueOnce({ name: 'Test Form', status: 'published' })
                .mockResolvedValueOnce({ name: 'Draft Form', status: 'draft' });

            const result = await listForms(true);

            expect(result).toHaveLength(2);
            expect(result).toEqual([
                { id: 'test-form', name: 'Test Form', status: 'published' },
                { id: 'draft-form', name: 'Draft Form', status: 'draft' },
            ]);
        });
    });

    describe('deleteForm', () => {
        it('should delete an existing form', async () => {
            const { client } = await import('../minioClient.js');
            (client.removeObject as any).mockResolvedValue(undefined);

            await deleteForm('test-form');

            expect(client.removeObject).toHaveBeenCalledWith('forms', 'form/test-form.json');
        });

        it('should ignore NoSuchKey errors', async () => {
            const { client } = await import('../minioClient.js');
            const error = new Error('Not found') as any;
            error.code = 'NoSuchKey';
            (client.removeObject as any).mockRejectedValue(error);

            await expect(deleteForm('non-existing')).resolves.not.toThrow();
        });

        it('should throw other errors', async () => {
            const { client } = await import('../minioClient.js');
            const error = new Error('Server error');
            (client.removeObject as any).mockRejectedValue(error);

            await expect(deleteForm('test-form')).rejects.toThrow('Server error');
        });
    });
});
