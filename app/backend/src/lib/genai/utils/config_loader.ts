import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';

/**
 * Load a YAML file placed under `src/lib/genai/` by path relative to that folder.
 * Example: loadYamlFromGenai('config/llm.yaml')
 */
export function loadYamlFromGenai(relativePath: string): any {
  const __filename = fileURLToPath(import.meta.url);
  const baseDir = path.dirname(__filename); // .../genai/utils
  const genaiDir = path.join(baseDir, '..'); // .../genai
  const p = path.join(genaiDir, relativePath);
  const alt = path.join(process.cwd(), 'src', 'lib', 'genai', relativePath);
  const filePath = fs.existsSync(p) ? p : alt;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(raw) as any;
}

export function loadLLMConfig(): any {
  try {
    return loadYamlFromGenai('config/llm.yaml');
  } catch {
    return {};
  }
}
