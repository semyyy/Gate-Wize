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

export function validateSpec(obj: any): string[] {
  const errs: string[] = [];
  if (!obj || typeof obj !== 'object') {
    errs.push('Root must be an object.');
    return errs;
  }
  if (!obj.name || typeof obj.name !== 'string') errs.push('`name` is required (string).');
  if (!obj.status || !['draft', 'published'].includes(obj.status)) {
    errs.push('`status` is required and must be either "draft" or "published".');
  }
  if (!Array.isArray(obj.sections)) errs.push('`sections` must be an array.');
  if (Array.isArray(obj.sections)) {
    obj.sections.forEach((s: any, si: number) => {
      const sectionContext = s.title ? `Section "${s.title}"` : `Section at index ${si}`;

      if (!s || typeof s !== 'object') return errs.push(`${sectionContext} invalid object.`);
      if (!s.title || typeof s.title !== 'string') errs.push(`${sectionContext}: missing title.`);
      if (!Array.isArray(s.questions)) errs.push(`${sectionContext}: questions must be an array.`);

      (s.questions ?? []).forEach((q: any, qi: number) => {
        const questionText = q.question && q.question.length > 30 ? q.question.substring(0, 30) + '...' : q.question;
        const questionContext = `${sectionContext} > Question ${qi + 1}${questionText ? ` ("${questionText}")` : ''}`;

        if (!q || typeof q !== 'object') return errs.push(`${sectionContext} > Question ${qi + 1}: invalid object.`);
        if (!['simple', 'option', 'detailed', 'image'].includes(q.type)) errs.push(`${questionContext}: invalid type.`);
        if (q.type === 'simple' && q.aiValidation !== undefined && typeof q.aiValidation !== 'boolean') {
          errs.push(`${questionContext}: aiValidation must be a boolean.`);
        }
        if (!q.question || typeof q.question !== 'string') errs.push(`${questionContext}: question text is required.`);

        if (q.type === 'option' && !Array.isArray(q.options)) errs.push(`${questionContext}: options must be an array.`);
        if (q.type === 'detailed' && !Array.isArray(q.attributes)) errs.push(`${questionContext}: attributes must be an array.`);

        if (q.type === 'detailed' && Array.isArray(q.attributes)) {
          let totalWidth = 0;
          q.attributes.forEach((attr: any, ai: number) => {
            const attrName = attr.name || `Attribute ${ai + 1}`;
            const attrContext = `${questionContext} > ${attrName}`;

            if (!attr || typeof attr !== 'object') return errs.push(`${questionContext} > Attribute ${ai + 1}: invalid object.`);
            if (!attr.name || typeof attr.name !== 'string') errs.push(`${questionContext} > Attribute ${ai + 1}: name is required.`);

            if (attr.width !== undefined) {
              if (typeof attr.width !== 'number' || attr.width <= 0 || attr.width > 1) {
                errs.push(`${attrContext}: width must be between 0 and 1.`);
              } else {
                totalWidth += attr.width;
              }
            }
            if (attr.inputType !== undefined && !['input', 'textarea'].includes(attr.inputType)) {
              errs.push(`${attrContext}: inputType must be 'input' or 'textarea'.`);
            }
            if (attr.aiValidation !== undefined && typeof attr.aiValidation !== 'boolean') {
              errs.push(`${attrContext}: aiValidation must be a boolean.`);
            }
          });

          if (totalWidth > 1) {
            errs.push(`${questionContext}: Total width of attributes (${totalWidth}) exceeds 1 (100%).`);
          }
        }
      });
    });
  }
  return errs;
}