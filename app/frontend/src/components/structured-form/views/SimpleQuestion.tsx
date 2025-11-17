"use client";

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { SimpleQuestion } from '../types';

export function SimpleQuestionView({ q, path, value, onChange }: { q: SimpleQuestion; path: string; value: Record<string, unknown>; onChange: (v: unknown) => void }) {
  return (
    <div>
      <Label className="font-semibold">{q.question}</Label>
      {q.description && <div className="text-muted-foreground mb-1">{q.description}</div>}
      <Input value={(value[path] as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
      {q.examples && q.examples.length > 0 && (
        <div className="text-muted-foreground mt-1 text-sm">Examples: {q.examples.join(', ')}</div>
      )}
    </div>
  );
}

export default SimpleQuestionView;
