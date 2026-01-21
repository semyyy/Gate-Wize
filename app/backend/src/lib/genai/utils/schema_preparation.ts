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
