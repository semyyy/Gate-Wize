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

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import formRouter from './routes/form.js';
import rateSimpleFieldRouter from './routes/rate-simple-field.js';
import rateDetailedRowRouter from './routes/rate-detailed-row.js';
import exportPdfRouter from './routes/export-pdf.js';
import { globalLimiter, llmLimiter } from './middleware/rateLimiter.js';
import { errorLogger, errorHandler, notFoundHandler } from './middleware/errorHandler.js';


const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Apply global rate limiter
app.use(globalLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/form', formRouter);
app.use('/api/form', exportPdfRouter);
app.use('/api/llm', llmLimiter, rateSimpleFieldRouter);
app.use('/api/llm', llmLimiter, rateDetailedRowRouter);

// Error handling middleware (must be after all routes)
app.use(notFoundHandler);
app.use(errorLogger);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`[backend] listening on http://localhost:${port}`);
});
