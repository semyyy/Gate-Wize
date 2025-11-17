"use client";

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DetailedQuestion } from '../types';

export function DetailedQuestionView({ q, path, value, onChange }: { q: DetailedQuestion; path: string; value: Record<string, unknown>; onChange: (v: unknown) => void }) {
  const rows: Record<string, unknown>[] = (value[path] as Record<string, unknown>[]) ?? [];
  useEffect(() => {
    if ((!rows || rows.length === 0) && Array.isArray(q.examples) && q.examples.length > 0) {
      onChange(q.examples);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.examples, rows?.length]);
  const addRow = () => {
    const empty: Record<string, unknown> = {};
    for (const attr of q.attributes) empty[attr.name] = '';
    onChange([...rows, empty]);
  };
  const update = (ri: number, key: string, v: unknown) => {
    const copy = rows.slice();
    copy[ri] = { ...copy[ri], [key]: v };
    onChange(copy);
  };
  const remove = (ri: number) => onChange(rows.filter((_, i) => i !== ri));

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <div className="font-semibold">{q.question}</div>
      </div>
      {q.description && <div className="text-muted-foreground mb-1">{q.description}</div>}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {q.attributes.map((a) => (
                <th key={a.name} className="text-left border-b p-2" title={a.description}>
                  {a.name}
                </th>
              ))}
              <th className="w-px"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {q.attributes.map((a) => (
                  <td key={a.name} className="border-b p-2">
                    {Array.isArray(a.options) && a.options.length > 0 ? (
                      <Select value={(row[a.name] as string) ?? ''} onValueChange={(val) => update(ri, a.name, val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {a.options.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={(row[a.name] as string) ?? ''}
                        onChange={(e) => update(ri, a.name, e.target.value)}
                      />
                    )}
                  </td>
                ))}
                <td className="border-b p-2">
                  <Button type="button" variant="outline" onClick={() => remove(ri)}>Remove</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex gap-2">
        <Button type="button" onClick={addRow}>Add row</Button>
      </div>
    </div>
  );
}

export default DetailedQuestionView;
