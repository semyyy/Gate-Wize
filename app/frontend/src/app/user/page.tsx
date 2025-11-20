"use client";

import { useEffect, useRef, useState } from 'react';
import { StructuredForm } from '@/components/structured-form/StructuredForm';
import { useFormList } from '@/hooks/useFormList';
import { loadForm, rateForm, type FieldRating, type RatingsResponse } from '@/lib/formApi';
import type { FormSpec } from '@/components/structured-form/types';
import ViewerToolbar from '@/components/forms/ViewerToolbar';
// Using browser print for PDF export; removed jsPDF/html2canvas
import GenAiLoadingOverlay from '@/components/ai/GenAiLoadingOverlay';

export default function UserPage() {
  const { forms, loading, justRefreshed } = useFormList();
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const [spec, setSpec] = useState<FormSpec | null>(null);
  const [value, setValue] = useState<Record<string, unknown>>({});
  const [exporting, setExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ratings, setRatings] = useState<Record<string, FieldRating>>({});
  const [ratingLoading, setRatingLoading] = useState(false);

  useEffect(() => {
    if (!currentId && forms.length > 0) setCurrentId(forms[0].id);
  }, [forms, currentId]);

  // Clear answers and ratings when switching forms
  useEffect(() => {
    setValue({});
    setRatings({});
  }, [currentId]);

  useEffect(() => {
    (async () => {
      if (!currentId) {
        setSpec(null);
        return;
      }
      const loaded = await loadForm(currentId);
      setSpec(loaded);
    })();
  }, [currentId]);

  const handleExportPdf = async () => {
    try {
      setExporting(true);
      setTimeout(() => window.print(), 50);
    } finally {
      setTimeout(() => setExporting(false), 300);
    }
  };

  const handleRate = async () => {
    if (!spec) return;
    try {
      setRatingLoading(true);
      const result: RatingsResponse = await rateForm(spec, value);
      setRatings(result?.ratings ?? {});
    } finally {
      setRatingLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-0 md:gap-2 p-0 md:p-4 h-[100dvh]">
      <section className="rounded-lg border p-0 flex flex-col min-h-0">
        <div className="no-print">
        <ViewerToolbar
          forms={forms}
          currentId={currentId}
          onChangeCurrent={setCurrentId}
          loading={loading || exporting}
          justRefreshed={justRefreshed}
          onExportPdf={handleExportPdf}
          onRate={handleRate}
        />
        </div>
        <div ref={containerRef} className="print-area relative px-4 py-4 flex-1 min-h-0 overflow-auto">
          {ratingLoading ? (
            <GenAiLoadingOverlay title="AI Rating in progress" subtitle="Reviewing your answers and crafting feedback…" />
          ) : null}
          {spec ? (
            <div className="avoid-break">
              <StructuredForm spec={spec} onChange={setValue} ratings={ratings} />
            </div>
          ) : forms.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No forms available.</div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">Select a form to preview and fill.</div>
          )}
        </div>
      </section>
    </div>
  );
}
