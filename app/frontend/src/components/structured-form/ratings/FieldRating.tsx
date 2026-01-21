"use client";

import * as React from 'react';

export type FieldRating = { rate: 'invalid' | 'partial' | 'valid'; comment: string; suggestionResponse?: string };

// Helper to get input styles based on rating
export function getInputStyles(rating?: FieldRating) {
  if (!rating) return 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500';

  switch (rating.rate) {
    case 'valid':
      return 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500';
    case 'partial':
      return 'border-amber-500 focus:border-amber-500 focus:ring-amber-500';
    case 'invalid':
      return 'border-rose-500 focus:border-rose-500 focus:ring-rose-500';
    default:
      return 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500';
  }
}

// Status Icon Component
export function StatusIcon({ rating, isLoading }: { rating?: FieldRating; isLoading?: boolean }) {
  if (isLoading) {
    return <div className="loading-spinner" />;
  }

  if (!rating) return null;

  switch (rating.rate) {
    case 'valid':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      );
    case 'partial':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z" />
        </svg>
      );
    case 'invalid':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      );
    default:
      return null;
  }
}

// Validation Message Component
export function ValidationMessage({ rating, isVisible }: { rating?: FieldRating; isVisible: boolean }) {
  const [typed, setTyped] = React.useState('');

  React.useEffect(() => {
    if (rating?.comment) {
      setTyped(rating.comment);
    } else {
      setTyped('');
    }
  }, [rating]);

  if (!rating) return <div className="validation-message" />;

  const colorClass = rating.rate === 'invalid' ? 'text-rose-600' : rating.rate === 'partial' ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className={`validation-message ${isVisible ? 'is-visible' : ''} ${colorClass} text-sm font-medium flex items-start gap-2`} aria-live="polite">
      <span>{typed}</span>
    </div>
  );
}

// Legacy view for backward compatibility if needed, but updated to use new styles
export function FieldRatingView({ rating }: { rating: FieldRating }) {
  return <ValidationMessage rating={rating} isVisible={true} />;
}
