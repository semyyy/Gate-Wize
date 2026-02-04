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
): { systemPrompt: string; userPrompt: string } {
  // Build system prompt with role, task, guidelines, and final instructions
  let systemPrompt = '';
  systemPrompt += `Role:\n${customPrompt?.role || tpl.role}\n\n`;
  systemPrompt += `Task:\n${customPrompt?.task || tpl.task}\n\n`;
  systemPrompt += `Guidelines:\n${customPrompt?.guidelines || tpl.guidelines}\n\n`;
  systemPrompt += `Final Instruction:\n${tpl.final_instruction}`;

  // Build user prompt with the input context
  let input = tpl.context;
  input = input.replace('{{question}}', vars.question);
  input = input.replace('{{value}}', vars.value);
  input = input.replace('{{examples}}', vars.examples);

  return {
    systemPrompt,
    userPrompt: input
  };
}

// Detailed row rating
export function loadDetailedRowRateTemplate(): FieldRateTemplate {
  return loadTemplate('rate_detailed_row.yaml');
}

export function composeDetailedRowRatePrompt(
  tpl: FieldRateTemplate,
  vars: { question: string; attributeName: string; attributeValue: string; rowData: string; examples: string },
  customPrompt?: { task?: string; role?: string; guidelines?: string }
): { systemPrompt: string; userPrompt: string } {
  // Build system prompt with role, task, guidelines, and final instructions
  let systemPrompt = '';
  systemPrompt += `Role:\n${customPrompt?.role || tpl.role}\n\n`;
  systemPrompt += `Task:\n${customPrompt?.task || tpl.task}\n\n`;
  systemPrompt += `Guidelines:\n${customPrompt?.guidelines || tpl.guidelines}\n\n`;
  systemPrompt += `Final Instruction:\n${tpl.final_instruction}`;

  // Build user prompt with the input context
  let input = tpl.context;
  input = input.replace('{{question}}', vars.question);
  input = input.replace('{{attributeName}}', vars.attributeName);
  input = input.replace('{{attributeValue}}', vars.attributeValue);
  input = input.replace('{{rowData}}', vars.rowData);
  input = input.replace('{{examples}}', vars.examples);

  return {
    systemPrompt,
    userPrompt: input
  };
}

