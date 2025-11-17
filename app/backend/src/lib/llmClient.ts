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
    this.defaultModel = opts.defaultModel ?? 'gemini-1.5-flash';
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
    const gen = this.getModel(model);
    const result = await gen.generateContent(this.toInput(prompt));
    const text = result.response.text();
    return text;
  }

  async generateStructured<T extends z.ZodTypeAny>(args: {
    prompt: string | ChatMessage[];
    schema: T;
    model?: string;
  }): Promise<z.infer<T>> {
    const jsonSchema = zodToJsonSchema(args.schema, 'Result');
    const gen = this.getModel(args.model, jsonSchema as any);

    const result = await gen.generateContent(this.toInput(args.prompt));

    const text = result.response.text();
    const parsed = JSON.parse(text);
    return args.schema.parse(parsed);
  }
}
