"use client";

import { useState } from 'react';
import { DialogClose, useDialog } from '@/components/ui/dialog';

export function DeleteActions({ canDelete, onDelete }: { canDelete: boolean; onDelete: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  const { close } = useDialog();
  return (
    <div className="flex items-center gap-2 justify-end">
      <DialogClose asChild>
        <button type="button" className="border rounded px-3 py-1">
          Cancel
        </button>
      </DialogClose>
      <button
        className="border rounded px-3 py-1 text-red-600 disabled:opacity-50"
        disabled={!canDelete || busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onDelete();
            close();
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  );
}

export default DeleteActions;
