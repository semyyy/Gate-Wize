"use client";

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OptionQuestion } from '../types';

export function OptionQuestionView({ q, path, value, onChange }: { q: OptionQuestion; path: string; value: Record<string, unknown>; onChange: (v: unknown) => void }) {
  const selected = (value[path] as string) ?? '';
  const setSelected = (val: string) => onChange({ ...(value[path] as any), selected: val, justification: (value[`${path}.justification`] as string) ?? '' });
  return (
    <div>
      <Label className="font-semibold">{q.question}</Label>
      {q.description && <div className="text-muted-foreground mb-1">{q.description}</div>}
      <Select value={selected} onValueChange={(val) => onChange(val)}>
        <SelectTrigger>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {q.options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
        <div className="text-muted-foreground mt-1 text-sm">Examples: {q.examples.join(', ')}</div>
      )}
    </div>
  );
}

export default OptionQuestionView;
