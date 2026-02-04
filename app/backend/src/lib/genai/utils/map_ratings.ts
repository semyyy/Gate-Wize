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

export type Rate = 'invalid' | 'partial' | 'valid';

type RatingItem = { comment: string; rate?: Rate };

// Normalize strings for grouping/matching
const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();

/**
 * Maps LLM response to a nested object keyed by Section Title -> Question Text.
 * Accepts either:
 * - Flattened array: [{ sectionTitle, comment, rate }, ...]
 * - Nested: { sections: [{ questions: [{ comment, rate }] }] }
 */
export function mapRatingsByNames(
  spec: any,
  result: any
): Record<string, Record<string, { comment: string; rate?: Rate }>> {
  const nested: Record<string, Record<string, { comment: string; rate?: Rate }>> = {};

  // Helper to ensure section bucket
  const ensureSection = (title: string) => {
    if (!nested[title]) nested[title] = {};
    return nested[title];
  };

  if (Array.isArray(result)) {
    // Group by sectionTitle if present
    const grouped = new Map<string, RatingItem[]>();
    for (const item of result as any[]) {
      const key = norm((item as any).sectionTitle);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push({ comment: String(item.comment ?? ''), rate: (item.rate as Rate) ?? undefined });
    }

    // Flat iterator if titles don't match
    const flatIter = (result as any[]).map((i) => ({ comment: String(i.comment ?? ''), rate: (i.rate as Rate) ?? undefined }));
    let flatIdx = 0;

    const sections: any[] = Array.isArray(spec?.sections) ? spec.sections : [];
    sections.forEach((sec, si) => {
      const secTitle = String(sec?.title ?? `Section ${si + 1}`);
      const bucket = ensureSection(secTitle);
      const arr = grouped.get(norm(sec?.title)) ?? [];
      let idx = 0;
      const questions: any[] = Array.isArray(sec?.questions) ? sec.questions : [];
      questions.forEach((q, qi) => {
        const picked = idx < arr.length ? arr[idx++] : flatIter[flatIdx++];
        if (!picked) return;
        const qName = String(q?.question ?? `Question ${qi + 1}`);
        bucket[qName] = { comment: picked.comment, rate: picked.rate };
      });
    });
    return nested;
  }

  // Nested result fallback: { sections: [{ questions: [{ comment, rate }] }] }
  const sectionsRes: any[] = Array.isArray(result?.sections) ? result.sections : [];
  const sectionsSpec: any[] = Array.isArray(spec?.sections) ? spec.sections : [];
  sectionsRes.forEach((secRes, si) => {
    const specSection = sectionsSpec[si];
    const secTitle = String(specSection?.title ?? `Section ${si + 1}`);
    const bucket = ensureSection(secTitle);
    const qsRes: any[] = Array.isArray(secRes?.questions) ? secRes.questions : [];
    const qsSpec: any[] = Array.isArray(specSection?.questions) ? specSection.questions : [];
    qsRes.forEach((qRes, qi) => {
      const qSpec = qsSpec[qi];
      const qName = String(qSpec?.question ?? `Question ${qi + 1}`);
      bucket[qName] = { comment: String(qRes?.comment ?? ''), rate: (qRes?.rate as Rate) ?? undefined };
    });
  });
  return nested;
}

/**
 * Maps LLM response to path-keyed ratings expected by the frontend:
 * { "s{sectionIndex}.q{questionIndex}": { comment, rate } }
 * Supports flattened array or nested response.
 */
export function mapRatingsByPaths(
  spec: any,
  result: any
): Record<string, { comment: string; rate?: Rate }> {
  const out: Record<string, { comment: string; rate?: Rate }> = {};

  const sections: any[] = Array.isArray(spec?.sections) ? spec.sections : [];

  if (Array.isArray(result)) {
    // Flattened: group by sectionTitle and map in order; fallback to flat.
    const grouped = new Map<string, RatingItem[]>();
    for (const item of result as any[]) {
      const key = norm((item as any).sectionTitle);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push({ comment: String(item.comment ?? ''), rate: (item.rate as Rate) ?? undefined });
    }

    const flatIter = (result as any[]).map((i) => ({ comment: String(i.comment ?? ''), rate: (i.rate as Rate) ?? undefined }));
    let flatIdx = 0;

    sections.forEach((sec, si) => {
      const arr = grouped.get(norm(sec?.title)) ?? [];
      let idx = 0;
      const questions: any[] = Array.isArray(sec?.questions) ? sec.questions : [];
      questions.forEach((_q, qi) => {
        const picked = idx < arr.length ? arr[idx++] : flatIter[flatIdx++];
        if (!picked) return;
        const pathKey = `s${si}.q${qi}`;
        out[pathKey] = { comment: picked.comment, rate: picked.rate };
      });
    });
    return out;
  }

  const sectionsRes: any[] = Array.isArray(result?.sections) ? result.sections : [];
  sectionsRes.forEach((secRes, si) => {
    const qsRes: any[] = Array.isArray(secRes?.questions) ? secRes.questions : [];
    qsRes.forEach((qRes, qi) => {
      const pathKey = `s${si}.q${qi}`;
      out[pathKey] = { comment: String(qRes?.comment ?? ''), rate: (qRes?.rate as Rate) ?? undefined };
    });
  });
  return out;
}
