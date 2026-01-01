"use client";
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DetailedQuestion } from '../types';
import { rateDetailedRow, type FieldRatingResult } from '@/lib/formApi';
import { getInputStyles, StatusIcon, ValidationMessage, type FieldRating } from '../ratings/FieldRating';

export function DetailedQuestionView({ q, path, value, onChange, onRatingChange, ratings, jsonPath }: { q: DetailedQuestion; path: string; value: Record<string, unknown>; onChange: (v: unknown) => void; onRatingChange?: (path: string, rating: FieldRatingResult | null) => void; ratings?: Record<string, FieldRating>; jsonPath: string }) {
  const realRows: Record<string, unknown>[] = Array.isArray(value[path]) ? (value[path] as Record<string, unknown>[]) : [];

  const createEmptyRow = () => {
    const empty: Record<string, unknown> = {};
    for (const attr of q.attributes) empty[attr.name] = '';
    return empty;
  };

  // If no real rows, show one ghost row for UI, but don't save it yet
  const rows = realRows.length > 0 ? realRows : [createEmptyRow()];

  const [ratingStates, setRatingStates] = useState<Record<string, boolean>>({});
  const lastEvaluatedValuesRef = useRef<Record<string, string>>({});

  const addRow = () => {
    const copy = realRows.length > 0 ? [...realRows] : [createEmptyRow()];
    copy.push(createEmptyRow());
    onChange(copy);
  };
  const update = (ri: number, key: string, v: unknown) => {
    const copy = realRows.length > 0 ? [...realRows] : [createEmptyRow()];
    copy[ri] = { ...copy[ri], [key]: v };
    onChange(copy);
  };

  const removeRow = (ri: number) => {
    // Only allow deletion if there is more than one row
    if (rows.length <= 1) return;

    // If we are in "ghost row" mode (realRows.length === 0), rows has 1 item.
    // But the guard above handles it.
    // So we are deleting from realRows.

    const copy = [...realRows];
    copy.splice(ri, 1);
    onChange(copy);
  };
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const queueRef = useRef<Record<number, Array<{ attrName: string, attrDescription?: string, examples?: string[], promptConfig?: { task?: string; role?: string; guidelines?: string } }>>>({});

  const getPlaceholder = (examples?: string[], ri: number = 0) => {
    if (!examples || examples.length === 0) return undefined;

    const validExamples = examples
      .filter(ex => ex != null)
      .map(ex => typeof ex === 'string' ? ex : String(ex))
      .filter(ex => ex.trim() !== '' && ex !== '[object Object]');

    if (validExamples.length === 0) return undefined;

    // Cycle through examples based on row index
    const exampleIndex = ri % validExamples.length;
    const example = validExamples[exampleIndex];

    return example || undefined;
  };

  const processNext = (ri: number) => {
    const next = queueRef.current[ri]?.shift();
    if (next) {
      validateAttribute(ri, next.attrName, next.attrDescription, next.examples, next.promptConfig);
    }
  };

  const validateAttribute = async (ri: number, attrName: string, attrDescription?: string, examples?: string[], promptConfig?: { task?: string; role?: string; guidelines?: string }) => {
    const rows = rowsRef.current;
    const currentValue = (rows[ri]?.[attrName] as string) ?? '';

    if (!currentValue.trim() || !onRatingChange) {
      processNext(ri);
      return;
    }

    const ratingKey = `${path}.${ri}.${attrName}`;
    setRatingStates(prev => ({ ...prev, [ratingKey]: true }));

    const currentRow = rows[ri] || {};

    try {
      const rating = await rateDetailedRow(
        q.question,
        attrDescription || attrName,
        currentValue,
        currentRow,
        examples,
        promptConfig
      );

      if (rating) {
        lastEvaluatedValuesRef.current[ratingKey] = currentValue;
        onRatingChange(ratingKey, rating);
      }
    } finally {
      setRatingStates(prev => ({ ...prev, [ratingKey]: false }));
      processNext(ri);
    }
  };

  const handleAttributeBlur = (ri: number, attrName: string, attrDescription?: string, examples?: string[], promptConfig?: { task?: string; role?: string; guidelines?: string }) => {
    const rows = rowsRef.current;
    const currentValue = (rows[ri]?.[attrName] as string) ?? '';
    if (!currentValue.trim() || !onRatingChange) return;

    const ratingKey = `${path}.${ri}.${attrName}`;

    // Skip if value hasn't changed since last evaluation
    if (currentValue === lastEvaluatedValuesRef.current[ratingKey]) {
      return;
    }

    const rowPrefix = `${path}.${ri}.`;
    const isRowValidating = Object.keys(ratingStates).some(k => k.startsWith(rowPrefix) && ratingStates[k]);

    if (isRowValidating) {
      if (!queueRef.current[ri]) queueRef.current[ri] = [];
      queueRef.current[ri].push({ attrName, attrDescription, examples, promptConfig });
      return;
    }

    validateAttribute(ri, attrName, attrDescription, examples, promptConfig);
  };

  return (
    <div data-json-path={jsonPath}>
      <div className="mb-3">
        <div className="text-lg font-medium text-slate-900" data-json-path={`${jsonPath}.question`}>{q.question}</div>
        {q.description ? (
          <div className="mt-1 text-sm text-muted-foreground">{q.description}</div>
        ) : null}
      </div>

      <div className="w-full">
        <table className="w-full border-collapse text-sm table-fixed">
          <thead>
            <tr>
              {q.attributes.map((a, i) => {
                // Calculate effective width logic
                // 1. Sum distinct widths
                const totalExplicitWidth = q.attributes.reduce((sum, attr) => sum + (attr.width || 0), 0);
                // 2. Count attributes without explicit width
                const implicitCount = q.attributes.filter(attr => attr.width === undefined).length;
                // 3. Calculate width for implicit columns
                const remainingWidth = Math.max(0, 1 - totalExplicitWidth);
                const implicitWidth = implicitCount > 0 ? remainingWidth / implicitCount : 0;

                const effectiveWidth = a.width !== undefined ? a.width : implicitWidth;

                return (
                  <th
                    key={a.name}
                    className="text-left border-b border-slate-200 p-2 text-xs uppercase tracking-wide text-slate-500 font-semibold"
                    title={a.description}
                    style={{ width: `${effectiveWidth * 100}%` }}
                    data-json-path={`${jsonPath}.attributes[${i}]`}
                  >
                    {a.name}
                  </th>
                );
              })}
              <th className="w-px"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              // Collect all ratings for this row
              const rowRatings = q.attributes
                .map((a) => {
                  const ratingKey = `${path}.${ri}.${a.name}`;
                  return {
                    attributeName: a.name,
                    rating: ratings?.[ratingKey],
                  };
                })
                .filter((r) => r.rating !== undefined);

              return (
                <>
                  <tr key={ri}>
                    {q.attributes.map((a) => {
                      const ratingKey = `${path}.${ri}.${a.name}`;
                      const isRating = ratingStates[ratingKey] || false;
                      const currentRating = ratings?.[ratingKey];

                      return (
                        <td key={a.name} className="border-b border-slate-200 p-2 align-top">
                          {Array.isArray(a.options) && a.options.length > 0 ? (
                            <Select value={(row[a.name] as string) || undefined} onValueChange={(val) => update(ri, a.name, val)}>
                              <SelectTrigger className={`flex h-12 w-full items-center justify-between rounded-md border px-3 py-2 text-base shadow-sm focus:ring-1 ${getInputStyles(currentRating)}`}>
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
                            <div className="relative">
                              {a.inputType === 'textarea' ? (
                                <Textarea
                                  className={`w-full min-h-[80px] rounded-md border px-3 py-2 text-base shadow-sm transition-all outline-none placeholder:text-muted-foreground focus:ring-1 ${getInputStyles(currentRating)}`}
                                  placeholder={getPlaceholder(a.examples, ri)}
                                  value={(row[a.name] as string) ?? ''}
                                  onChange={(e) => update(ri, a.name, e.target.value)}
                                  onBlur={() => handleAttributeBlur(ri, a.name, a.description, a.examples, a.promptConfig)}
                                />
                              ) : (
                                <Input
                                  className={`w-full h-12 rounded-md border px-3 text-base shadow-sm transition-all outline-none placeholder:text-muted-foreground focus:ring-1 ${getInputStyles(currentRating)}`}
                                  placeholder={getPlaceholder(a.examples, ri)}
                                  value={(row[a.name] as string) ?? ''}
                                  onChange={(e) => update(ri, a.name, e.target.value)}
                                  onBlur={() => handleAttributeBlur(ri, a.name, a.description, a.examples, a.promptConfig)}
                                />
                              )}

                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                                <StatusIcon isLoading={isRating} />
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-slate-200 p-2 align-top">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-12 w-12 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                        onClick={() => removeRow(ri)}
                        disabled={rows.length <= 1}
                        title={rows.length <= 1 ? "Cannot delete the last row" : "Delete row"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </Button>
                    </td>
                  </tr>
                  {rowRatings.length > 0 && (
                    <tr key={`${ri}-ratings`}>
                      <td colSpan={q.attributes.length + 1} className="border-b border-slate-200 bg-slate-50/50 p-3">
                        <div className="space-y-2">
                          {rowRatings.map(({ attributeName, rating }) => {
                            if (!rating) return null;
                            const textColor = rating.rate === 'valid'
                              ? 'text-emerald-600'
                              : rating.rate === 'partial'
                                ? 'text-amber-600'
                                : 'text-rose-600';

                            return (
                              <div
                                key={attributeName}
                                className={`py-2 animate-in fade-in slide-in-from-top-2 duration-700 ease-out ${textColor}`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-xs uppercase tracking-wide opacity-90">
                                    {attributeName}
                                  </span>
                                </div>
                                <div className="text-sm leading-relaxed">
                                  {rating.comment}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex gap-2">
        <Button type="button" onClick={addRow} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-md transition-colors">
          <span className="text-lg leading-none">+</span> Add row
        </Button>
      </div>
    </div >
  );
}

export default DetailedQuestionView;
