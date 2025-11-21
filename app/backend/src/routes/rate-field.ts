import { Router } from 'express';
import { LLMClient } from '../lib/genai/llmClient';
import { buildFieldRatingSchema } from '../lib/genai/utils/schema_preparation';
import { loadFieldRateTemplate, composeFieldRatePrompt } from '../lib/genai/utils/rate_prompt';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();


router.post('/rate-field', async (req, res) => {
    try {
        const { question, value, examples } = req.body ?? {};

        // Validate inputs
        if (!question || typeof question !== 'string') {
            return res.status(400).json({ ok: false, error: 'Missing or invalid question' });
        }

        if (!value || typeof value !== 'string' || value.trim().length === 0) {
            return res.status(400).json({ ok: false, error: 'Missing or empty value' });
        }

        const llm = new LLMClient();
        const tpl = loadFieldRateTemplate();

        // Format examples
        const examplesStr = Array.isArray(examples) && examples.length > 0
            ? examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')
            : 'No examples provided.';

        const prompt = composeFieldRatePrompt(tpl, {
            question,
            value,
            examples: examplesStr,
        });

        const schema = buildFieldRatingSchema();
        const result = await llm.generateStructured({ prompt, schema });

        res.json({ ok: true, data: result });
    } catch (e) {
        console.error('Field rating error:', e);
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});

export default router;
