"use client";
import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SimpleQuestion } from '../types';
import { rateSimpleField, type FieldRatingResult } from '@/lib/formApi';
import { FieldRatingView, type FieldRating } from '../ratings/FieldRating';

export function SimpleQuestionView({ q, path, value, onChange, onRatingChange, rating }: { q: SimpleQuestion; path: string; value: Record<string, unknown>; onChange: (v: unknown) => void; onRatingChange?: (path: string, rating: FieldRatingResult | null) => void; rating?: FieldRating }) {
  const [isRating, setIsRating] = useState(false);

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
    const ratingResult = await rateSimpleField(q.question, currentValue, q.examples);
    console.log('[SimpleQuestion] Rating result:', ratingResult);
    setIsRating(false);

    if (ratingResult) {
      onRatingChange(path, ratingResult);
    }
  };

  const getBorderColor = () => {
    if (!rating) return 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500';
    switch (rating.rate) {
      case 'valid': return 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500 bg-emerald-50/30';
      case 'partial': return 'border-amber-500 focus:border-amber-500 focus:ring-amber-500 bg-amber-50/30';
      case 'invalid': return 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30';
      default: return 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500';
    }
  };

  return (
    <div>
      <div className="mb-3">
        <Label className="block text-lg font-medium text-slate-900">{q.question}</Label>
        {q.description ? (
          <div className="mt-1 text-sm text-muted-foreground">{q.description}</div>
        ) : null}
      </div>
      <div className="relative">
        <Textarea
          className={`w-full rounded-md border bg-transparent px-4 py-3 text-lg shadow-sm transition-all outline-none placeholder:text-muted-foreground focus:ring-1 ${getBorderColor()}`}
          placeholder={q.examples && q.examples.length > 0 ? `e.g. ${q.examples.join(', ')}` : undefined}
          value={(value[path] as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
        />
        {isRating && (
          <div className="absolute right-3 top-3 flex items-center gap-2 text-xs text-slate-500">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            <span>Evaluating...</span>
          </div>
        )}
      </div>
      {rating && <FieldRatingView rating={rating} />}
    </div>
  );
}

export default SimpleQuestionView;
