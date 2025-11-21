"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DetailedQuestion } from '../types';
import { rateDetailedRow, type FieldRatingResult } from '@/lib/formApi';
import { FieldRatingView, type FieldRating } from '../ratings/FieldRating';

export function DetailedQuestionView({ q, path, value, onChange, onRatingChange, ratings }: { q: DetailedQuestion; path: string; value: Record<string, unknown>; onChange: (v: unknown) => void; onRatingChange?: (path: string, rating: FieldRatingResult | null) => void; ratings?: Record<string, FieldRating> }) {
  const rows: Record<string, unknown>[] = (value[path] as Record<string, unknown>[]) ?? [];
  const [ratingStates, setRatingStates] = useState<Record<string, boolean>>({});

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

  const handleAttributeBlur = async (ri: number, attrName: string, attrDescription?: string, examples?: string[]) => {
    const currentValue = (rows[ri]?.[attrName] as string) ?? '';
    if (!currentValue.trim() || !onRatingChange) return;

    const ratingKey = `${path}.${ri}.${attrName}`;
    setRatingStates(prev => ({ ...prev, [ratingKey]: true }));

    const currentRow = rows[ri] || {};

    // Use rateDetailedRow with the full row context
    const rating = await rateDetailedRow(
      q.question,
      attrDescription || attrName,
      currentValue,
      currentRow,
      examples
    );

    setRatingStates(prev => ({ ...prev, [ratingKey]: false }));

    if (rating) {
      onRatingChange(ratingKey, rating);
    }
  };

  return (
    <div>
      <div className="mb-3">
        <div className="text-lg font-medium text-slate-900">{q.question}</div>
        {q.description ? (
          <div className="mt-1 text-sm text-muted-foreground">{q.description}</div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {q.attributes.map((a) => (
                <th
                  key={a.name}
                  className="text-left border-b border-slate-200 p-2 text-xs uppercase tracking-wide text-slate-500 font-semibold"
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
                {q.attributes.map((a) => {
                  const ratingKey = `${path}.${ri}.${a.name}`;
                  const isRating = ratingStates[ratingKey] || false;
                  const currentRating = ratings?.[ratingKey];

                  const getBorderColor = () => {
                    if (!currentRating) return 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500';
                    switch (currentRating.rate) {
                      case 'valid': return 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500 bg-emerald-50/30';
                      case 'partial': return 'border-amber-500 focus:border-amber-500 focus:ring-amber-500 bg-amber-50/30';
                      case 'invalid': return 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30';
                      default: return 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500';
                    }
                  };

                  return (
                    <td key={a.name} className="border-b border-slate-200 p-2 align-top">
                      {Array.isArray(a.options) && a.options.length > 0 ? (
                        <Select value={(row[a.name] as string) || undefined} onValueChange={(val) => update(ri, a.name, val)}>
                          <SelectTrigger className={`flex h-12 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-base shadow-sm focus:ring-1 ${getBorderColor()}`}>
                            <SelectValue placeholder="Select an option" />
                            <svg className="ml-2 h-4 w-4 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
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
                        <div className="space-y-2">
                          <div className="relative">
                            <Input
                              className={`w-full rounded-md border bg-transparent px-3 py-3 text-base shadow-sm transition-all outline-none placeholder:text-muted-foreground focus:ring-1 ${getBorderColor()}`}
                              placeholder={a.examples && a.examples.length > 0 ? `e.g. ${a.examples.join(', ')}` : undefined}
                              value={(row[a.name] as string) ?? ''}
                              onChange={(e) => update(ri, a.name, e.target.value)}
                              onBlur={() => handleAttributeBlur(ri, a.name, a.description, a.examples)}
                            />
                            {isRating && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                              </div>
                            )}
                          </div>
                          {ratings?.[ratingKey] && <FieldRatingView rating={ratings[ratingKey]} />}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="border-b border-slate-200 p-2 align-top">
                  <Button type="button" variant="ghost" className="h-12 w-12 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => remove(ri)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex gap-2">
        <Button type="button" onClick={addRow} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-md transition-colors">
          <span className="text-lg leading-none">+</span> Add row
        </Button>
      </div>
    </div>
  );
}

export default DetailedQuestionView;
