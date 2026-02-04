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

import { GoogleGenAI } from "@google/genai";
import * as dotenv from 'dotenv';
import zodToJsonSchema from "zod-to-json-schema";
import { loadLLMConfig } from './utils/config_loader.js';
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

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) throw new Error('Missing API key: set env or update genai/config/llm.yaml');
    this.client = new GoogleGenAI({ apiKey });

    const cfgModel = this.config?.model;
    this.defaultModel = opts.defaultModel ?? cfgModel
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
      console.log('System Prompt:', args.systemPrompt);
      console.log('User Prompt:', args.userPrompt);

      const response = await this.client.models.generateContent({
        model: args.model || this.defaultModel,
        contents: args.userPrompt,
        config: {
          systemInstruction: args.systemPrompt,
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
      const parsed = args.schema.parse(JSON.parse(response.text!));
      console.log('Parsed response:', parsed);
      return parsed;
    } catch (e) {
      console.error('Error during LLM generation:', e);
      throw e;
    }
  }

}
