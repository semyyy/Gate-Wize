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

    // Determine which fields have non-empty values
    const vObj: Record<string, unknown> = value && typeof value === 'object' ? value : {};
    const hasContent = (v: unknown): boolean => {
      if (v === null || v === undefined) return false;
      if (typeof v === 'string') return v.trim().length > 0;
      if (Array.isArray(v)) {
        return v.some((row) => {
          if (row && typeof row === 'object') return Object.values(row as any).some(hasContent);
          if (typeof row === 'string') return row.trim().length > 0;
          return Boolean(row);
        });
      }
      if (typeof v === 'object') return Object.values(v as any).some(hasContent);
      return true;
    };

    // Build set of path keys that are filled: s{si}.q{qi}
    const filledPaths = new Set<string>();
    (spec.sections as any[]).forEach((_sec: any, si: number) => {
      const questions: any[] = Array.isArray(_sec?.questions) ? _sec.questions : [];
      questions.forEach((_q: any, qi: number) => {
        const key = `s${si}.q${qi}`;
        if (hasContent((vObj as any)[key])) filledPaths.add(key);
      });
    });

    // Prune value to only include filled paths and related subkeys (e.g., justification)
    const prunedValue: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(vObj)) {
      if (filledPaths.has(k)) {
        prunedValue[k] = v;
      } else {
        // Include supplemental keys like sX.qY.justification only if main path filled
        const baseMatch = k.match(/^(s\d+\.q\d+)/);
        const base = baseMatch?.[1];
        if (base && filledPaths.has(base)) prunedValue[k] = v;
      }
    }

    const prompt = composeRatePrompt(tpl, {
      spec_json: JSON.stringify(spec, null, 2),
      value_json: JSON.stringify(prunedValue, null, 2),
    });

    // Build a response schema aligned with the spec (flattened array)
    const responseSchema = buildRatingResponseSchema();
    const result = await llm.generateStructured({ prompt, schema: responseSchema });

    // Map to frontend shape using a dedicated utility
    const ratings = mapRatingsByPaths(spec, result);
    // Keep only ratings for filled paths
    const filtered = Object.fromEntries(
      Object.entries(ratings).filter(([path]) => filledPaths.has(path))
    );
    res.json({ ok: true, data: { ratings: filtered } });
  } catch (e) {
    console.error(e);
    res.status(200).json({ ok: true, data: { ratings: {} } });
  }
});

export default router;