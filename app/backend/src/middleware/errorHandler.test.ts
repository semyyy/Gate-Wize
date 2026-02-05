/**
 * Copyright (c) 2026 EAExpertise
 *
 * This software is licensed under the MIT License with Commons Clause.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errorHandler, AppError, ValidationError } from './errorHandler';
import { Request, Response } from 'express';

describe('Error Handler Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: any;
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        mockReq = {};
        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        mockNext = vi.fn();
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    it('should handle AppError correctly', () => {
        const error = new AppError('Test error', 418);

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(418);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            ok: false,
            error: 'Test error'
        }));
    });

    it('should handle ValidationError correctly', () => {
        const error = new ValidationError('Invalid input');

        errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            ok: false,
            error: 'Invalid input'
        }));
    });

    describe('in Production', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'production';
        });

        it('should sanitize unknown errors', () => {
            const error = new Error('Database connection failed');

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                ok: false,
                error: 'An unexpected error occurred'
            });
        });

        it('should NOT sanitize AppErrors', () => {
            const error = new AppError('Operational error', 503);

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(503);
            expect(mockRes.json).toHaveBeenCalledWith({
                ok: false,
                error: 'Operational error'
            });
        });

        it('should NOT include stack traces', () => {
            const error = new AppError('Test error');

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith(expect.not.objectContaining({
                details: expect.anything()
            }));
        });
    });

    describe('in Development', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'development';
        });

        it('should include error details for unknown errors', () => {
            const error = new Error('Database error');

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                ok: false,
                error: 'Database error',
                details: expect.objectContaining({
                    name: 'Error',
                    stack: expect.any(String)
                })
            }));
        });

        it('should include stack traces for AppErrors', () => {
            const error = new AppError('Test error');

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                details: expect.objectContaining({
                    stack: expect.any(String)
                })
            }));
        });
    });
});
