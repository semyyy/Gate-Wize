"use client";

import * as React from 'react';

export type FieldRating = { rate: 'invalid' | 'partial' | 'valid'; comment: string };

export function FieldRatingView({ rating }: { rating: FieldRating }) {
  const idx = rating.rate === 'invalid' ? 0 : rating.rate === 'partial' ? 1 : 2;
  const colors = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500'] as const;
  const bgColors = ['bg-rose-50', 'bg-amber-50', 'bg-emerald-50'] as const;
  const borderColors = ['border-rose-200', 'border-amber-200', 'border-emerald-200'] as const;
  const textColors = ['text-rose-900', 'text-amber-900', 'text-emerald-900'] as const;

  const targetPct = ((idx + 1) / 3) * 100;
  const [pct, setPct] = React.useState<number>(0);
  const initializedRef = React.useRef(false);
  const [typed, setTyped] = React.useState('');
  const [typingDone, setTypingDone] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

  // Smooth width transition on updates
  React.useEffect(() => {
    if (!initializedRef.current) {
      const id = requestAnimationFrame(() => {
        setPct(targetPct);
        initializedRef.current = true;
      });
      return () => cancelAnimationFrame(id);
    }
    // Subsequent updates animate from previous width to new width
    const id = requestAnimationFrame(() => setPct(targetPct));
    return () => cancelAnimationFrame(id);
  }, [targetPct]);

  // Typewriter for comment
  React.useEffect(() => {
    // cleanup any previous typing
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setTyped('');
    setTypingDone(false);
    const text = String(rating.comment ?? '');
    let i = 0;
    const startDelay = 100; // slight pause before typing
    const typeNext = () => {
      setTyped(text.slice(0, i));
      i += 1;
      if (i <= text.length) {
        const step = 10 + ((i % 7) * 3); // subtle humanized pace
        timerRef.current = window.setTimeout(typeNext, step) as unknown as number;
      } else {
        setTypingDone(true);
      }
    };
    timerRef.current = window.setTimeout(typeNext, startDelay) as unknown as number;
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [rating.rate, rating.comment]);
  return (
    <div className="mt-2">
      <p className={`text-sm leading-5 ${textColors[idx]} transition-colors duration-300`}>
        <span>{typed}</span>
        <span
          className={`inline-block w-[1px] h-[1.1em] align-[-0.15em] ml-[2px] bg-current ${typingDone ? 'opacity-0' : 'opacity-50'} animate-pulse`}
        />
      </p>
    </div>
  );
}
