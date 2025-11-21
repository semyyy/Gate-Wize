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

export  function loadFieldRateTemplate(): FieldRateTemplate {
    const __filename = fileURLToPath(import.meta.url);
  const baseDir = path.dirname(__filename);
    const p = path.join(baseDir, '..', 'lib', 'genai', 'prompts', 'rate_field.yaml');
    const alt = path.join(process.cwd(), 'src', 'lib', 'genai', 'prompts', 'rate_field.yaml');
    const finalPath = fs.existsSync(p) ? p : alt;
    const doc = yaml.load(fs.readFileSync(finalPath, 'utf8'));
    return doc as FieldRateTemplate;
}

export function composeFieldRatePrompt(
    tpl: FieldRateTemplate,
    vars: { question: string; value: string; examples: string }
): string {
    let prompt = '';
    prompt += `Task:\n${tpl.task}\n\n`;
    prompt += `Role:\n${tpl.role}\n\n`;

    let context = tpl.context;
    context = context.replace('{{question}}', vars.question);
    context = context.replace('{{value}}', vars.value);
    context = context.replace('{{examples}}', vars.examples);
    prompt += `Context:\n${context}\n\n`;

    prompt += `Guidelines:\n${tpl.guidelines}\n\n`;
    prompt += `Final Instruction:\n${tpl.final_instruction}\n`;

    return prompt;
}
