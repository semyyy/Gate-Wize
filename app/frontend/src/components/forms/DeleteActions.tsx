/**
 * Copyright (c) 2026 EAExpertise
 *
 * This software is licensed under the MIT License with Commons Clause.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to use,
 * copy, modify, merge, publish, distribute, and sublicense the Software,
 * subject to the conditions of the MIT License and the Commons Clause.
 *
 * Commercial use of this Software is strictly prohibited unless explicit prior
 * written permission is obtained from EAExpertise.
 *
 * The Software may be used for internal business purposes, research,
 * evaluation, or other non-commercial purposes.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

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
