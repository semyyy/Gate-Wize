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
import express from 'express';
import request from 'supertest';
import router from './form.js';
import { errorHandler } from '../middleware/errorHandler.js';

// Mock the formService module
vi.mock('../lib/data/services/formService.js', () => ({
    saveForm: vi.fn(),
    loadForm: vi.fn(),
    listForms: vi.fn(),
    deleteForm: vi.fn(),
    formExists: vi.fn(),
}));

describe('Form Routes', () => {
    let app: express.Application;

    beforeEach(() => {
        vi.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use('/api/form', router);
        // Add error handler middleware to catch and format errors
        app.use(errorHandler);
    });

    describe('POST /save/', () => {
        it('should save a form with valid spec', async () => {
            const { saveForm } = await import('../lib/data/services/formService.js');
            const mockSaveForm = saveForm as any;
            mockSaveForm.mockResolvedValue({ key: 'form/test-form.json' });

            const spec = { name: 'Test Form', sections: [] };

            const response = await request(app)
                .post('/api/form/save/')
                .send(spec)
                .expect(200);

            expect(response.body).toEqual({ ok: true });
            expect(mockSaveForm).toHaveBeenCalledWith('test-form', spec);
        });

        it('should handle spec wrapped in { spec } object', async () => {
            const { saveForm } = await import('../lib/data/services/formService.js');
            const mockSaveForm = saveForm as any;
            mockSaveForm.mockResolvedValue({ key: 'form/test-form.json' });

            const spec = { name: 'Test Form', sections: [] };

            await request(app)
                .post('/api/form/save/')
                .send({ spec })
                .expect(200);

            expect(mockSaveForm).toHaveBeenCalledWith('test-form', spec);
        });

        it('should normalize form name to id', async () => {
            const { saveForm } = await import('../lib/data/services/formService.js');
            const mockSaveForm = saveForm as any;
            mockSaveForm.mockResolvedValue({ key: 'form/my-test-form.json' });

            const spec = { name: 'My Test Form!', sections: [] };

            await request(app)
                .post('/api/form/save/')
                .send(spec)
                .expect(200);

            expect(mockSaveForm).toHaveBeenCalledWith('my-test-form', spec);
        });

        it('should return 500 on error', async () => {
            const { saveForm } = await import('../lib/data/services/formService.js');
            const mockSaveForm = saveForm as any;
            mockSaveForm.mockRejectedValue(new Error('Save failed'));

            const spec = { name: 'Test Form', sections: [] };

            const response = await request(app)
                .post('/api/form/save/')
                .send(spec)
                .expect(500);

            expect(response.body.ok).toBe(false);
            expect(response.body.error).toBe('Save failed');
        });
    });

    describe('GET /load/:id', () => {
        it('should load an existing form', async () => {
            const { loadForm } = await import('../lib/data/services/formService.js');
            const mockLoadForm = loadForm as any;
            const mockForm = { name: 'Test Form', sections: [] };
            mockLoadForm.mockResolvedValue(mockForm);

            const response = await request(app)
                .get('/api/form/load/test-form')
                .expect(200);

            expect(response.body).toEqual({ ok: true, data: mockForm });
            expect(mockLoadForm).toHaveBeenCalledWith('test-form');
        });

        it('should return 500 for non-existing form', async () => {
            const { loadForm } = await import('../lib/data/services/formService.js');
            const mockLoadForm = loadForm as any;
            mockLoadForm.mockRejectedValue(new Error('Not found'));

            const response = await request(app)
                .get('/api/form/load/non-existing')
                .expect(500);

            expect(response.body.ok).toBe(false);
            expect(response.body.error).toBe('Not found');
        });
    });

    describe('GET /exists/:id', () => {
        it('should return true for existing form', async () => {
            const { formExists } = await import('../lib/data/services/formService.js');
            const mockFormExists = formExists as any;
            mockFormExists.mockResolvedValue(true);

            const response = await request(app)
                .get('/api/form/exists/test-form')
                .expect(200);

            expect(response.body).toEqual({ ok: true, data: true });
        });

        it('should return false for non-existing form', async () => {
            const { formExists } = await import('../lib/data/services/formService.js');
            const mockFormExists = formExists as any;
            mockFormExists.mockResolvedValue(false);

            const response = await request(app)
                .get('/api/form/exists/non-existing')
                .expect(200);

            expect(response.body).toEqual({ ok: true, data: false });
        });
    });

    describe('GET /list', () => {
        it('should list published forms by default', async () => {
            const { listForms } = await import('../lib/data/services/formService.js');
            const mockListForms = listForms as any;
            const mockForms = [
                { id: 'form1', name: 'Form 1', status: 'published' },
                { id: 'form2', name: 'Form 2', status: 'published' },
            ];
            mockListForms.mockResolvedValue(mockForms);

            const response = await request(app)
                .get('/api/form/list')
                .expect(200);

            expect(response.body).toEqual({ ok: true, data: mockForms });
            expect(mockListForms).toHaveBeenCalledWith(false);
        });

        it('should include unpublished forms when requested', async () => {
            const { listForms } = await import('../lib/data/services/formService.js');
            const mockListForms = listForms as any;
            const mockForms = [
                { id: 'form1', name: 'Form 1', status: 'published' },
                { id: 'form2', name: 'Form 2', status: 'draft' },
            ];
            mockListForms.mockResolvedValue(mockForms);

            const response = await request(app)
                .get('/api/form/list?includeUnpublished=true')
                .expect(200);

            expect(response.body).toEqual({ ok: true, data: mockForms });
            expect(mockListForms).toHaveBeenCalledWith(true);
        });
    });

    describe('DELETE /delete/:id', () => {
        it('should delete an existing form', async () => {
            const { deleteForm } = await import('../lib/data/services/formService.js');
            const mockDeleteForm = deleteForm as any;
            mockDeleteForm.mockResolvedValue(undefined);

            const response = await request(app)
                .delete('/api/form/delete/test-form')
                .expect(200);

            expect(response.body).toEqual({ ok: true });
            expect(mockDeleteForm).toHaveBeenCalledWith('test-form');
        });

        it('should return 500 on error', async () => {
            const { deleteForm } = await import('../lib/data/services/formService.js');
            const mockDeleteForm = deleteForm as any;
            mockDeleteForm.mockRejectedValue(new Error('Delete failed'));

            const response = await request(app)
                .delete('/api/form/delete/test-form')
                .expect(500);

            expect(response.body.ok).toBe(false);
            expect(response.body.error).toBe('Delete failed');
        });
    });
});
