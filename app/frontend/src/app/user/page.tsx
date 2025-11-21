"use client";

import { useEffect, useRef, useState } from 'react';
import { StructuredForm } from '@/components/structured-form/StructuredForm';
import { useFormList } from '@/hooks/useFormList';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { loadForm, rateForm, type FieldRating, type RatingsResponse } from '@/lib/formApi';
import type { FormSpec } from '@/components/structured-form/types';
import ViewerToolbar from '@/components/forms/ViewerToolbar';
import { Dialog, DialogContent, DialogHeader, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import GenAiLoadingOverlay from '@/components/ai/GenAiLoadingOverlay';

export default function UserPage() {
  const { forms, loading, justRefreshed } = useFormList();
  const { loadFormData, saveFormData, clearFormData, loadRatings, saveRatings } = useFormPersistence();
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const [spec, setSpec] = useState<FormSpec | null>(null);
  const [value, setValue] = useState<Record<string, unknown>>({});
  const [exporting, setExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ratings, setRatings] = useState<Record<string, FieldRating>>({});
  const [ratingLoading, setRatingLoading] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  useEffect(() => {
    if (!currentId && forms.length > 0) setCurrentId(forms[0].id);
  }, [forms, currentId]);

  // Load persisted data and ratings when switching forms
  useEffect(() => {
    if (currentId) {
      const persisted = loadFormData(currentId);
      const persistedRatings = loadRatings(currentId);
      setValue(persisted);
      setRatings(persistedRatings);
    } else {
      setValue({});
      setRatings({});
    }
  }, [currentId, loadFormData, loadRatings]);

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

  const handleClearForm = () => {
    if (!currentId) return;
    setClearDialogOpen(true);
  };

  const confirmClearForm = () => {
    if (!currentId) return;
    clearFormData(currentId); // This now clears both form data and ratings
    setValue({});
    setRatings({});
    setClearDialogOpen(false);
  };

  const handleRatingChange = (path: string, rating: { comment: string; rate?: 'invalid' | 'partial' | 'valid' } | null) => {
    if (!rating || !currentId) return;

    const updatedRatings = {
      ...ratings,
      [path]: {
        comment: rating.comment,
        rate: rating.rate || 'partial',
      },
    };

    setRatings(updatedRatings);
    saveRatings(currentId, updatedRatings);
  };

  const handleValueChange = (newValue: Record<string, unknown>) => {
    setValue(newValue);
    if (currentId) {
      saveFormData(currentId, newValue);
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
            onClearForm={handleClearForm}
          />
        </div>
        <div ref={containerRef} className="print-area relative px-4 py-4 flex-1 min-h-0 overflow-auto">
          {ratingLoading ? (
            <GenAiLoadingOverlay title="AI Rating in progress" subtitle="Reviewing your answers and crafting feedback…" />
          ) : null}
          {spec ? (
            <div className="avoid-break">
              <StructuredForm spec={spec} onChange={handleValueChange} value={value} ratings={ratings}/>
            </div>
          ) : forms.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No forms available.</div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">Select a form to preview and fill.</div>
          )}
        </div>
      </section>
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader
            title="Clear Form Data"
            description="Are you sure you want to clear all data for this form? This action cannot be undone."
          />
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmClearForm}>
              Clear Form
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
