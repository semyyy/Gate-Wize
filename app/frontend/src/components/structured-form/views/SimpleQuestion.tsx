"use client";
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SimpleQuestion } from '../types';
import { rateSimpleField, type FieldRatingResult } from '@/lib/formApi';
import { getInputStyles, StatusIcon, type FieldRating } from '../ratings/FieldRating';

export function SimpleQuestionView({ q, path, value, onChange, onRatingChange, rating }: { q: SimpleQuestion; path: string; value: Record<string, unknown>; onChange: (v: unknown) => void; onRatingChange?: (path: string, rating: FieldRatingResult | null) => void; rating?: FieldRating }) {
  const [isRating, setIsRating] = useState(false);
  const [shake, setShake] = useState(false);

  // Trigger shake on invalid rating
  useEffect(() => {
    if (rating?.rate === 'invalid') {
      setShake(true);
      const timer = setTimeout(() => setShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [rating]);

  const handleBlur = async () => {
    console.log('[SimpleQuestion] handleBlur called', { path, onRatingChange: !!onRatingChange });
    const currentValue = (value[path] as string) ?? '';
    console.log('[SimpleQuestion] currentValue:', currentValue);

    if (!currentValue.trim() || !onRatingChange) {
      console.log('[SimpleQuestion] Skipping rating - empty or no callback');
      return;
    }

    console.log('[SimpleQuestion] Starting rating...');
    setIsRating(true);
    const ratingResult = await rateSimpleField(q.question, currentValue, q.examples, q.promptConfig);
    console.log('[SimpleQuestion] Rating result:', ratingResult);
    setIsRating(false);

    if (ratingResult) {
      onRatingChange(path, ratingResult);
    }
  };

  return (
    <div className={shake ? 'shake' : ''}>
      <div className="mb-3">
        <Label className="block text-lg font-medium text-slate-900">{q.question}</Label>
        {q.description ? (
          <div className="mt-1 text-sm text-muted-foreground">{q.description}</div>
        ) : null}
      </div>
      <div className="relative">
        <Textarea
          className={`w-full rounded-md border px-4 py-3 text-lg shadow-sm transition-all outline-none placeholder:text-muted-foreground focus:ring-1 ${getInputStyles(rating)}`}
          placeholder={q.examples && q.examples.length > 0 ? `e.g. ${q.examples.join(', ')}` : undefined}
          value={(value[path] as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
        />

        <div className="absolute right-3 top-3 flex items-center justify-center pointer-events-none">
          <StatusIcon rating={rating} isLoading={isRating} />
        </div>
      </div>

      {rating && (
        <div
          className={`mt-3 py-2 animate-in fade-in slide-in-from-top-2 duration-700 ease-out ${rating.rate === 'valid'
            ? 'text-emerald-600'
            : rating.rate === 'partial'
              ? 'text-amber-600'
              : 'text-rose-600'
            }`}
        >
          <div className="text-sm leading-relaxed">
            {rating.comment}
          </div>
        </div>
      )}
    </div>
  );
}

export default SimpleQuestionView;
