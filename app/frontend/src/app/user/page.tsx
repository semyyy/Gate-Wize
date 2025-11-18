"use client";

import { useEffect, useRef, useState } from 'react';
import { StructuredForm } from '@/components/structured-form/StructuredForm';
import { useFormList } from '@/hooks/useFormList';
import { loadForm, rateForm, type FieldRating, type RatingsResponse } from '@/lib/formApi';
import type { FormSpec } from '@/components/structured-form/types';
import ViewerToolbar from '@/components/forms/ViewerToolbar';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

  useEffect(() => {
    (async () => {
      if (!currentId) {
        setSpec(null);
        return;
      }
      const s = await loadForm(currentId);
      setSpec(s);
    })();
  }, [currentId]);

  const handleExportPdf = async () => {
    if (!containerRef.current) return;
    try {
      setExporting(true);
      const element = containerRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `${currentId ?? 'form'}.pdf`;
      pdf.save(filename);
    } finally {
      setExporting(false);
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
        <ViewerToolbar
          forms={forms}
          currentId={currentId}
          onChangeCurrent={setCurrentId}
          loading={loading || exporting}
          justRefreshed={justRefreshed}
          onExportPdf={handleExportPdf}
          onRate={handleRate}
        />
        <div ref={containerRef} className="px-4 py-4 flex-1 min-h-0 overflow-auto">
          {spec ? (
            <StructuredForm spec={spec} onChange={setValue} ratings={ratings} />
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
