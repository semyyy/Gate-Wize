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
      <div className="mb-2 md:mb-3">
        <div className="text-base font-semibold text-foreground">{q.question}</div>
        {q.description ? (
          <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{q.description}</div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {q.attributes.map((a) => (
                <th
                  key={a.name}
                  className="text-left border-b border-gray-200 p-2 text-[11px] uppercase tracking-wide text-muted-foreground font-medium"
                  title={a.description}
                >
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
                  <td key={a.name} className="border-b border-gray-200 p-2 align-top">
                    {Array.isArray(a.options) && a.options.length > 0 ? (
                      <Select value={(row[a.name] as string) || undefined} onValueChange={(val) => update(ri, a.name, val)}>
                        <SelectTrigger className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                          <SelectValue placeholder="Select an option" />
                          <svg className="ml-2 h-4 w-4 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="" className="text-gray-500">Select an option</SelectItem>
                          {a.options.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input className="w-full" value={(row[a.name] as string) ?? ''} onChange={(e) => update(ri, a.name, e.target.value)} />
                    )}
                  </td>
                ))}
                <td className="border-b border-gray-200 p-2 align-top">
                  <Button type="button" variant="outline" className="h-9" onClick={() => remove(ri)}>Remove</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex gap-2">
        <Button type="button" onClick={addRow}>Add row</Button>
      </div>
    </div>
  );
}

export default DetailedQuestionView;
