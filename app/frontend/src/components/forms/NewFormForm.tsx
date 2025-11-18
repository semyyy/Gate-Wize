"use client";

import { useState } from 'react';
import { useDialog, DialogClose } from '@/components/ui/dialog';

export function NewFormForm({ onCreate, initialName }: { onCreate: (name: string, useDefault: boolean) => Promise<void> | void; initialName?: string }) {
  const [name, setName] = useState(initialName ?? '');
  const [useDefault, setUseDefault] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);
  const { close } = useDialog();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
          await onCreate(name.trim(), useDefault);
          close();
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-3"
    >
      <div>
        <label className="block text-sm mb-1">Form name</label>
        <input
          className="w-full border rounded px-2 py-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Customer Feedback"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={useDefault} onChange={(e) => setUseDefault(e.target.checked)} />
        Use default template
      </label>
      <div className="flex items-center gap-2 justify-end">
        <DialogClose asChild>
          <button type="button" className="border rounded px-3 py-1">
            Cancel
          </button>
        </DialogClose>
        <button type="submit" className="border rounded px-3 py-1" disabled={busy || !name.trim()}>
          {busy ? 'Creating…' : 'Create'}
        </button>
      </div>
    </form>
  );
}

export default NewFormForm;
