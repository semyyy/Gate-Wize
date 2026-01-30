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

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Flattened schema for LLM-safe response.
 * Output shape:
 * [
 *   {
 *     sectionTitle: string,
 *     comment: string,
 *     rate?: 'invalid' | 'partial' | 'valid'
 *   }
 * ]
 */
export function buildRatingResponseSchema() {
  const QuestionSchema = z.object({
    sectionTitle: z.string(),
    questionText: z.string(),
    comment: z.string(),
    rate: z.enum(['invalid', 'partial', 'valid']).optional(),
  });

  const RootSchema = z.array(QuestionSchema);

  return RootSchema;
}


// TypeScript type
export type FlattenedRatingResponse = z.infer<ReturnType<typeof buildRatingResponseSchema>>;

/**
 * Simple schema for single field rating.
 * Output shape:
 * {
 *   comment: string,
 *   rate?: 'invalid' | 'partial' | 'valid'
 * }
 */
export function buildFieldRatingSchema() {
  return z.object({
    comment: z.string(),
    rate: z.enum(['invalid', 'partial', 'valid']).optional(),
    suggestionResponse: z.string().optional(),
  });
}

// TypeScript type
export type FieldRatingResponse = z.infer<ReturnType<typeof buildFieldRatingSchema>>;
