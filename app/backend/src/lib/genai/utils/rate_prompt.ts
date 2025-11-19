import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';

export type RateTemplate = {
  task: string;
  context: string;
  guidelines: string;
  output_schema?: string;
  final_instruction?: string;
};

export function loadRateTemplate(): RateTemplate {
  const __filename = fileURLToPath(import.meta.url);
  const baseDir = path.dirname(__filename);
  const p = path.join(baseDir, '..', 'prompts', 'rate.yaml');
  const alt = path.join(process.cwd(), 'src', 'lib', 'genai', 'prompts', 'rate.yaml');
  const filePath = fs.existsSync(p) ? p : alt;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const doc = yaml.load(raw) as any;
  return doc as RateTemplate;
}

export function composeRatePrompt(tpl: RateTemplate, vars: { spec_json: string; value_json: string }): string {
  const filledContext = tpl.context
    ? tpl.context.replace('{{spec_json}}', vars.spec_json).replace('{{value_json}}', vars.value_json)
    : '';
  const sections = [tpl.task, filledContext, tpl.guidelines, tpl.output_schema ?? '', tpl.final_instruction ?? ''].filter(
    Boolean
  );
  return sections.join('\n\n');
}
