"use client";

import { useEffect, useState } from 'react';
import { StructuredForm } from '@/components/structured-form/StructuredForm';
import { JsonEditor, type JsonEditorError } from '@/components/json/JsonEditor';
import { parse, parseTree, printParseErrorCode, type ParseError } from 'jsonc-parser';
import type { FormSpec } from '@/components/structured-form/types';

const starter: FormSpec = {
  name: 'Opportunity Assessment',
  description: 'Capture requirements and assess problems/opportunities',
  sections: [
    {
      title: 'Basics',
      description: 'General context',
      questions: [
        { type: 'simple', question: 'What are the functional requirements?', description: 'Be specific', examples: ['User can login', 'Export to CSV'] },
        { type: 'option', question: 'What solution type?', options: ['make', 'buy', 'integration'], justification: true, description: 'Choose one', examples: ['buy'] },
      ],
    },
    {
      title: 'Problems / Opportunities',
      description: 'Capture detailed items as rows',
      questions: [
        {
          type: 'detailed',
          question: 'Which problems or opportunities motivate this project?',
          attributes: [
            { name: 'type', description: 'problem or opportunity', options: ['problem', 'opportunity'] },
            { name: 'description' },
            { name: 'impact', options: ['Low', 'Medium', 'High'] },
          ],
          examples: [
            { type: 'problem', description: 'Drop in customer retention rate', impact: 'High' },
          ],
        },
      ],
    },
  ],
};

export default function StructuredBuilderPage() {
  const [text, setText] = useState<string>(JSON.stringify(starter, null, 2));
  const [val, setVal] = useState<Record<string, unknown>>({});
  const [parseErrors, setParseErrors] = useState<JsonEditorError[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [spec, setSpec] = useState<FormSpec>(starter); // keep last valid spec for preview

  function validateSpec(obj: any): string[] {
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
          if (!['simple', 'option', 'detailed'].includes(q.type)) errs.push(`sections[${si}].questions[${qi}].type must be 'simple' | 'option' | 'detailed'.`);
          if (!q.question || typeof q.question !== 'string') errs.push(`sections[${si}].questions[${qi}].question is required (string).`);
          if (q.type === 'option' && !Array.isArray(q.options)) errs.push(`sections[${si}].questions[${qi}].options must be an array.`);
          if (q.type === 'detailed' && !Array.isArray(q.attributes)) errs.push(`sections[${si}].questions[${qi}].attributes must be an array.`);
        });
      });
    }
    return errs;
  }

  useEffect(() => {
    const errors: ParseError[] = [];
    const obj = parse(text, errors, { allowTrailingComma: true, disallowComments: false });
    setParseErrors(
      errors.map((e) => ({
        offset: e.offset,
        length: e.length,
        message: `JSON error: ${printParseErrorCode(e.error)}`,
      }))
    );
    if (errors.length > 0) return; // keep last valid spec
    const vErrs = validateSpec(obj);
    setValidationErrors(vErrs);
    if (vErrs.length === 0) setSpec(obj as FormSpec);
  }, [text]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <section className="rounded-lg border p-4">
        <h2 className="text-xl font-semibold mb-3">Spec JSON</h2>
        <JsonEditor value={text} onChange={setText} errors={parseErrors} />
        {parseErrors.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-sm text-red-600">
            {parseErrors.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Preview</h2>
          {parseErrors.length > 0 ? (
            <span className="text-sm text-red-600">Parse errors: {parseErrors.length}. Showing last valid.</span>
          ) : validationErrors.length > 0 ? (
            <span className="text-sm text-amber-600">Spec issues: {validationErrors.length}. Showing last valid.</span>
          ) : (
            <span className="text-sm text-emerald-600">Synced</span>
          )}
        </div>
        <StructuredForm spec={spec} onChange={setVal} />
        
      </section>
    </div>
  );
}
