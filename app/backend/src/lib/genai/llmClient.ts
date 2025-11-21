import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
import zodToJsonSchema from "zod-to-json-schema";
import { loadLLMConfig } from './utils/config_loader';
dotenv.config();


export type LLMClientOptions = {
  apiKey?: string;
  defaultModel?: string;
  temperature?: number;
  maxOutputTokens?: number;
};

type ChatMessage = { role: 'user' | 'model' | 'system'; parts: Array<{ text: string }> };

export class LLMClient {
  private client: GoogleGenAI;
  private defaultModel: string;
  private temperature: number;
  private maxOutputTokens?: number;
  private config: any;

  constructor(opts: LLMClientOptions = {}) {
    // Load YAML config
    this.config = this.loadYamlConfig();
    const apiKey = process.env.GEMINI_API_KEY 
  
    if (!apiKey) throw new Error('Missing API key: set env or update genai/config/llm.yaml');
    this.client = new GoogleGenAI({ apiKey });

    const cfgModel = this.config?.model;
    this.defaultModel = opts.defaultModel ?? cfgModel 
    this.temperature = opts.temperature ?? this.config?.generation?.temperature ?? 0.2;
  }

  private loadYamlConfig() { return loadLLMConfig(); }



async generateStructured(args: {
  prompt: string | ChatMessage[];
  schema: any;
  model?: string;
}) {

  try {

    const jsonSchema = typeof args.schema === 'object' && !('parse' in (args.schema || {}))
      ? args.schema
      : zodToJsonSchema(args.schema);
    console.log('JSON Schema:', jsonSchema);
    console.log('Prompt:', args.prompt);
    const response = await this.client.models.generateContent({
      model: args.model || this.defaultModel,
      contents: args.prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
      },
    });


    const parsed = args.schema.parse(JSON.parse(response.text!));
    console.log('Parsed response:', parsed);
    return parsed;
  } catch (e) {
    console.error('Error during LLM generation:', e);
    throw e;
  }
}

}
