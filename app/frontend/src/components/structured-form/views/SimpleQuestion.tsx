"use client";
import { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SimpleQuestion } from '../types';
import { rateSimpleField, type FieldRatingResult } from '@/lib/formApi';
import { getInputStyles, StatusIcon, type FieldRating } from '../ratings/FieldRating';
import { Plus, X } from 'lucide-react';

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

interface ResponseItem {
  id: string;
  value: string;
}

export function SimpleQuestionView({ q, path, value, onChange, onRatingChange, rating, ratings }: { q: SimpleQuestion; path: string; value: Record<string, unknown>; onChange: (v: unknown) => void; onRatingChange?: (path: string, rating: FieldRatingResult | null) => void; rating?: FieldRating; ratings?: Record<string, FieldRating> }) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const lastEvaluatedValuesRef = useRef<Map<string, string>>(new Map());

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

    if (!responseValue.trim() || !onRatingChange) {
      console.log('[SimpleQuestion] Skipping rating - empty or no callback');
      return;
    }

    // Skip if value hasn't changed since last evaluation for this specific field
    if (responseValue === lastEvaluatedValuesRef.current.get(id)) {
      console.log('[SimpleQuestion] Skipping rating - value unchanged for id', id);
      return;
    }

    console.log('[SimpleQuestion] Starting rating for id', id);
    setLoadingIds(prev => new Set(prev).add(id));

    try {
      const ratingResult = await rateSimpleField(q.question, responseValue, q.examples, q.promptConfig);
      console.log('[SimpleQuestion] Rating result:', ratingResult);

      if (ratingResult) {
        lastEvaluatedValuesRef.current.set(id, responseValue);
        // For multiple responses, use ID-based path; for single, use base path
        const fieldPath = isMultiple ? `${path}[${id}]` : path;
        onRatingChange(fieldPath, ratingResult);
      }
    } catch (error) {
      console.error('[SimpleQuestion] Rating error:', error);
    } finally {
      // Always clear loading state, even if there's an error
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Robustly handle examples placeholder
  const placeholderText = q.examples
    ?.filter(ex => ex != null)
    .map(ex => typeof ex === 'string' ? ex : String(ex))
    .filter(ex => ex.trim() !== '' && ex !== '[object Object]')
    .join('\n');

  const inputPlaceholder = placeholderText ? `${placeholderText}` : undefined;

  // Get rating for specific field
  const getFieldRating = (id: string): FieldRating | undefined => {
    if (isMultiple && ratings) {
      return ratings[`${path}[${id}]`];
    }
    return rating;
  };

  return (
    <div>
      <div className="mb-3">
        <Label className="block text-lg font-medium text-slate-900">{q.question}</Label>
        {q.description ? (
          <div className="mt-1 text-sm text-muted-foreground">{q.description}</div>
        ) : null}
      </div>

      <div className="space-y-3">
        {responseItems.map((item) => {
          const fieldRating = getFieldRating(item.id);
          const isLoading = loadingIds.has(item.id);

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

                <div className="flex-1 relative">
                  <Textarea
                    className={`h-32 w-full rounded-md border px-4 py-3 text-lg shadow-sm transition-all outline-none placeholder:text-muted-foreground focus:ring-1 ${getInputStyles(fieldRating)}`}
                    placeholder={inputPlaceholder}
                    value={item.value}
                    onChange={(e) => handleResponseChange(item.id, e.target.value)}
                    onBlur={() => handleBlur(item.id, item.value)}
                  />

                  <div className="absolute right-3 top-3 pointer-events-none">
                    <StatusIcon isLoading={isLoading} />
                  </div>
                </div>
              </div>

              {fieldRating && (
                <div
                  className={`py-2 ${isMultiple && responseItems.length > 1 ? 'ml-8' : ''} animate-in fade-in slide-in-from-top-2 duration-700 ease-out ${fieldRating.rate === 'valid'
                    ? 'text-emerald-600'
                    : fieldRating.rate === 'partial'
                      ? 'text-amber-600'
                      : 'text-rose-600'
                    }`}
                >
                  <div className="text-sm leading-relaxed">
                    {fieldRating.comment}
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
            className="group w-full py-3 px-4 border-2 border-dashed border-slate-300 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-2 text-slate-600 hover:text-blue-600"
          >
            <Plus className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
            <span className="font-medium">Add another response</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default SimpleQuestionView;
