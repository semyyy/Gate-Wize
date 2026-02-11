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
import router from './rate-detailed-row.js';
import { errorHandler } from '../middleware/errorHandler.js';

// Mock the LLM client
vi.mock('../lib/genai/llmClient.js', () => ({
    LLMClient: vi.fn().mockImplementation(() => ({
        generateStructured: vi.fn(),
    })),
}));

// Mock the utils
vi.mock('../lib/genai/utils/schema_preparation.js', () => ({
    buildFieldRatingSchema: vi.fn(() => ({ type: 'object' })),
}));

vi.mock('../lib/genai/utils/rate_prompt.js', () => ({
    loadDetailedRowRateTemplate: vi.fn(() => ({ role: 'test', task: 'test', guidelines: 'test' })),
    createSystemPrompt: vi.fn(() => 'System prompt'),
    createDetailedRowUserPrompt: vi.fn(() => 'User prompt'),
}));

describe('Rate Detailed Row Route', () => {
    let app: express.Application;

    beforeEach(() => {
        vi.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use('/api/llm', router);
        app.use(errorHandler);
    });

    describe('POST /rate-detailed-row', () => {
        it('should rate a valid detailed row', async () => {
            const { LLMClient } = await import('../lib/genai/llmClient.js');
            const mockGenerateStructured = vi.fn().mockResolvedValue({
                rate: 'valid',
                comment: 'Good answer',
            });
            (LLMClient as any).mockImplementation(() => ({
                generateStructured: mockGenerateStructured,
            }));

            const response = await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeName: 'Product Name',
                    attributeValue: 'Widget Pro',
                    rowData: { price: '99.99', category: 'Electronics' },
                    examples: ['Gadget Plus', 'Device Max'],
                })
                .expect(200);

            expect(response.body).toEqual({
                ok: true,
                data: {
                    rate: 'valid',
                    comment: 'Good answer',
                },
            });
        });

        it('should include suggestionResponse for partial/invalid ratings', async () => {
            const { LLMClient } = await import('../lib/genai/llmClient.js');
            const mockGenerateStructured = vi.fn().mockResolvedValue({
                rate: 'invalid',
                comment: 'Invalid product name',
                suggestionResponse: 'Widget Pro 2.0',
            });
            (LLMClient as any).mockImplementation(() => ({
                generateStructured: mockGenerateStructured,
            }));

            const response = await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeName: 'Product Name',
                    attributeValue: 'xyz',
                    rowData: {},
                })
                .expect(200);

            expect(response.body.data).toEqual({
                rate: 'invalid',
                comment: 'Invalid product name',
                suggestionResponse: 'Widget Pro 2.0',
            });
        });

        it('should exclude suggestionResponse for valid ratings', async () => {
            const { LLMClient } = await import('../lib/genai/llmClient.js');
            const mockGenerateStructured = vi.fn().mockResolvedValue({
                rate: 'valid',
                comment: 'Good',
                suggestionResponse: 'Should be removed',
            });
            (LLMClient as any).mockImplementation(() => ({
                generateStructured: mockGenerateStructured,
            }));

            const response = await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeName: 'Product Name',
                    attributeValue: 'Widget Pro',
                    rowData: {},
                })
                .expect(200);

            expect(response.body.data.suggestionResponse).toBeUndefined();
        });

        it('should return 400 for missing question', async () => {
            const response = await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    attributeName: 'Product Name',
                    attributeValue: 'Widget Pro',
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'Missing or invalid question',
            });
        });

        it('should return 400 for missing attributeName', async () => {
            const response = await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeValue: 'Widget Pro',
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'Missing or invalid attributeName',
            });
        });

        it('should return 400 for missing attributeValue', async () => {
            const response = await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeName: 'Product Name',
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'Missing or empty attributeValue',
            });
        });

        it('should return 400 for empty attributeValue', async () => {
            const response = await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeName: 'Product Name',
                    attributeValue: '   ',
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'Missing or empty attributeValue',
            });
        });

        it('should format rowData correctly', async () => {
            const { LLMClient } = await import('../lib/genai/llmClient.js');
            const { createDetailedRowUserPrompt } = await import('../lib/genai/utils/rate_prompt.js');
            const mockGenerateStructured = vi.fn().mockResolvedValue({
                rate: 'valid',
                comment: 'Good',
            });
            (LLMClient as any).mockImplementation(() => ({
                generateStructured: mockGenerateStructured,
            }));

            await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeName: 'Product Name',
                    attributeValue: 'Widget Pro',
                    rowData: { price: '99.99', category: 'Electronics', stock: '50' },
                })
                .expect(200);

            expect(createDetailedRowUserPrompt).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    rowData: '- price: 99.99\n- category: Electronics\n- stock: 50',
                })
            );
        });

        it('should filter out null/undefined/empty values from rowData', async () => {
            const { LLMClient } = await import('../lib/genai/llmClient.js');
            const { createDetailedRowUserPrompt } = await import('../lib/genai/utils/rate_prompt.js');
            const mockGenerateStructured = vi.fn().mockResolvedValue({
                rate: 'valid',
                comment: 'Good',
            });
            (LLMClient as any).mockImplementation(() => ({
                generateStructured: mockGenerateStructured,
            }));

            await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeName: 'Product Name',
                    attributeValue: 'Widget Pro',
                    rowData: { price: '99.99', category: null, stock: '', description: undefined },
                })
                .expect(200);

            expect(createDetailedRowUserPrompt).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    rowData: '- price: 99.99',
                })
            );
        });

        it('should handle missing rowData', async () => {
            const { LLMClient } = await import('../lib/genai/llmClient.js');
            const { createDetailedRowUserPrompt } = await import('../lib/genai/utils/rate_prompt.js');
            const mockGenerateStructured = vi.fn().mockResolvedValue({
                rate: 'valid',
                comment: 'Good',
            });
            (LLMClient as any).mockImplementation(() => ({
                generateStructured: mockGenerateStructured,
            }));

            await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeName: 'Product Name',
                    attributeValue: 'Widget Pro',
                })
                .expect(200);

            expect(createDetailedRowUserPrompt).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    rowData: 'No additional row data.',
                })
            );
        });

        it('should format examples correctly', async () => {
            const { LLMClient } = await import('../lib/genai/llmClient.js');
            const { createDetailedRowUserPrompt } = await import('../lib/genai/utils/rate_prompt.js');
            const mockGenerateStructured = vi.fn().mockResolvedValue({
                rate: 'valid',
                comment: 'Good',
            });
            (LLMClient as any).mockImplementation(() => ({
                generateStructured: mockGenerateStructured,
            }));

            await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeName: 'Product Name',
                    attributeValue: 'Widget Pro',
                    rowData: {},
                    examples: ['Gadget Plus', 'Device Max', 'Tool Ultra'],
                })
                .expect(200);

            expect(createDetailedRowUserPrompt).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    examples: '1. Gadget Plus\n2. Device Max\n3. Tool Ultra',
                })
            );
        });

        it('should return 400 for question exceeding 1000 characters', async () => {
            const longQuestion = 'a'.repeat(1001);
            const response = await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: longQuestion,
                    attributeName: 'Product Name',
                    attributeValue: 'Widget Pro',
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'Question exceeds maximum length of 1000 characters',
            });
        });

        it('should return 400 for attributeName exceeding 200 characters', async () => {
            const longAttributeName = 'a'.repeat(201);
            const response = await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeName: longAttributeName,
                    attributeValue: 'Widget Pro',
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'AttributeName exceeds maximum length of 200 characters',
            });
        });

        it('should return 400 for attributeValue exceeding 10000 characters', async () => {
            const longAttributeValue = 'a'.repeat(10001);
            const response = await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeName: 'Product Name',
                    attributeValue: longAttributeValue,
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'AttributeValue exceeds maximum length of 10000 characters',
            });
        });

        it('should return 400 for examples array exceeding 10 items', async () => {
            const tooManyExamples = Array(11).fill('Example');
            const response = await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeName: 'Product Name',
                    attributeValue: 'Widget Pro',
                    examples: tooManyExamples,
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'Examples array exceeds maximum of 10 items',
            });
        });

        it('should return 400 for individual example exceeding 1000 characters', async () => {
            const longExample = 'a'.repeat(1001);
            const response = await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeName: 'Product Name',
                    attributeValue: 'Widget Pro',
                    examples: ['Short example', longExample],
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'Example at index 1 exceeds maximum length of 1000 characters',
            });
        });

        it('should return 400 for non-string example in array', async () => {
            const response = await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeName: 'Product Name',
                    attributeValue: 'Widget Pro',
                    examples: ['Valid example', 123, 'Another valid'],
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'Example at index 1 must be a string',
            });
        });

        it('should return 400 for non-array examples', async () => {
            const response = await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeName: 'Product Name',
                    attributeValue: 'Widget Pro',
                    examples: 'Not an array',
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'Examples must be an array',
            });
        });

        it('should accept inputs at maximum allowed lengths', async () => {
            const { LLMClient } = await import('../lib/genai/llmClient.js');
            const mockGenerateStructured = vi.fn().mockResolvedValue({
                rate: 'valid',
                comment: 'Good',
            });
            (LLMClient as any).mockImplementation(() => ({
                generateStructured: mockGenerateStructured,
            }));

            const maxQuestion = 'a'.repeat(1000);
            const maxAttributeName = 'b'.repeat(200);
            const maxAttributeValue = 'c'.repeat(10000);
            const maxExamples = Array(10).fill('d'.repeat(1000));

            const response = await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: maxQuestion,
                    attributeName: maxAttributeName,
                    attributeValue: maxAttributeValue,
                    examples: maxExamples,
                })
                .expect(200);

            expect(response.body.ok).toBe(true);
        });

        it('should return 500 on LLM error', async () => {
            const { LLMClient } = await import('../lib/genai/llmClient.js');
            const mockGenerateStructured = vi.fn().mockRejectedValue(new Error('LLM error'));
            (LLMClient as any).mockImplementation(() => ({
                generateStructured: mockGenerateStructured,
            }));

            const response = await request(app)
                .post('/api/llm/rate-detailed-row')
                .send({
                    question: 'Provide product details',
                    attributeName: 'Product Name',
                    attributeValue: 'Widget Pro',
                    rowData: {},
                })
                .expect(500);

            expect(response.body).toMatchObject({
                ok: false,
            });
            expect(response.body.error).toBeTruthy();
        });
    });
});
