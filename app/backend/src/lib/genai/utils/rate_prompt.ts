/**
 * Copyright (c) 2026 EAExpertise
 *
 * This software is licensed under the MIT License with Commons Clause.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to use,
 * copy, modify, merge, publish, distribute, and sublicense the Software,
 * subject to the conditions of the MIT License and the Commons Clause.
 *
 * Commercial use of this Software is strictly prohibited unless explicit prior
 * written permission is obtained from EAExpertise.
 *
 * The Software may be used for internal business purposes, research,
 * evaluation, or other non-commercial purposes.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

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

// ============================================================================
// System Prompt Creation
// ============================================================================

/**
 * Creates a system prompt from a template with optional custom overrides.
 * The system prompt includes role, task, guidelines, and final instructions.
 */
export function createSystemPrompt(
  tpl: FieldRateTemplate,
  customPrompt?: { task?: string; role?: string; guidelines?: string }
): string {
  let systemPrompt = '';
  systemPrompt += `Role:\n${customPrompt?.role || tpl.role}\n\n`;
  systemPrompt += `Task:\n${customPrompt?.task || tpl.task}\n\n`;
  systemPrompt += `Guidelines:\n${customPrompt?.guidelines || tpl.guidelines}\n\n`;
  systemPrompt += `Final Instruction:\n${tpl.final_instruction}`;
  return systemPrompt;
}

// ============================================================================
// Simple Field Rating
// ============================================================================

export function loadSimpleFieldRateTemplate(): FieldRateTemplate {
  return loadTemplate('rate_simple_field.yaml');
}

/**
 * Creates a user prompt for simple field rating by replacing template variables.
 */
export function createSimpleFieldUserPrompt(
  tpl: FieldRateTemplate,
  vars: { question: string; value: string; examples: string }
): string {
  let input = tpl.context;
  input = input.replace('{{question}}', vars.question);
  input = input.replace('{{value}}', vars.value);
  input = input.replace('{{examples}}', vars.examples);
  return input;
}

// ============================================================================
// Detailed Row Rating
// ============================================================================

export function loadDetailedRowRateTemplate(): FieldRateTemplate {
  return loadTemplate('rate_detailed_row.yaml');
}

/**
 * Creates a user prompt for detailed row rating by replacing template variables.
 */
export function createDetailedRowUserPrompt(
  tpl: FieldRateTemplate,
  vars: { question: string; attributeName: string; attributeValue: string; rowData: string; examples: string }
): string {
  let input = tpl.context;
  input = input.replace('{{question}}', vars.question);
  input = input.replace('{{attributeName}}', vars.attributeName);
  input = input.replace('{{attributeValue}}', vars.attributeValue);
  input = input.replace('{{rowData}}', vars.rowData);
  input = input.replace('{{examples}}', vars.examples);
  return input;
}

