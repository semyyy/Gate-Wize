"use client";
import { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SimpleQuestion } from '../types';
import { rateSimpleField, isFieldRatingError, type FieldRatingResult } from '@/lib/formApi';
import { getInputStyles, StatusIcon, type FieldRating } from '../ratings/FieldRating';
import { Plus, X } from 'lucide-react';

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

interface ResponseItem {
  id: string;
  value: string;
}

export function SimpleQuestionView({ q, path, value, onChange, onRatingChange, rating, ratings, jsonPath }: { q: SimpleQuestion; path: string; value: Record<string, unknown>; onChange: (v: unknown) => void; onRatingChange?: (path: string, rating: FieldRatingResult | null) => void; rating?: FieldRating; ratings?: Record<string, FieldRating>; jsonPath: string }) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [errorIds, setErrorIds] = useState<Map<string, string>>(new Map());
  const lastEvaluatedValuesRef = useRef<Map<string, string>>(new Map());
  const [undoState, setUndoState] = useState<Record<string, string>>({});

  // Track response items with stable IDs
  const [responseItems, setResponseItems] = useState<ResponseItem[]>([]);
  const initializedRef = useRef(false);

  const isMultiple = q.multiple === true;

  // Initialize or sync responseItems from value
  useEffect(() => {
    const currentValue = value[path];
    const responses = isMultiple
      ? (Array.isArray(currentValue) && currentValue.length > 0 ? currentValue as string[] : [''])
      : [currentValue as string ?? ''];

    // Only initialize once or when switching questions
    if (!initializedRef.current) {
      setResponseItems(responses.map(val => ({
        id: generateId(),
        value: val
      })));
      initializedRef.current = true;
    } else {
      // Update values while preserving IDs
      setResponseItems(prev => {
        // If lengths match, update values
        if (prev.length === responses.length) {
          return prev.map((item, idx) => ({
            ...item,
            value: responses[idx] ?? ''
          }));
        }
        // If length changed externally, regenerate
        return responses.map((val, idx) => ({
          id: prev[idx]?.id || generateId(),
          value: val
        }));
      });
    }
  }, [value[path], isMultiple, path]);

  const handleResponseChange = (id: string, newValue: string) => {
    const updatedItems = responseItems.map(item =>
      item.id === id ? { ...item, value: newValue } : item
    );
    setResponseItems(updatedItems);

    const values = updatedItems.map(item => item.value);
    if (isMultiple) {
      onChange(values);
    } else {
      onChange(values[0]);
    }
  };

  const handleAddResponse = () => {
    if (isMultiple) {
      const newItems = [...responseItems, { id: generateId(), value: '' }];
      setResponseItems(newItems);
      onChange(newItems.map(item => item.value));
    }
  };

  const handleRemoveResponse = (id: string) => {
    if (isMultiple && responseItems.length > 1) {
      const newItems = responseItems.filter(item => item.id !== id);
      setResponseItems(newItems);
      onChange(newItems.map(item => item.value));

      // Clear rating for removed field
      if (onRatingChange) {
        const fieldPath = `${path}[${id}]`;
        onRatingChange(fieldPath, null);
      }

      // Clear from last evaluated map
      lastEvaluatedValuesRef.current.delete(id);
    }
  };

  const handleBlur = async (id: string, responseValue: string) => {
    console.log('[SimpleQuestion] handleBlur called', { path, id, onRatingChange: !!onRatingChange });
    console.log('[SimpleQuestion] currentValue:', responseValue);

    if (!responseValue.trim()) {
      if (onRatingChange) {
        const fieldPath = isMultiple ? `${path}[${id}]` : path;
        onRatingChange(fieldPath, null);
        lastEvaluatedValuesRef.current.delete(id);
      }
      return;
    }

    if (!onRatingChange) {
      return;
    }

    // Check if AI validation is explicitly disabled
    if (q.aiValidation === false) {
      return;
    }

    // Skip if value hasn't changed since last evaluation for this specific field
    if (responseValue === lastEvaluatedValuesRef.current.get(id)) {
      console.log('[SimpleQuestion] Skipping rating - value unchanged for id', id);
      return;
    }

    console.log('[SimpleQuestion] Starting rating for id', id);
    setLoadingIds(prev => new Set(prev).add(id));

    // Clear the old validation immediately when starting a new request
    const fieldPath = isMultiple ? `${path}[${id}]` : path;
    onRatingChange(fieldPath, null);

    // Clear any previous error for this field
    setErrorIds(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    try {
      const ratingResult = await rateSimpleField(q.question, responseValue, q.examples, q.promptConfig);
      console.log('[SimpleQuestion] Rating result:', ratingResult);

      if (isFieldRatingError(ratingResult)) {
        // Handle error response
        setErrorIds(prev => {
          const next = new Map(prev);
          next.set(id, ratingResult.message);
          return next;
        });
      } else if (ratingResult) {
        lastEvaluatedValuesRef.current.set(id, responseValue);
        // For multiple responses, use ID-based path; for single, use base path
        const fieldPath = isMultiple ? `${path}[${id}]` : path;
        onRatingChange(fieldPath, ratingResult);
      }
    } catch (error) {
      console.error('[SimpleQuestion] Rating error:', error);
      setErrorIds(prev => {
        const next = new Map(prev);
        next.set(id, 'An unexpected error occurred during validation');
        return next;
      });
    } finally {
      // Always clear loading state, even if there's an error
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Process examples
  const validExamples = q.examples
    ?.filter(ex => ex != null)
    .map(ex => typeof ex === 'string' ? ex : String(ex))
    .filter(ex => ex.trim() !== '' && ex !== '[object Object]') || [];

  const visibleExamples = validExamples.slice(0, 3);
  const hiddenExamples = validExamples.slice(3);

  // Join visible examples with newlines for the placeholder
  const placeholderText = visibleExamples.join('\n');

  const hoverTooltip = hiddenExamples.length > 0
    ? `More examples:\n${hiddenExamples.join('\n')}`
    : undefined;

  // Get rating for specific field
  const getFieldRating = (id: string): FieldRating | undefined => {
    if (isMultiple && ratings) {
      return ratings[`${path}[${id}]`];
    }
    return rating;
  };

  return (
    <div data-json-path={jsonPath}>
      <div className="mb-3">
        <Label className="block text-lg font-medium text-slate-900" data-json-path={`${jsonPath}.question`}>{q.question}</Label>
        {q.description ? (
          <div className="mt-1 text-sm text-muted-foreground">{q.description}</div>
        ) : null}
      </div>

      <div className="space-y-3">
        {responseItems.map((item) => {
          const fieldRating = getFieldRating(item.id);
          const isLoading = loadingIds.has(item.id);
          const errorMessage = errorIds.get(item.id);

          return (
            <div key={item.id} className="space-y-2">
              <div
                className="flex items-start gap-2 group"
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {isMultiple && responseItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveResponse(item.id)}
                    className={`mt-3 flex-shrink-0 w-6 h-6 rounded-full border-2 border-gray-300 text-gray-400 hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-all duration-300 flex items-center justify-center ${hoveredId === item.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                      }`}
                    aria-label="Remove response"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="flex-1 relative" title={hoverTooltip}>
                  <Textarea
                    className={`h-32 w-full rounded-md border px-4 py-3 text-lg shadow-sm transition-all outline-none placeholder:text-muted-foreground focus:ring-1 ${getInputStyles(fieldRating)}`}
                    placeholder={placeholderText}
                    value={item.value}
                    onChange={(e) => handleResponseChange(item.id, e.target.value)}
                    onBlur={() => handleBlur(item.id, item.value)}
                  />

                  <div className="absolute right-3 top-3 flex items-center justify-center">
                    {isLoading ? (
                      <div className="pointer-events-none">
                        <StatusIcon isLoading={true} />
                      </div>
                    ) : undoState[item.id] !== undefined ? (
                      <button
                        type="button"
                        onClick={() => {
                          // Undo change
                          handleResponseChange(item.id, undoState[item.id]!);
                          // Clear undo state
                          setUndoState(prev => {
                            const next = { ...prev };
                            delete next[item.id];
                            return next;
                          });
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors cursor-pointer"
                        title="Undo"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              </div>

              {errorMessage && (
                <div
                  className={`py-2 ${isMultiple && responseItems.length > 1 ? 'ml-8' : ''} animate-in fade-in slide-in-from-top-2 duration-700 ease-out text-orange-600 bg-orange-50 rounded-md px-3`}
                >
                  <div className="text-sm leading-relaxed flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {errorMessage}
                  </div>
                </div>
              )}

              {(fieldRating) && !errorMessage && (
                <div
                  className={`py-2 ${isMultiple && responseItems.length > 1 ? 'ml-8' : ''} animate-in fade-in slide-in-from-top-2 duration-700 ease-out ${fieldRating?.rate === 'valid'
                    ? 'text-emerald-600'
                    : fieldRating?.rate === 'partial'
                      ? 'text-amber-600'
                      : fieldRating?.rate === 'invalid'
                        ? 'text-rose-600'
                        : 'text-slate-600'
                    }`}
                >
                  {fieldRating && (
                    <div className="text-sm leading-relaxed">
                      {fieldRating.comment}
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    {fieldRating?.suggestionResponse && (fieldRating.rate === 'partial' || fieldRating.rate === 'invalid') && (
                      <div className="mt-2 w-full text-left group/suggestion relative">
                        <button
                          type="button"
                          onClick={() => {
                            // Save current value for undo
                            setUndoState(prev => ({
                              ...prev,
                              [item.id]: item.value
                            }));

                            handleResponseChange(item.id, fieldRating.suggestionResponse!);
                            // Clear the rating as it's no longer valid for the new content
                            if (onRatingChange) {
                              const fieldPath = isMultiple ? `${path}[${item.id}]` : path;
                              onRatingChange(fieldPath, null);
                              // Mark as evaluated to prevent immediate re-validation
                              lastEvaluatedValuesRef.current.set(item.id, fieldRating.suggestionResponse!);
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
                            {fieldRating.suggestionResponse}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Dismiss suggestion
                            if (onRatingChange) {
                              const fieldPath = isMultiple ? `${path}[${item.id}]` : path;
                              // Update rating to remove suggestionResponse but keep comment/rate
                              onRatingChange(fieldPath, { ...fieldRating, suggestionResponse: undefined });
                            }
                          }}
                          className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors opacity-0 group-hover/suggestion:opacity-100"
                          title="Dismiss suggestion"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isMultiple && (
          <button
            type="button"
            onClick={handleAddResponse}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-md transition-colors"
          >
            <span className="text-lg leading-none">+</span> Add another response
          </button>
        )}
      </div>
    </div>
  );
}

export default SimpleQuestionView;
