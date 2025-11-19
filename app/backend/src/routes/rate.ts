import { Router } from 'express';
import { LLMClient } from '../lib/genai/llmClient';
import { z } from 'zod';
import { buildRatingResponseSchema } from '../lib/genai/utils/schema_preparation';
import { mapRatingsByPaths } from '../lib/genai/utils/map_ratings';
import { loadRateTemplate, composeRatePrompt, type RateTemplate } from '../lib/genai/utils/rate_prompt';

const router = Router();

type Rate = 'invalid' | 'partial' | 'valid';

const RATING_SCHEMA = z.object({
  ratings: z.record(
    z.object({
      comment: z.string(),
      rate: z.enum(['invalid', 'partial', 'valid']).optional(),
    })
  ),
});

// prompt loading and composition moved to utils/rate_prompt.ts

router.post('/rate', async (req, res) => {
  try {
    const { spec, value } = req.body ?? {};
    if (!spec || typeof spec !== 'object' || !Array.isArray(spec.sections)) {
      return res.json({ ok: true, data: { ratings: {} } });
    }

    const llm = new LLMClient();
    const tpl = loadRateTemplate();
    const prompt = composeRatePrompt(tpl, {
      spec_json: JSON.stringify(spec, null, 2),
      value_json: JSON.stringify(value ?? {}, null, 2),
    });

    // Build a response schema aligned with the spec (flattened array)
    const responseSchema = buildRatingResponseSchema();
    const result = await llm.generateStructured({ prompt, schema: responseSchema });

    // Map to frontend shape using a dedicated utility
    const ratings = mapRatingsByPaths(spec, result);
    res.json({ ok: true, data: { ratings } });
  } catch (e) {
    console.error(e);
    res.status(200).json({ ok: true, data: { ratings: {} } });
  }
});

export default router;