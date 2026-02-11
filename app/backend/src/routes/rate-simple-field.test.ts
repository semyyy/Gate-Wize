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
import router from './rate-simple-field.js';
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
    loadSimpleFieldRateTemplate: vi.fn(() => ({ role: 'test', task: 'test', guidelines: 'test' })),
    createSystemPrompt: vi.fn(() => 'System prompt'),
    createSimpleFieldUserPrompt: vi.fn(() => 'User prompt'),
}));

describe('Rate Simple Field Route', () => {
    let app: express.Application;

    beforeEach(() => {
        vi.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use('/api/llm', router);
        app.use(errorHandler);
    });

    describe('POST /rate-simple-field', () => {
        it('should rate a valid simple field', async () => {
            const { LLMClient } = await import('../lib/genai/llmClient.js');
            const mockGenerateStructured = vi.fn().mockResolvedValue({
                rate: 'valid',
                comment: 'Good answer',
            });
            (LLMClient as any).mockImplementation(() => ({
                generateStructured: mockGenerateStructured,
            }));

            const response = await request(app)
                .post('/api/llm/rate-simple-field')
                .send({
                    question: 'What is your name?',
                    value: 'John Doe',
                    examples: ['Jane Smith', 'Bob Johnson'],
                })
                .expect(200);

            expect(response.body).toEqual({
                ok: true,
                data: {
                    rate: 'valid',
                    comment: 'Good answer',
                },
            });
            expect(mockGenerateStructured).toHaveBeenCalledWith({
                systemPrompt: 'System prompt',
                userPrompt: 'User prompt',
                schema: { type: 'object' },
            });
        });

        it('should include suggestionResponse for partial/invalid ratings', async () => {
            const { LLMClient } = await import('../lib/genai/llmClient.js');
            const mockGenerateStructured = vi.fn().mockResolvedValue({
                rate: 'partial',
                comment: 'Incomplete answer',
                suggestionResponse: 'Please provide your full name',
            });
            (LLMClient as any).mockImplementation(() => ({
                generateStructured: mockGenerateStructured,
            }));

            const response = await request(app)
                .post('/api/llm/rate-simple-field')
                .send({
                    question: 'What is your name?',
                    value: 'John',
                })
                .expect(200);

            expect(response.body.data).toEqual({
                rate: 'partial',
                comment: 'Incomplete answer',
                suggestionResponse: 'Please provide your full name',
            });
        });

        it('should exclude suggestionResponse for valid ratings', async () => {
            const { LLMClient } = await import('../lib/genai/llmClient.js');
            const mockGenerateStructured = vi.fn().mockResolvedValue({
                rate: 'valid',
                comment: 'Good answer',
                suggestionResponse: 'This should be removed',
            });
            (LLMClient as any).mockImplementation(() => ({
                generateStructured: mockGenerateStructured,
            }));

            const response = await request(app)
                .post('/api/llm/rate-simple-field')
                .send({
                    question: 'What is your name?',
                    value: 'John Doe',
                })
                .expect(200);

            expect(response.body.data).toEqual({
                rate: 'valid',
                comment: 'Good answer',
            });
            expect(response.body.data.suggestionResponse).toBeUndefined();
        });

        it('should return 400 for missing question', async () => {
            const response = await request(app)
                .post('/api/llm/rate-simple-field')
                .send({
                    value: 'John Doe',
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'Missing or invalid question',
            });
        });

        it('should return 400 for invalid question type', async () => {
            const response = await request(app)
                .post('/api/llm/rate-simple-field')
                .send({
                    question: 123,
                    value: 'John Doe',
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'Missing or invalid question',
            });
        });

        it('should return 400 for missing value', async () => {
            const response = await request(app)
                .post('/api/llm/rate-simple-field')
                .send({
                    question: 'What is your name?',
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'Missing or empty value',
            });
        });

        it('should return 400 for empty value', async () => {
            const response = await request(app)
                .post('/api/llm/rate-simple-field')
                .send({
                    question: 'What is your name?',
                    value: '   ',
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'Missing or empty value',
            });
        });

        it('should handle examples array correctly', async () => {
            const { LLMClient } = await import('../lib/genai/llmClient.js');
            const { createSimpleFieldUserPrompt } = await import('../lib/genai/utils/rate_prompt.js');
            const mockGenerateStructured = vi.fn().mockResolvedValue({
                rate: 'valid',
                comment: 'Good',
            });
            (LLMClient as any).mockImplementation(() => ({
                generateStructured: mockGenerateStructured,
            }));

            await request(app)
                .post('/api/llm/rate-simple-field')
                .send({
                    question: 'What is your name?',
                    value: 'John Doe',
                    examples: ['Jane Smith', 'Bob Johnson', 'Alice Williams'],
                })
                .expect(200);

            expect(createSimpleFieldUserPrompt).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    examples: '1. Jane Smith\n2. Bob Johnson\n3. Alice Williams',
                })
            );
        });

        it('should handle missing examples', async () => {
            const { LLMClient } = await import('../lib/genai/llmClient.js');
            const { createSimpleFieldUserPrompt } = await import('../lib/genai/utils/rate_prompt.js');
            const mockGenerateStructured = vi.fn().mockResolvedValue({
                rate: 'valid',
                comment: 'Good',
            });
            (LLMClient as any).mockImplementation(() => ({
                generateStructured: mockGenerateStructured,
            }));

            await request(app)
                .post('/api/llm/rate-simple-field')
                .send({
                    question: 'What is your name?',
                    value: 'John Doe',
                })
                .expect(200);

            expect(createSimpleFieldUserPrompt).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    examples: 'No examples provided.',
                })
            );
        });

        it('should return 400 for question exceeding 1000 characters', async () => {
            const longQuestion = 'a'.repeat(1001);
            const response = await request(app)
                .post('/api/llm/rate-simple-field')
                .send({
                    question: longQuestion,
                    value: 'John Doe',
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'Question exceeds maximum length of 1000 characters',
            });
        });

        it('should return 400 for value exceeding 10000 characters', async () => {
            const longValue = 'a'.repeat(10001);
            const response = await request(app)
                .post('/api/llm/rate-simple-field')
                .send({
                    question: 'What is your name?',
                    value: longValue,
                })
                .expect(400);

            expect(response.body).toMatchObject({
                ok: false,
                error: 'Value exceeds maximum length of 10000 characters',
            });
        });

        it('should return 400 for examples array exceeding 10 items', async () => {
            const tooManyExamples = Array(11).fill('Example');
            const response = await request(app)
                .post('/api/llm/rate-simple-field')
                .send({
                    question: 'What is your name?',
                    value: 'John Doe',
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
                .post('/api/llm/rate-simple-field')
                .send({
                    question: 'What is your name?',
                    value: 'John Doe',
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
                .post('/api/llm/rate-simple-field')
                .send({
                    question: 'What is your name?',
                    value: 'John Doe',
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
                .post('/api/llm/rate-simple-field')
                .send({
                    question: 'What is your name?',
                    value: 'John Doe',
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
            const maxValue = 'b'.repeat(10000);
            const maxExamples = Array(10).fill('c'.repeat(1000));

            const response = await request(app)
                .post('/api/llm/rate-simple-field')
                .send({
                    question: maxQuestion,
                    value: maxValue,
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
                .post('/api/llm/rate-simple-field')
                .send({
                    question: 'What is your name?',
                    value: 'John Doe',
                })
                .expect(500);

            expect(response.body).toMatchObject({
                ok: false,
            });
            expect(response.body.error).toBeTruthy();
        });
    });
});
