"use client";

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { SimpleQuestion } from '../types';

export function SimpleQuestionView({ q, path, value, onChange }: { q: SimpleQuestion; path: string; value: Record<string, unknown>; onChange: (v: unknown) => void }) {
  return (
    <div>
      <div className="mb-2 md:mb-3">
        <Label className="block text-base font-semibold text-foreground">{q.question}</Label>
        {q.description ? (
          <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{q.description}</div>
        ) : null}
      </div>
      <Input value={(value[path] as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      {q.examples && q.examples.length > 0 && (
        <div className="text-muted-foreground mt-1.5 text-xs">Examples: {q.examples.join(', ')}</div>
      )}
    </div>
  );
}

export default SimpleQuestionView;
