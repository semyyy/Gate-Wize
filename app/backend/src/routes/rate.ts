import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';
import { LLMClient } from '../lib/genai/llmClient';
import { z } from 'zod';

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

type RateTemplate = {
  task: string;
  context: { form_spec: string; user_input: string };
  guidelines: string;
  output_schema: string;
  final_instruction: string;
};

function loadTemplate(): RateTemplate {
  const baseDir = path.dirname(fileURLToPath(import.meta.url));
  const p = path.join(baseDir, '..', 'lib', 'genai', 'prompts', 'rate.yaml');
  // In ts-node/tsc out dir, adjust if necessary
  const alt = path.join(process.cwd(), 'src', 'lib', 'genai', 'prompts', 'rate.yaml');
  const filePath = fs.existsSync(p) ? p : alt;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const doc = yaml.load(raw) as any;
  return doc as RateTemplate;
}

function composePrompt(tpl: RateTemplate, vars: { spec_json: string; value_json: string }): string {
  const sections = [
    tpl.task,
    tpl.context?.form_spec?.replace('{{spec_json}}', vars.spec_json) ?? '',
    tpl.context?.user_input?.replace('{{value_json}}', vars.value_json) ?? '',
    tpl.guidelines,
    tpl.output_schema,
    tpl.final_instruction,
  ].filter(Boolean);
  return sections.join('\n\n');
}

router.post('/rate', async (req, res) => {
  try {
    const { spec, value } = req.body ?? {};
    if (!spec || typeof spec !== 'object' || !Array.isArray(spec.sections)) {
      return res.json({ ok: true, data: { ratings: {} } });
    }

    const llm = new LLMClient();
    const tpl = loadTemplate();
    const prompt = composePrompt(tpl, {
      spec_json: JSON.stringify(spec, null, 2),
      value_json: JSON.stringify(value ?? {}, null, 2),
    });

    const result = await llm.generateStructured({ prompt, schema: RATING_SCHEMA });
    res.json({ ok: true, data: result });
  } catch (e) {
    console.error(e);
    res.status(200).json({ ok: true, data: { ratings: {} } });
  }
});

export default router;