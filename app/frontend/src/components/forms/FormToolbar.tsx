"use client";

import * as React from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import NewFormForm from '@/components/forms/NewFormForm';
import DeleteActions from '@/components/forms/DeleteActions';

export function FormToolbar({
  forms,
  currentId,
  onChangeCurrent,
  loading,
  justRefreshed,
  onCreate,
  onDelete,
}: {
  forms: { id: string; name: string }[];
  currentId?: string;
  onChangeCurrent: (id: string | undefined) => void;
  loading: boolean;
  justRefreshed?: boolean;
  onCreate: (name: string, useDefault: boolean) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
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
    <div className="sticky top-0 z-10 bg-white border-b py-2 flex items-center gap-3">
      {forms.length > 0 ? (
        <Select value={currentId} onValueChange={onChangeCurrent} disabled={loading}>
          <SelectTrigger className="border rounded px-2 py-1 min-w-56 flex items-center justify-between">
            {selectedLabel ? (
              <span className="truncate text-sm text-gray-800">{selectedLabel}</span>
            ) : (
              <SelectValue placeholder="Select form" />
            )}
            <svg className="ml-2 h-4 w-4 opacity-60" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
          </SelectTrigger>
          <SelectContent>
            {forms.map((f) => (
              <SelectItem key={f.id} value={f.id}>{labelFor(f)}</SelectItem>
            ))}
            {!forms.some(f => f.id === currentId) && currentId ? (
              <SelectItem value={currentId}>{currentId}</SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-600" aria-live="polite">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" aria-label="Refreshing" />
          <span className="text-sm">Refreshing…</span>
        </div>
      ) : justRefreshed ? (
        <span className="text-sm text-emerald-600" aria-live="polite">Updated</span>
      ) : null}

      <Dialog>
        <DialogTrigger asChild>
          <button className="border rounded p-2 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading} title="New Form" aria-label="New Form">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader title="Create New Form" description="Choose a name and optionally start from the default template" />
          <NewFormForm onCreate={onCreate} />
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <button
            className="border rounded p-2 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!currentId || loading}
            title="Delete Form"
            aria-label="Delete Form"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-1 0v12a2 2 0 01-2 2H9a2 2 0 01-2-2V7h10z"/></svg>
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader title="Delete Form" description={currentId ? `Are you sure you want to delete "${currentId}"? This action cannot be undone.` : 'No form selected.'} />
          <DeleteActions canDelete={!!currentId} onDelete={onDelete} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FormToolbar;
