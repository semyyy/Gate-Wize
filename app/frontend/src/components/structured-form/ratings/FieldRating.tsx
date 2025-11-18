"use client";

import * as React from 'react';

export type FieldRating = { rate: 'invalid' | 'partial' | 'valid'; comment: string };

export function FieldRatingView({ rating }: { rating: FieldRating }) {
  const idx = rating.rate === 'invalid' ? 0 : rating.rate === 'partial' ? 1 : 2;
  const colors = ['bg-red-500', 'bg-amber-500', 'bg-emerald-500'] as const;
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
    <div className="mt-1">
      <div className="h-2 rounded bg-gray-200 overflow-hidden">
        <div
          className={`h-2 ${colors[idx]} transition-[width] duration-700 ease-in-out`}
          style={{ width: `${pct}%`, willChange: 'width' }}
          aria-label={`Rating: ${rating.rate}`}
        />
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        <span>{typed}</span>
        <span className={`inline-block w-[1px] h-[1em] align-[-0.1em] ml-[2px] bg-current ${typingDone ? 'opacity-0' : 'opacity-80'} animate-pulse`} />
      </div>
    </div>
  );
}
