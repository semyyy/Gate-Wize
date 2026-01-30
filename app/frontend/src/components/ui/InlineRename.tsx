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

import React, { useEffect, useRef, useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';

export default function InlineRename({ name, onChange }: { name: string; onChange: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState<string>(name ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) setLocal(name ?? '');
  }, [name, editing]);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const start = () => setEditing(true);
  const cancel = () => {
    setLocal(name ?? '');
    setEditing(false);
  };
  const confirm = () => {
    const trimmed = (local ?? '').trim();
    onChange(trimmed);
    
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2">
      {!editing ? (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{name || 'Unnamed form'}</span>
          <button aria-label="Edit name" title="Edit name" className="p-1 rounded hover:bg-slate-100" onClick={start}>
            <Edit2 className="h-4 w-4" strokeWidth={2} color="black" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            className="border rounded px-2 py-1 text-sm"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirm();
              if (e.key === 'Escape') cancel();
            }}
            placeholder="Form name (external)"
          />
          <button aria-label="Confirm name" title="Confirm" className="p-1" onClick={confirm}>
            <Check className="h-4 w-4" strokeWidth={2} color="black" />
          </button>
          <button aria-label="Cancel name" title="Cancel" className="p-1" onClick={cancel}>
            <X className="h-4 w-4" strokeWidth={2} color="black" />
          </button>
        </div>
      )}
    </div>
  );
}
