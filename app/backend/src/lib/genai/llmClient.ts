import { GoogleGenerativeAI, type GenerativeModel, type GenerateContentRequest, type Part } from '@google/generative-ai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export type LLMClientOptions = {
  apiKey?: string;
  defaultModel?: string;
  temperature?: number;
  maxOutputTokens?: number;
};

type ChatMessage = { role: 'user' | 'model' | 'system'; parts: Array<{ text: string }> };

export class LLMClient {
  private client: GoogleGenerativeAI;
  private defaultModel: string;
  private temperature: number;
  private maxOutputTokens?: number;

  constructor(opts: LLMClientOptions = {}) {
    const apiKey = opts.apiKey ?? process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is required');
    }
    this.client = new GoogleGenerativeAI(apiKey);
    const envModel = process.env.GEMINI_MODEL ?? process.env.GOOGLE_MODEL;
    this.defaultModel = opts.defaultModel ?? envModel ?? 'gemini-2.5-flash';
    this.temperature = opts.temperature ?? 0.2;
    this.maxOutputTokens = opts.maxOutputTokens;
  }

  private getModel(model?: string, schema?: ReturnType<typeof zodToJsonSchema>): GenerativeModel {
    const modelName = model ?? this.defaultModel;
    const gen = this.client.getGenerativeModel({
      model: modelName,
      ...(schema
        ? {
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: schema as any,
              temperature: this.temperature,
              ...(this.maxOutputTokens ? { maxOutputTokens: this.maxOutputTokens } : {}),
            },
          }
        : {
            generationConfig: {
              temperature: this.temperature,
              ...(this.maxOutputTokens ? { maxOutputTokens: this.maxOutputTokens } : {}),
            },
          }),
    });
    return gen;
  }

  private toInput(prompt: string | ChatMessage[]): string | GenerateContentRequest | (string | Part)[] {
    if (typeof prompt === 'string') return prompt;
    return { contents: prompt as any } satisfies GenerateContentRequest;
  }

  async generateText(prompt: string | ChatMessage[], model?: string): Promise<string> {
    const candidates = this.modelCandidates(model);
    let lastErr: unknown = undefined;
    for (const m of candidates) {
      try {
        const gen = this.getModel(m);
        const result = await gen.generateContent(this.toInput(prompt));
        return result.response.text();
      } catch (e: any) {
        lastErr = e;
        if (!this.isModelNotFound(e)) throw e;
        // try next candidate
      }
    }
    throw lastErr ?? new Error('All models failed for generateText');
  }

  async generateStructured<T extends z.ZodTypeAny>(args: {
    prompt: string | ChatMessage[];
    schema: T;
    model?: string;
  }): Promise<z.infer<T>> {
    const jsonSchema = zodToJsonSchema(args.schema, 'Result');
    const candidates = this.modelCandidates(args.model);
    let lastErr: unknown = undefined;
    for (const m of candidates) {
      try {
        const gen = this.getModel(m, jsonSchema as any);
        const result = await gen.generateContent(this.toInput(args.prompt));
        const text = result.response.text();
        const parsed = JSON.parse(text);
        return args.schema.parse(parsed);
      } catch (e: any) {
        lastErr = e;
        if (!this.isModelNotFound(e)) throw e;
        // try next model if not found/unsupported
      }
    }
    throw lastErr ?? new Error('All models failed for generateStructured');
  }

  private modelCandidates(preferred?: string): string[] {
    const list = [
      preferred,
      this.defaultModel,
      'gemini-2.5-flash',
    ].filter(Boolean) as string[];
    // de-duplicate while preserving order
    return Array.from(new Set(list));
  }

  private isModelNotFound(e: any): boolean {
    const msg = String(e?.message ?? e ?? '').toLowerCase();
    return e?.status === 404 || msg.includes('not found') || msg.includes('is not found for api version');
  }
}
