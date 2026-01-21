import { Router } from 'express';
import { LLMClient } from '../lib/genai/llmClient';
import { buildFieldRatingSchema } from '../lib/genai/utils/schema_preparation';
import { loadDetailedRowRateTemplate, composeDetailedRowRatePrompt } from '../lib/genai/utils/rate_prompt';

const router = Router();

router.post('/rate-detailed-row', async (req, res) => {
    try {
        const { question, attributeName, attributeValue, rowData, examples, promptConfig } = req.body ?? {};

        // Validate inputs
        if (!question || typeof question !== 'string') {
            return res.status(400).json({ ok: false, error: 'Missing or invalid question' });
        }

        if (!attributeName || typeof attributeName !== 'string') {
            return res.status(400).json({ ok: false, error: 'Missing or invalid attributeName' });
        }

        if (!attributeValue || typeof attributeValue !== 'string' || attributeValue.trim().length === 0) {
            return res.status(400).json({ ok: false, error: 'Missing or empty attributeValue' });
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

        const prompt = composeDetailedRowRatePrompt(tpl, {
            question,
            attributeName,
            attributeValue,
            rowData: rowDataStr,
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
        console.error('Detailed row rating error:', e);
        res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});

export default router;
