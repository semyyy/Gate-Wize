export function validateSpec(obj: any): string[] {
  const errs: string[] = [];
  if (!obj || typeof obj !== 'object') {
    errs.push('Root must be an object.');
    return errs;
  }
  if (!obj.name || typeof obj.name !== 'string') errs.push('`name` is required (string).');
  if (!Array.isArray(obj.sections)) errs.push('`sections` must be an array.');
  if (Array.isArray(obj.sections)) {
    obj.sections.forEach((s: any, si: number) => {
      if (!s || typeof s !== 'object') errs.push(`sections[${si}] must be an object.`);
      if (!s.title || typeof s.title !== 'string') errs.push(`sections[${si}].title is required (string).`);
      if (!Array.isArray(s.questions)) errs.push(`sections[${si}].questions must be an array.`);
      (s.questions ?? []).forEach((q: any, qi: number) => {
        if (!q || typeof q !== 'object') return errs.push(`sections[${si}].questions[${qi}] must be an object.`);
        if (!['simple', 'option', 'detailed', 'image'].includes(q.type)) errs.push(`sections[${si}].questions[${qi}].type must be 'simple' | 'option' | 'detailed' | 'image'.`);
        if (!q.question || typeof q.question !== 'string') errs.push(`sections[${si}].questions[${qi}].question is required (string).`);
        if (q.type === 'option' && !Array.isArray(q.options)) errs.push(`sections[${si}].questions[${qi}].options must be an array.`);
        if (q.type === 'detailed' && !Array.isArray(q.attributes)) errs.push(`sections[${si}].questions[${qi}].attributes must be an array.`);
        if (q.type === 'detailed' && Array.isArray(q.attributes)) {
          q.attributes.forEach((attr: any, ai: number) => {
            if (!attr || typeof attr !== 'object') return errs.push(`sections[${si}].questions[${qi}].attributes[${ai}] must be an object.`);
            if (!attr.name || typeof attr.name !== 'string') errs.push(`sections[${si}].questions[${qi}].attributes[${ai}].name is required (string).`);
            if (attr.width !== undefined && (typeof attr.width !== 'number' || attr.width <= 0 || attr.width > 1)) {
              errs.push(`sections[${si}].questions[${qi}].attributes[${ai}].width must be a number between 0 and 1 (e.g., 0.3 for 30%).`);
            }
            if (attr.inputType !== undefined && !['input', 'textarea'].includes(attr.inputType)) {
              errs.push(`sections[${si}].questions[${qi}].attributes[${ai}].inputType must be 'input' or 'textarea'.`);
            }
          });
        }
      });
    });
  }
  return errs;
}