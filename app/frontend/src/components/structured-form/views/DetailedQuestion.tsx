/**
 * Copyright (c) 2026 EAExpertise
 *
 * This software is licensed under the MIT License with Commons Clause.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to use,
 * copy, modify, merge, publish, distribute, and sublicense the Software,
 * subject to the conditions of the MIT License and the Commons Clause.
 *
 * Commercial use of this Software is strictly prohibited unless explicit prior
 * written permission is obtained from EAExpertise.
 *
 * The Software may be used for internal business purposes, research,
 * evaluation, or other non-commercial purposes.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

"use client";
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DetailedQuestion } from '../types';
import { rateDetailedRow, isFieldRatingError, type FieldRatingResult } from '@/lib/formApi';
import { getInputStyles, StatusIcon, ValidationMessage, type FieldRating } from '../ratings/FieldRating';
import { X } from 'lucide-react';

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
  const [errorStates, setErrorStates] = useState<Record<string, string>>({});
  const lastEvaluatedValuesRef = useRef<Record<string, string>>({});
  const [undoState, setUndoState] = useState<Record<string, string>>({});

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

    // Helper to shift keyed objects
    const shiftState = (
      state: Record<string, any>,
      keyFn: (idx: number, attr: string) => string
    ) => {
      const next = { ...state };

      // 1. Delete all keys for the removed row
      q.attributes.forEach(a => {
        delete next[keyFn(ri, a.name)];
      });

      // 2. Shift all subsequent rows down
      for (let i = ri + 1; i < rows.length; i++) {
        q.attributes.forEach(a => {
          const currentKey = keyFn(i, a.name);
          const prevKey = keyFn(i - 1, a.name);

          if (next[currentKey] !== undefined) {
            next[prevKey] = next[currentKey];
            delete next[currentKey];
          }
        });
      }
      return next;
    };

    // Update local states
    setUndoState(prev => shiftState(prev, (idx, attr) => `${idx}.${attr}`));
    setRatingStates(prev => shiftState(prev, (idx, attr) => `${path}.${idx}.${attr}`));
    setErrorStates(prev => shiftState(prev, (idx, attr) => `${path}.${idx}.${attr}`));

    // Update global ratings (if handler exists)
    if (onRatingChange && ratings) {
      // We need to shift ratings locally first to avoid race conditions or just emit events
      // Since we can't atomically update parent, we trigger moving

      // Iterate from deleted index up to end
      for (let i = ri; i < rows.length; i++) {
        q.attributes.forEach(a => {
          // Target: the path at index i (which will become the new value for this slot)
          // Source: the path at index i + 1

          const targetKey = `${path}.${i}.${a.name}`;

          if (i === rows.length - 1) {
            // Last item, just clear it (it's being removed/shifted out)
            onRatingChange(targetKey, null);
          } else {
            const sourceKey = `${path}.${i + 1}.${a.name}`;
            const sourceRating = ratings[sourceKey];

            // Move source to target
            // onRatingChange expects FieldRatingResult, but we have FieldRating
            // We need to map it back or just pass what we have if the type allows?
            // FieldRatingResult has { rate, comment, suggestionResponse? }
            // FieldRating has same structure usually.

            if (sourceRating) {
              onRatingChange(targetKey, {
                rate: sourceRating.rate as 'valid' | 'partial' | 'invalid', // Cast to ensure type compatibility
                comment: sourceRating.comment,
                suggestionResponse: sourceRating.suggestionResponse
              });
            } else {
              onRatingChange(targetKey, null);
            }
          }
        });
      }
    }

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

    // Clear the old validation immediately when starting a new request
    onRatingChange(ratingKey, null);

    // Clear any previous error for this field
    setErrorStates(prev => {
      const { [ratingKey]: _, ...rest } = prev;
      return rest;
    });

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

      if (isFieldRatingError(rating)) {
        // Handle error response
        setErrorStates(prev => ({ ...prev, [ratingKey]: rating.message }));
      } else if (rating) {
        lastEvaluatedValuesRef.current[ratingKey] = currentValue;
        onRatingChange(ratingKey, rating);
      }
    } catch (error) {
      console.error('[DetailedQuestion] Rating error:', error);
      setErrorStates(prev => ({ ...prev, [ratingKey]: 'An unexpected error occurred during validation' }));
    } finally {
      setRatingStates(prev => ({ ...prev, [ratingKey]: false }));
      processNext(ri);
    }
  };

  const handleAttributeBlur = (ri: number, attrName: string, attrDescription?: string, examples?: string[], promptConfig?: { task?: string; role?: string; guidelines?: string }) => {
    const rows = rowsRef.current;
    const currentValue = (rows[ri]?.[attrName] as string) ?? '';

    // Check aiValidation
    const attribute = q.attributes.find(a => a.name === attrName);
    if (attribute?.aiValidation === false) return;

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

      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse text-sm table-fixed min-w-[600px]">
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
              <th className="w-16 border-b border-slate-200"></th>
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
                    errorMessage: errorStates[ratingKey],
                  };
                })
                .filter((r) => r.rating !== undefined || r.errorMessage);

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

                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center">
                                {isRating ? (
                                  <div className="pointer-events-none">
                                    <StatusIcon isLoading={true} />
                                  </div>
                                ) : undoState[`${ri}.${a.name}`] !== undefined ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const undoKey = `${ri}.${a.name}`;
                                      update(ri, a.name, undoState[undoKey]!);
                                      setUndoState(prev => {
                                        const next = { ...prev };
                                        delete next[undoKey];
                                        return next;
                                      });
                                    }}
                                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors cursor-pointer"
                                    title="Undo"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                  </button>
                                ) : (
                                  <div className="pointer-events-none">
                                    <StatusIcon isLoading={false} />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-slate-200 p-2 align-top w-16">
                      <div className="flex items-center justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-10 w-10 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                          onClick={() => removeRow(ri)}
                          disabled={rows.length <= 1}
                          title={rows.length <= 1 ? "Cannot delete the last row" : "Delete row"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {rowRatings.length > 0 && (
                    <tr key={`${ri}-ratings`}>
                      <td colSpan={q.attributes.length + 1} className="border-b border-slate-200 bg-slate-50/50 p-3">
                        <div className="space-y-2">
                          {rowRatings.map(({ attributeName, rating, errorMessage }) => {
                            if (errorMessage) {
                              return (
                                <div
                                  key={attributeName}
                                  className="py-2 animate-in fade-in slide-in-from-top-2 duration-700 ease-out text-orange-600 bg-orange-50 rounded-md px-3"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span className="font-semibold text-xs uppercase tracking-wide opacity-90">
                                      {attributeName}
                                    </span>
                                  </div>
                                  <div className="text-sm leading-relaxed">
                                    {errorMessage}
                                  </div>
                                </div>
                              );
                            }

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
                                {rating.suggestionResponse && (rating.rate === 'partial' || rating.rate === 'invalid') && (
                                  <div className="flex flex-col gap-2">
                                    <div className="mt-2 w-full text-left group/suggestion relative">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          // Save current value for undo
                                          const undoKey = `${ri}.${attributeName}`;
                                          setUndoState(prev => ({
                                            ...prev,
                                            [undoKey]: (rows[ri]?.[attributeName] as string) || ''
                                          }));

                                          update(ri, attributeName, rating.suggestionResponse!);
                                          if (onRatingChange) {
                                            const ratingKey = `${path}.${ri}.${attributeName}`;
                                            onRatingChange(ratingKey, null);
                                            lastEvaluatedValuesRef.current[ratingKey] = rating.suggestionResponse!;
                                          }
                                        }}
                                        className="w-full text-left p-3 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-200 rounded-md transition-all duration-200 cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-1.5">
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                          </svg>
                                          Suggestion (Click to apply)
                                        </div>
                                        <div className="text-sm text-slate-700 group-hover/suggestion:text-slate-900 transition-colors pr-6">
                                          {rating.suggestionResponse}
                                        </div>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Dismiss suggestion
                                          if (onRatingChange) {
                                            const ratingKey = `${path}.${ri}.${attributeName}`;
                                            // Update rating to remove suggestionResponse but keep comment/rate
                                            onRatingChange(ratingKey, { ...rating, suggestionResponse: undefined });
                                          }
                                        }}
                                        className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors opacity-0 group-hover/suggestion:opacity-100"
                                        title="Dismiss suggestion"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}
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
