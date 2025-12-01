import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';


type FieldRateTemplate = {
  task: string;
  role: string;
  context: string;
  guidelines: string;
  final_instruction: string;
};

// Helper function to load a template by filename
function loadTemplate(filename: string): FieldRateTemplate {
  const __filename = fileURLToPath(import.meta.url);
  const baseDir = path.dirname(__filename);
  const p = path.join(baseDir, '..', 'lib', 'genai', 'prompts', filename);
  const alt = path.join(process.cwd(), 'src', 'lib', 'genai', 'prompts', filename);
  const finalPath = fs.existsSync(p) ? p : alt;
  const doc = yaml.load(fs.readFileSync(finalPath, 'utf8'));
  return doc as FieldRateTemplate;
}

// Simple field rating
export function loadSimpleFieldRateTemplate(): FieldRateTemplate {
  return loadTemplate('rate_simple_field.yaml');
}

export function composeSimpleFieldRatePrompt(
  tpl: FieldRateTemplate,
  vars: { question: string; value: string; examples: string },
  customPrompt?: { task?: string; role?: string; guidelines?: string }
): string {
  let prompt = '';
  prompt += `Task:\n${customPrompt?.task || tpl.task}\n\n`;
  prompt += `Role:\n${customPrompt?.role || tpl.role}\n\n`;

  let context = tpl.context;
  context = context.replace('{{question}}', vars.question);
  context = context.replace('{{value}}', vars.value);
  context = context.replace('{{examples}}', vars.examples);
  prompt += `Context:\n${context}\n\n`;

  prompt += `Guidelines:\n${customPrompt?.guidelines || tpl.guidelines}\n\n`;
  prompt += `Final Instruction:\n${tpl.final_instruction}\n`;

  return prompt;
}

// Detailed row rating
export function loadDetailedRowRateTemplate(): FieldRateTemplate {
  return loadTemplate('rate_detailed_row.yaml');
}

export function composeDetailedRowRatePrompt(
  tpl: FieldRateTemplate,
  vars: { question: string; attributeName: string; attributeValue: string; rowData: string; examples: string },
  customPrompt?: { task?: string; role?: string; guidelines?: string }
): string {
  let prompt = '';
  prompt += `Task:\n${customPrompt?.task || tpl.task}\n\n`;
  prompt += `Role:\n${customPrompt?.role || tpl.role}\n\n`;

  let context = tpl.context;
  context = context.replace('{{question}}', vars.question);
  context = context.replace('{{attributeName}}', vars.attributeName);
  context = context.replace('{{attributeValue}}', vars.attributeValue);
  context = context.replace('{{rowData}}', vars.rowData);
  context = context.replace('{{examples}}', vars.examples);
  prompt += `Context:\n${context}\n\n`;

  prompt += `Guidelines:\n${customPrompt?.guidelines || tpl.guidelines}\n\n`;
  prompt += `Final Instruction:\n${tpl.final_instruction}\n`;

  return prompt;
}

// Legacy functions (kept for backward compatibility, can be removed later)
export function loadFieldRateTemplate(): FieldRateTemplate {
  return loadTemplate('rate_field.yaml');
}

export function composeFieldRatePrompt(
  tpl: FieldRateTemplate,
  vars: { question: string; value: string; examples: string; questionText: string; rowContext: string }
): string {
  let prompt = '';
  prompt += `Task:\n${tpl.task}\n\n`;
  prompt += `Role:\n${tpl.role}\n\n`;

  let context = tpl.context;
  context = context.replace('{{question}}', vars.question);
  context = context.replace('{{value}}', vars.value);
  context = context.replace('{{examples}}', vars.examples);
  context = context.replace('{{questionText}}', vars.questionText);
  context = context.replace('{{rowContext}}', vars.rowContext);
  prompt += `Context:\n${context}\n\n`;

  prompt += `Guidelines:\n${tpl.guidelines}\n\n`;
  prompt += `Final Instruction:\n${tpl.final_instruction}\n`;

  return prompt;
}
