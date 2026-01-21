"use client";

import { useEffect, useState, useRef } from 'react';
import type { FormSpec, Question, Section } from './types';
import { SimpleQuestionView } from './views/SimpleQuestion';
import { OptionQuestionView } from './views/OptionQuestion';
import { DetailedQuestionView } from './views/DetailedQuestion';
import { ImageQuestionView } from './views/ImageQuestion';
import { FieldRatingView, type FieldRating } from './ratings/FieldRating';
import type { FieldRatingResult } from '@/lib/formApi';

export function StructuredForm({ spec, onChange, ratings: externalRatings, value: externalValue, onRatingChange, onSyncRequest }: { spec: FormSpec; onChange?: (value: Record<string, unknown>) => void; ratings?: Record<string, FieldRating>; value?: Record<string, unknown>; onRatingChange?: (path: string, rating: FieldRatingResult | null) => void; onSyncRequest?: (path: string) => void }) {
  const [internalValue, setInternalValue] = useState<Record<string, unknown>>({});
  const [internalRatings, setInternalRatings] = useState<Record<string, FieldRating>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Use external value if provided, otherwise use internal state
  const value = externalValue !== undefined ? externalValue : internalValue;
  // Merge external and internal ratings, with internal taking precedence
  const ratings = { ...externalRatings, ...internalRatings };

  const set = (key: string, v: unknown) => {
    const next = { ...value, [key]: v };
    if (externalValue !== undefined) {
      // Controlled mode - just notify parent
      if (onChange) onChange(next);
    } else {
      // Uncontrolled mode - manage internal state
      setInternalValue(next);
      if (onChange) onChange(next);
    }
  };

  const handleRatingChange = (path: string, rating: FieldRatingResult | null) => {
    if (onRatingChange) {
      onRatingChange(path, rating);
      return;
    }

    if (!rating) {
      setInternalRatings((prev) => {
        const { [path]: _, ...rest } = prev;
        return rest;
      });
      return;
    }

    const fieldRating: FieldRating = {
      comment: rating.comment,
      rate: rating.rate || 'partial',
    };

    // Always update internal ratings
    setInternalRatings(prev => ({ ...prev, [path]: fieldRating }));
  };

  useEffect(() => {
    if (externalValue === undefined) {
      setInternalValue({});
      if (onChange) onChange({});
    }
    // Clear ratings when spec changes
    setInternalRatings({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec]);

  // Clear internal ratings when external value is cleared
  useEffect(() => {
    if (externalValue !== undefined && Object.keys(externalValue).length === 0) {
      setInternalRatings({});
    }
  }, [externalValue]);

  // Handle double clicks to sync (Preview -> Editor)
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!onSyncRequest) return;
    let target = e.target as HTMLElement | null;
    while (target && target !== containerRef.current) {
      const path = target.getAttribute('data-json-path');
      if (path) {
        onSyncRequest(path);
        return;
      }
      target = target.parentElement;
    }
  };

  return (
    <div
      ref={containerRef}
      className="max-w-4xl mx-auto bg-white shadow-2xl rounded-2xl border border-slate-200 overflow-hidden"
      onDoubleClick={handleDoubleClick}
    >
      <header className="bg-slate-900 text-white p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2" data-json-path="name">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{spec.name}</h1>

            </div>
            {spec.description && <p className="text-slate-300 text-lg font-light" data-json-path="description">{spec.description}</p>}
          </div>
        </div>
      </header>
      <div className="p-8 sm:p-10 space-y-12">
        {spec.sections.map((s, si) => (
          <SectionView
            key={si}
            section={s}
            path={`s${si}`}
            setValue={set}
            value={value}
            ratings={ratings}
            index={si + 1}
            onRatingChange={handleRatingChange}
            jsonPath={`sections[${si}]`}
          />
        ))}
      </div>
    </div>
  );
}

function SectionView({ section, path, setValue, value, ratings, index, onRatingChange, jsonPath }: { section: Section; path: string; setValue: (key: string, v: unknown) => void; value: Record<string, unknown>; ratings?: Record<string, FieldRating>; index: number; onRatingChange?: (path: string, rating: FieldRatingResult | null) => void; jsonPath: string }) {
  return (
    <section className="space-y-6" data-json-path={jsonPath}>
      <div className="border-b border-slate-200 pb-4 mb-6">
        <h2 className="text-2xl font-semibold text-slate-900 flex items-center gap-2" data-json-path={`${jsonPath}.title`}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">{index}</span>
          {section.title}
        </h2>
        {section.description && <p className="text-muted-foreground text-lg mt-1 ml-10" data-json-path={`${jsonPath}.description`}>{section.description}</p>}
      </div>
      <div className="grid gap-6 mt-3">
        {section.questions.map((q, qi) => {
          const qPath = `${path}.q${qi}`;
          const qJsonPath = `${jsonPath}.questions[${qi}]`;
          return (
            <div key={qi} className="space-y-2">
              <QuestionView
                q={q}
                path={qPath}
                value={value}
                onChange={(v) => setValue(qPath, v)}
                onRatingChange={onRatingChange}
                ratings={ratings}
                jsonPath={qJsonPath}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function QuestionView({ q, path, value, onChange, onRatingChange, ratings, jsonPath }: { q: Question; path: string; value: Record<string, unknown>; onChange: (v: unknown) => void; onRatingChange?: (path: string, rating: FieldRatingResult | null) => void; ratings?: Record<string, FieldRating>; jsonPath: string }) {
  if (q.type === 'simple') return <SimpleQuestionView q={q as any} path={path} value={value} onChange={onChange} onRatingChange={onRatingChange} rating={ratings?.[path]} ratings={ratings} jsonPath={jsonPath} />;
  if (q.type === 'option') return <OptionQuestionView q={q as any} path={path} value={value} onChange={onChange} jsonPath={jsonPath} />;
  if (q.type === 'detailed') return <DetailedQuestionView q={q as any} path={path} value={value} onChange={onChange} onRatingChange={onRatingChange} ratings={ratings} jsonPath={jsonPath} />;
  if (q.type === 'image') return <ImageQuestionView q={q as any} path={path} value={value} onChange={onChange} jsonPath={jsonPath} />;
  return null;
}

// Views moved to ./views for clarity
