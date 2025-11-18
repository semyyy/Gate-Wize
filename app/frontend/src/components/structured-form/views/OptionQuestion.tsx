"use client";

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OptionQuestion } from '../types';

export function OptionQuestionView({ q, path, value, onChange }: { q: OptionQuestion; path: string; value: Record<string, unknown>; onChange: (v: unknown) => void }) {
  const raw = value[path] as string | undefined;
  const selected = raw && raw.length > 0 ? raw : undefined;
  const setSelected = (val: string) => onChange({ ...(value[path] as any), selected: val, justification: (value[`${path}.justification`] as string) ?? '' });
  return (
    <div>
      <div className="mb-2 md:mb-3">
        <Label className="block text-base font-semibold text-foreground">{q.question}</Label>
        {q.description ? (
          <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{q.description}</div>
        ) : null}
      </div>
      <div className="w-full">
        <Select value={selected} onValueChange={(val) => onChange(val)}>
          <SelectTrigger className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <SelectValue placeholder="Select an option" />
            <svg className="ml-2 h-4 w-4 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
          </SelectTrigger>
        <SelectContent>
          <SelectItem value="" className="text-gray-500">Select an option</SelectItem>
          {q.options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
        </Select>
      </div>
      {q.justification && selected && (
        <div className="mt-2">
          <Textarea
            placeholder="Justification"
            value={(value[`${path}.justification`] as string) ?? ''}
            onChange={(e) => (value[`${path}.justification`] = e.target.value) && onChange(selected)}
          />
        </div>
      )}
      {q.examples && q.examples.length > 0 && (
        <div className="text-muted-foreground mt-1.5 text-xs">Examples: {q.examples.join(', ')}</div>
      )}
    </div>
  );
}

export default OptionQuestionView;
