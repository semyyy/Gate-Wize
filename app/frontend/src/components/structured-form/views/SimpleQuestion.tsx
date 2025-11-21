"use client";

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SimpleQuestion } from '../types';

export function SimpleQuestionView({ q, path, value, onChange }: { q: SimpleQuestion; path: string; value: Record<string, unknown>; onChange: (v: unknown) => void }) {
  return (
    <div>
      <div className="mb-3">
        <Label className="block text-lg font-medium text-slate-900">{q.question}</Label>
        {q.description ? (
          <div className="mt-1 text-sm text-muted-foreground">{q.description}</div>
        ) : null}
      </div>
      <Textarea
        className="w-full rounded-md border border-slate-300 bg-transparent px-4 py-3 text-lg shadow-sm transition-all outline-none placeholder:text-muted-foreground focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        placeholder={q.examples && q.examples.length > 0 ? `e.g. ${q.examples.join(', ')}` : undefined}
        value={(value[path] as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default SimpleQuestionView;
