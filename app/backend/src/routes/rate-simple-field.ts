import { Router } from 'express';
import { LLMClient } from '../lib/genai/llmClient';
import { buildFieldRatingSchema } from '../lib/genai/utils/schema_preparation';
import { loadSimpleFieldRateTemplate, composeSimpleFieldRatePrompt } from '../lib/genai/utils/rate_prompt';

const router = Router();

router.post('/rate-simple-field', async (req, res) => {
    try {
        const { question, value, examples, promptConfig } = req.body ?? {};

        // Validate inputs
        if (!question || typeof question !== 'string') {
            return res.status(400).json({ ok: false, error: 'Missing or invalid question' });
        }

        if (!value || typeof value !== 'string' || value.trim().length === 0) {
            return res.status(400).json({ ok: false, error: 'Missing or empty value' });
        }

        const llm = new LLMClient();
        const tpl = loadSimpleFieldRateTemplate();

        // Format examples
        const examplesStr = Array.isArray(examples) && examples.length > 0
            ? examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')
            : 'No examples provided.';

        const prompt = composeSimpleFieldRatePrompt(tpl, {
            question,
            value,
            examples: examplesStr,
        }, promptConfig);

        const schema = buildFieldRatingSchema();
        const result = await llm.generateStructured({ prompt, schema });

        // Only include suggestionResponse when rate is partial or invalid
        const response = { ...result };
        if (response.rate === 'valid' || !response.rate) {
            delete response.suggestionResponse;
        }

        res.json({ ok: true, data: response });
    } catch (e) {
        console.error('Simple field rating error:', e);
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});

export default router;
