"use client";

import * as React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StatusIndicator, type SaveStatus } from '@/components/ui/status-indicator';

export default function ViewerToolbar({
  forms,
  currentId,
  onChangeCurrent,
  loading,
  justRefreshed,
  onClearForm,
  onExportPdf,
  exporting,
  saveStatus = 'idle',
}: {
  forms: { id: string; name: string }[];
  currentId?: string;
  onChangeCurrent: (id: string | undefined) => void;
  loading: boolean;
  justRefreshed?: boolean;
  onClearForm?: () => void;
  onExportPdf?: () => void;
  exporting?: boolean;
  saveStatus?: SaveStatus;
}) {
  const nameCounts = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const f of forms) {
      const label = (f.name || f.id).trim();
      m.set(label, (m.get(label) ?? 0) + 1);
    }
    return m;
  }, [forms]);

  const labelFor = React.useCallback(
    (f: { id: string; name: string }) => {
      const base = (f.name || f.id).trim();
      const dup = (nameCounts.get(base) ?? 0) > 1;
      return dup ? `${base} (${f.id})` : base;
    },
    [nameCounts]
  );

  const selectedForm = React.useMemo(() => forms.find((f) => f.id === currentId), [forms, currentId]);
  const selectedLabel = selectedForm ? labelFor(selectedForm) : undefined;

  return (
    <div className="sticky top-0 z-10 bg-white border-b py-2 px-1 flex items-center gap-3">
      {forms.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="border border-gray-300 rounded px-3 py-2 min-w-56 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
              <span className="truncate text-sm text-gray-800">
                {selectedLabel || 'Select form'}
              </span>
              <svg className="ml-2 h-4 w-4 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56">
            {forms.map((f) => (
              <DropdownMenuItem
                key={f.id}
                onClick={() => onChangeCurrent(f.id)}
                className="cursor-pointer"
              >
                {labelFor(f)}
              </DropdownMenuItem>
            ))}
            {!forms.some(f => f.id === currentId) && currentId ? (
              <DropdownMenuItem onClick={() => onChangeCurrent(currentId)} className="cursor-pointer">
                {currentId}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-600" aria-live="polite">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" aria-label="Refreshing" />
          <span className="text-sm">Refreshing…</span>
        </div>
      ) : saveStatus !== 'idle' ? (
        <StatusIndicator status={saveStatus} />
      ) : justRefreshed ? (
        <span className="text-sm text-emerald-600" aria-live="polite">Updated</span>
      ) : null}

      <div className="flex-1" />
      <button
        className="border border-gray-300 bg-white
         hover:bg-gray-50 text-gray-700 rounded px-3 py-1 
         text-sm disabled:opacity-50 transition-colors flex 
         items-center gap-2"
        onClick={onExportPdf}
        disabled={!currentId || loading || exporting}
        title="Export form as PDF"
        aria-label="Export PDF"
      >
        {exporting ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export PDF</span>
          </>
        )}
      </button>
      <button
        className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded px-3 py-1 text-sm disabled:opacity-50 transition-colors"
        onClick={onClearForm}
        disabled={!currentId || loading}
        title="Clear all form data"
        aria-label="Clear Form"
      >
        Clear Form
      </button>
    </div >
  );
}
