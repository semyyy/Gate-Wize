import rateLimit from 'express-rate-limit';
import 'dotenv/config';

const globalWindowMs = Number(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS) || 15 * 60 * 1000;
const globalMax = Number(process.env.RATE_LIMIT_GLOBAL_MAX) || 100;
const llmWindowMs = Number(process.env.RATE_LIMIT_LLM_WINDOW_MS) || 60 * 1000;
const llmMax = Number(process.env.RATE_LIMIT_LLM_MAX) || 10;

export const globalLimiter = rateLimit({
    windowMs: globalWindowMs,
    max: globalMax,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        status: 429,
        // message: 'Too many requests, please try again later.',
        message: `Too many requests, please try again later. Limit is ${globalMax} requests per ${globalWindowMs / 1000} seconds.`,
    },
});

export const llmLimiter = rateLimit({
    windowMs: llmWindowMs,
    max: llmMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        // message: 'Too many LLM requests, please try again later.',
        message: `Too many LLM requests, please try again later. Limit is ${llmMax} requests per ${llmWindowMs / 1000} seconds.`,
    },
});
