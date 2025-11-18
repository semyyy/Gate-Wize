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
    onChange?.(next);
  };

  return (
    <div className="grid gap-4">
      <header>
        <h1 className="text-2xl font-semibold">{spec.name}</h1>
        {spec.description && <p className="text-muted-foreground mt-1">{spec.description}</p>}
      </header>
      {spec.sections.map((s, si) => (
        <SectionView key={si} section={s} path={`s${si}`} setValue={set} value={value} ratings={ratings} />
      ))}
    </div>
  );
}

function SectionView({ section, path, setValue, value, ratings }: { section: Section; path: string; setValue: (key: string, v: unknown) => void; value: Record<string, unknown>; ratings?: Record<string, FieldRating> }) {
  return (
    <section className="rounded-lg border p-4">
      <h2 className="text-xl font-semibold">{section.title}</h2>
      {section.description && <p className="text-muted-foreground mt-1">{section.description}</p>}
      <div className="grid gap-3 mt-3">
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
