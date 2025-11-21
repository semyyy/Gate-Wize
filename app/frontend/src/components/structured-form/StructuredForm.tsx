"use client";

import { useEffect, useState } from 'react';
import type { FormSpec, Question, Section } from './types';
import { SimpleQuestionView } from './views/SimpleQuestion';
import { OptionQuestionView } from './views/OptionQuestion';
import { DetailedQuestionView } from './views/DetailedQuestion';
import { FieldRatingView, type FieldRating } from './ratings/FieldRating';

export function StructuredForm({ spec, onChange, ratings }: { spec: FormSpec; onChange?: (value: Record<string, unknown>) => void; ratings?: Record<string, FieldRating> }) {
  const [value, setValue] = useState<Record<string, unknown>>({});

  const set = (key: string, v: unknown) => {
    const next = { ...value, [key]: v };
    setValue(next);
    if (onChange) onChange(next);
  };

  useEffect(() => {
    setValue({});
    if (onChange) onChange({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec]);

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-2xl border border-slate-200 overflow-hidden">
      <header className="bg-slate-900 text-white p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{spec.name}</h1>
              
            </div>
            {spec.description && <p className="text-slate-300 text-lg font-light">{spec.description}</p>}
          </div>
        </div>
      </header>
      <div className="p-8 sm:p-10 space-y-12">
        {spec.sections.map((s, si) => (
          <SectionView key={si} section={s} path={`s${si}`} setValue={set} value={value} ratings={ratings} index={si + 1} />
        ))}
      </div>
    </div>
  );
}

function SectionView({ section, path, setValue, value, ratings, index }: { section: Section; path: string; setValue: (key: string, v: unknown) => void; value: Record<string, unknown>; ratings?: Record<string, FieldRating>; index: number }) {
  return (
    <section className="space-y-6">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <h2 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">{index}</span>
          {section.title}
        </h2>
        {section.description && <p className="text-muted-foreground text-lg mt-1 ml-10">{section.description}</p>}
      </div>
      <div className="grid gap-6 mt-3">
        {section.questions.map((q, qi) => {
          const qPath = `${path}.q${qi}`;
          const fr = ratings?.[qPath];
          return (
            <div key={qi} className="space-y-2">
              <QuestionView q={q} path={qPath} value={value} onChange={(v) => setValue(qPath, v)} />
              {fr ? <FieldRatingView rating={fr} /> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function QuestionView({ q, path, value, onChange }: { q: Question; path: string; value: Record<string, unknown>; onChange: (v: unknown) => void }) {
  if (q.type === 'simple') return <SimpleQuestionView q={q as any} path={path} value={value} onChange={onChange} />;
  if (q.type === 'option') return <OptionQuestionView q={q as any} path={path} value={value} onChange={onChange} />;
  if (q.type === 'detailed') return <DetailedQuestionView q={q as any} path={path} value={value} onChange={onChange} />;
  return null;
}

// Views moved to ./views for clarity
