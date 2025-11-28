"use client";

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OptionQuestion } from '../types';

export function OptionQuestionView({ q, path, value, onChange }: { q: OptionQuestion; path: string; value: Record<string, unknown>; onChange: (v: unknown) => void }) {
  // Handle both single and multiple selection modes
  const isMultiple = q.multiple === true;

  // For single selection: value is a string
  // For multiple selection: value is an array of strings
  const rawValue = value[path];
  const selectedSingle = !isMultiple && typeof rawValue === 'string' && rawValue.length > 0 ? rawValue : undefined;
  const selectedMultiple = isMultiple && Array.isArray(rawValue) ? rawValue : [];

  const handleSingleChange = (opt: string) => {
    onChange(opt);
  };

  const handleMultipleChange = (opt: string) => {
    const newSelection = selectedMultiple.includes(opt)
      ? selectedMultiple.filter(item => item !== opt)
      : [...selectedMultiple, opt];
    onChange(newSelection);
  };

  const hasSelection = isMultiple ? selectedMultiple.length > 0 : !!selectedSingle;

  return (
    <div>
      <div className="mb-3">
        <Label className="block text-lg font-medium text-slate-900">
          {q.question}
          {isMultiple && <span className="ml-2 text-sm font-normal text-muted-foreground">(Multiple selections allowed)</span>}
        </Label>
        {q.description ? (
          <div className="mt-1 text-sm text-muted-foreground">{q.description}</div>
        ) : null}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {q.options.map((opt) => {
          const isChecked = isMultiple ? selectedMultiple.includes(opt) : selectedSingle === opt;

          return (
            <label key={opt} className="cursor-pointer relative group">
              <input
                type={isMultiple ? "checkbox" : "radio"}
                name={path}
                value={opt}
                checked={isChecked}
                onChange={() => isMultiple ? handleMultipleChange(opt) : handleSingleChange(opt)}
                className="peer sr-only"
              />
              <div className="p-5 rounded-lg border-2 border-slate-200 hover:border-slate-300 peer-checked:border-slate-900 peer-checked:bg-slate-50 transition-all h-full flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-900 capitalize">{opt}</h3>
                <div className="opacity-0 peer-checked:opacity-100 text-slate-900 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
              </div>
            </label>
          );
        })}
      </div>
      {q.justification && hasSelection && (
        <div className="mt-4">
          <Textarea
            className="w-full rounded-md border border-slate-300 bg-transparent px-4 py-3 text-lg shadow-sm transition-all outline-none placeholder:text-muted-foreground focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="Justification"
            value={(value[`${path}.justification`] as string) ?? ''}
            onChange={(e) => {
              value[`${path}.justification`] = e.target.value;
              onChange(isMultiple ? selectedMultiple : selectedSingle);
            }}
          />
        </div>
      )}

    </div>
  );
}

export default OptionQuestionView;
