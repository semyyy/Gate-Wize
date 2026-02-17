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

import { Router } from 'express';
import { LLMClient } from '../lib/genai/llmClient.js';
import { buildFieldRatingSchema } from '../lib/genai/utils/schema_preparation.js';
import { loadDetailedRowRateTemplate, createSystemPrompt, createDetailedRowUserPrompt } from '../lib/genai/utils/rate_prompt.js';
import { ValidationError } from '../middleware/errorHandler.js';

const router = Router();

router.post('/rate-detailed-row', async (req, res, next) => {
    try {
        const { question, attributeName, attributeValue, rowData, examples, promptConfig } = req.body ?? {};

        // Validate inputs
        if (!question || typeof question !== 'string') {
            throw new ValidationError('Missing or invalid question');
        }

        const maxQuestionLength = Number(process.env.INPUT_MAX_LENGTH_QUESTION) || 1000;
        if (question.length > maxQuestionLength) {
            throw new ValidationError(`Question exceeds maximum length of ${maxQuestionLength} characters`);
        }

        if (!attributeName || typeof attributeName !== 'string') {
            throw new ValidationError('Missing or invalid attributeName');
        }

        const maxAttributeNameLength = Number(process.env.INPUT_MAX_LENGTH_ATTRIBUTE_NAME) || 200;
        if (attributeName.length > maxAttributeNameLength) {
            throw new ValidationError(`AttributeName exceeds maximum length of ${maxAttributeNameLength} characters`);
        }

        if (!attributeValue || typeof attributeValue !== 'string' || attributeValue.trim().length === 0) {
            throw new ValidationError('Missing or empty attributeValue');
        }

        const maxAttributeValueLength = Number(process.env.INPUT_MAX_LENGTH_ATTRIBUTE_VALUE) || 10000;
        if (attributeValue.length > maxAttributeValueLength) {
            throw new ValidationError(`AttributeValue exceeds maximum length of ${maxAttributeValueLength} characters`);
        }

        // Validate examples array
        if (examples !== undefined && examples !== null) {
            if (!Array.isArray(examples)) {
                throw new ValidationError('Examples must be an array');
            }

            const maxExamplesCount = Number(process.env.INPUT_MAX_EXAMPLES_COUNT) || 10;
            if (examples.length > maxExamplesCount) {
                throw new ValidationError(`Examples array exceeds maximum of ${maxExamplesCount} items`);
            }

            for (let i = 0; i < examples.length; i++) {
                if (typeof examples[i] !== 'string') {
                    throw new ValidationError(`Example at index ${i} must be a string`);
                }
                const maxExampleLength = Number(process.env.INPUT_MAX_LENGTH_EXAMPLE) || 1000;
                if (examples[i].length > maxExampleLength) {
                    throw new ValidationError(`Example at index ${i} exceeds maximum length of ${maxExampleLength} characters`);
                }
            }
        }

        const llm = new LLMClient();
        const tpl = loadDetailedRowRateTemplate();

        // Format examples
        const examplesStr = Array.isArray(examples) && examples.length > 0
            ? examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')
            : 'No examples provided.';

        // Format row data
        const rowDataStr = rowData && typeof rowData === 'object'
            ? Object.entries(rowData)
                .filter(([_, v]) => v !== null && v !== undefined && String(v).trim() !== '')
                .map(([k, v]) => `- ${k}: ${v}`)
                .join('\n')
            : 'No additional row data.';

        // Create system and user prompts separately
        const systemPrompt = createSystemPrompt(tpl, promptConfig);
        const userPrompt = createDetailedRowUserPrompt(tpl, {
            question,
            attributeName,
            attributeValue,
            rowData: rowDataStr,
            examples: examplesStr,
        });

        const schema = buildFieldRatingSchema();
        const result = await llm.generateStructured({
            systemPrompt,
            userPrompt,
            schema
        });

        // Only include suggestionResponse when rate is partial or invalid
        const response = { ...result };
        if (response.rate === 'valid' || !response.rate) {
            delete response.suggestionResponse;
        }

        res.json({ ok: true, data: response });
    } catch (e) {
        next(e);
    }
});

export default router;
