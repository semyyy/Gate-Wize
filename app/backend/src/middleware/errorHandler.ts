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

import type { Request, Response, NextFunction } from 'express';

/**
 * Base class for application errors
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);

        // Set the prototype explicitly to maintain instanceof checks
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

/**
 * Validation error class for input validation failures
 */
export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400, true);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404, true);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

/**
 * Error logger middleware
 * Logs all errors with full details server-side
 */
export function errorLogger(err: Error, req: Request, _res: Response, next: NextFunction): void {
    // Log error details server-side
    console.error('Error occurred:', {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
        },
        ...(err instanceof AppError && {
            statusCode: err.statusCode,
            isOperational: err.isOperational,
        }),
    });

    // Pass error to next error handler
    next(err);
}

/**
 * Global error handler middleware
 * Sanitizes errors before sending to client
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
    const isProduction = process.env.NODE_ENV === 'production';

    // Default error response
    let statusCode = 500;
    let message = 'Internal server error';
    let details: any = undefined;

    // Handle known AppError instances
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;

        // In development, include stack trace
        if (!isProduction) {
            details = {
                stack: err.stack,
                isOperational: err.isOperational,
            };
        }
    } else {
        // Unknown errors - sanitize in production
        if (isProduction) {
            // Generic message for production
            message = 'An unexpected error occurred';
        } else {
            // In development, show actual error message
            message = err.message || 'Internal server error';
            details = {
                stack: err.stack,
                name: err.name,
            };
        }
    }

    // Send error response
    const response: any = {
        ok: false,
        error: message,
    };

    if (details) {
        response.details = details;
    }

    res.status(statusCode).json(response);
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
    next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
