"use client";

import { useEffect, useRef, useState } from 'react';
import { StructuredForm } from '@/components/structured-form/StructuredForm';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, useDialog, DialogClose } from '@/components/ui/dialog';
import { JsonEditor, type JsonEditorError } from '@/components/json/JsonEditor';
import { parse, parseTree, printParseErrorCode, type ParseError } from 'jsonc-parser';
import type { FormSpec } from '@/components/structured-form/types';

const starter: FormSpec = {
  name: 'Opportunity Assessment',
  description: 'Capture requirements and assess problems/opportunities',
  sections: [
    {
      title: 'Basics',
      description: 'General context',
      questions: [
        { type: 'simple', question: 'What are the functional requirements?', description: 'Be specific', examples: ['User can login', 'Export to CSV'] },
        { type: 'option', question: 'What solution type?', options: ['make', 'buy', 'integration'], justification: true, description: 'Choose one', examples: ['buy'] },
      ],
    },
    {
      title: 'Problems / Opportunities',
      description: 'Capture detailed items as rows',
      questions: [
        {
          type: 'detailed',
          question: 'Which problems or opportunities motivate this project?',
          attributes: [
            { name: 'type', description: 'problem or opportunity', options: ['problem', 'opportunity'] },
            { name: 'description' },
            { name: 'impact', options: ['Low', 'Medium', 'High'] },
          ],
          examples: [
            { type: 'problem', description: 'Drop in customer retention rate', impact: 'High' },
          ],
        },
      ],
    },
  ],
};

export default function StructuredBuilderPage() {
  const [text, setText] = useState<string>(JSON.stringify(starter, null, 2));
  const [val, setVal] = useState<Record<string, unknown>>({});
  const [parseErrors, setParseErrors] = useState<JsonEditorError[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [spec, setSpec] = useState<FormSpec>(starter); // keep last valid spec for preview
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');
  const saveErrorRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  const suspendSaveRef = useRef<boolean>(false);
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';
  const DEFAULT_ID = '__default';

  function validateSpec(obj: any): string[] {
    const errs: string[] = [];
    if (!obj || typeof obj !== 'object') {
      errs.push('Root must be an object.');
      return errs;
    }
    if (!obj.name || typeof obj.name !== 'string') errs.push('`name` is required (string).');
    if (!Array.isArray(obj.sections)) errs.push('`sections` must be an array.');
    if (Array.isArray(obj.sections)) {
      obj.sections.forEach((s: any, si: number) => {
        if (!s || typeof s !== 'object') errs.push(`sections[${si}] must be an object.`);
        if (!s.title || typeof s.title !== 'string') errs.push(`sections[${si}].title is required (string).`);
        if (!Array.isArray(s.questions)) errs.push(`sections[${si}].questions must be an array.`);
        (s.questions ?? []).forEach((q: any, qi: number) => {
          if (!q || typeof q !== 'object') return errs.push(`sections[${si}].questions[${qi}] must be an object.`);
          if (!['simple', 'option', 'detailed'].includes(q.type)) errs.push(`sections[${si}].questions[${qi}].type must be 'simple' | 'option' | 'detailed'.`);
          if (!q.question || typeof q.question !== 'string') errs.push(`sections[${si}].questions[${qi}].question is required (string).`);
          if (q.type === 'option' && !Array.isArray(q.options)) errs.push(`sections[${si}].questions[${qi}].options must be an array.`);
          if (q.type === 'detailed' && !Array.isArray(q.attributes)) errs.push(`sections[${si}].questions[${qi}].attributes must be an array.`);
        });
      });
    }
    return errs;
  }

  useEffect(() => {
    const errors: ParseError[] = [];
    const obj = parse(text, errors, { allowTrailingComma: true, disallowComments: false });
    setParseErrors(
      errors.map((e) => ({
        offset: e.offset,
        length: e.length,
        message: `JSON error: ${printParseErrorCode(e.error)}`,
      }))
    );
    if (errors.length > 0) return; // keep last valid spec
    const vErrs = validateSpec(obj);
    setValidationErrors(vErrs);
    if (vErrs.length === 0) setSpec(obj as FormSpec);
  }, [text]);

  // derive an id from the spec name for storage
  function formIdFromName(name?: string) {
    if (!name || typeof name !== 'string') return 'default';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'default';
  }

  // list existing forms
  type FormItem = { id: string; name: string };
  const [forms, setForms] = useState<FormItem[]>([]);
  const [currentId, setCurrentId] = useState<string>(() => DEFAULT_ID);

  async function refreshList() {
    try {
      const r = await fetch(`${API_BASE}/api/form/list`);
      const j = await r.json();
      if (j?.ok) setForms(j.data ?? []);
    } catch {}
  }

  useEffect(() => {
    refreshList();
  }, []);

  // load selected form whenever currentId changes
  useEffect(() => {
    const id = currentId;
    suspendSaveRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    (async () => {
      try {
        if (id === DEFAULT_ID) {
          setText(JSON.stringify(starter, null, 2));
          lastSavedRef.current = '';
          setSaveStatus('idle');
          return;
        }
        const res = await fetch(`${API_BASE}/api/form/load/${encodeURIComponent(id)}`);
        if (!res.ok) return; // nothing saved yet
        const resp = await res.json();
        const loaded = resp && typeof resp === 'object' && 'data' in resp ? resp.data : resp;
        if (loaded == null) {
          const fresh = { ...starter, name: id } as FormSpec;
          setText(JSON.stringify(fresh, null, 2));
          lastSavedRef.current = '';
          setSaveStatus('idle');
        } else {
          const s = JSON.stringify(loaded, null, 2);
          setText(s);
          try {
            lastSavedRef.current = JSON.stringify(loaded);
            setSaveStatus('synced');
          } catch {}
        }
      } catch (err) {
        console.warn('load error', err);
      } finally {
        suspendSaveRef.current = false;
      }
    })();
  }, [API_BASE, currentId]);

  // autosave whenever `spec` (the last valid spec) changes and there are no parse/validation errors
  useEffect(() => {
    if (parseErrors.length > 0) return;
    if (validationErrors.length > 0) return;
    if (suspendSaveRef.current) return;
    if (currentId === DEFAULT_ID) return; // never persist the default template
    const id = currentId;

    // avoid saving unchanged spec
    const current = JSON.stringify(spec);
    if (current === lastSavedRef.current) {
      setSaveStatus('synced');
      console.log('no changes to save');
      return;
    }
    // schedule save

    // debounce saves
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      console.log('saving spec...', spec);
      try {
        const res = await fetch(`${API_BASE}/api/form/save/${encodeURIComponent(id)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(spec),
        });
        console.log('save response', res);
        if (!res.ok) throw new Error(`save failed: ${res.status}`);
        lastSavedRef.current = current;
        refreshList();
        
        setSaveStatus('synced');
      } catch (err: any) {
        saveErrorRef.current = err?.message ?? String(err);
        setSaveStatus('error');
      }
    }, 900);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [spec, parseErrors, validationErrors, API_BASE, currentId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <section className="rounded-lg border p-4">
        <h2 className="text-xl font-semibold mb-3">Spec JSON</h2>
        <JsonEditor value={text} onChange={setText} errors={parseErrors} />
        {parseErrors.length > 0 && (
          <ul className="mt-3 list-disc pl-5 text-sm text-red-600">
            {parseErrors.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Preview</h2>
          {parseErrors.length > 0 ? (
            <span className="text-sm text-red-600">Parse errors: {parseErrors.length}. Showing last valid.</span>
          ) : validationErrors.length > 0 ? (
            <span className="text-sm text-amber-600">Spec issues: {validationErrors.length}. Showing last valid.</span>
          ) : (
            saveStatus === 'saving' ? (
              <span className="text-sm text-blue-600">Saving…</span>
            ) : saveStatus === 'error' ? (
              <span className="text-sm text-red-600">Save failed{saveErrorRef.current ? `: ${saveErrorRef.current}` : ''}</span>
            ) : (
              <span className="text-sm text-emerald-600">Synced</span>
            )
          )}
        </div>
        <StructuredForm spec={spec} onChange={setVal} />
        <div className="mt-6 border-t pt-3">
          <div className="flex items-center gap-2">
            <select
              className="border rounded px-2 py-1"
              value={currentId}
              onChange={(e) => setCurrentId(e.target.value)}
            >
              <option value={DEFAULT_ID}>(default)</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>{f.name || f.id}</option>
              ))}
              {!forms.some(f => f.id === currentId) && currentId !== DEFAULT_ID ? (
                <option value={currentId}>{currentId}</option>
              ) : null}
            </select>
            <Dialog>
              <DialogTrigger asChild>
                <button className="border rounded px-3 py-1">New Form</button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader title="Create New Form" description="Choose a name and optionally start from the default template" />
                <NewFormForm onCreate={async (name, useDefault) => {
                  const id = formIdFromName(name);
                  setCurrentId(id);
                  suspendSaveRef.current = true;
                  try {
                    const base = useDefault
                      ? ({ ...starter, name } as FormSpec)
                      : ({ name, description: '', sections: [] } as FormSpec);
                    setText(JSON.stringify(base, null, 2));
                    lastSavedRef.current = '';
                    setSaveStatus('saving');
                    const res = await fetch(`${API_BASE}/api/form/save/${encodeURIComponent(id)}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(base),
                    });
                    if (!res.ok) throw new Error(`save failed: ${res.status}`);
                    lastSavedRef.current = JSON.stringify(base);
                    setSaveStatus('synced');
                    await refreshList();
                  } finally {
                    suspendSaveRef.current = false;
                  }
                }} />
              </DialogContent>
            </Dialog>
            {/* Removed manual Save; autosave handles persistence */}
            <button
              className="border rounded px-3 py-1 text-red-600"
              disabled={currentId === DEFAULT_ID}
              onClick={async () => {
                if (!currentId) return;
                if (!confirm(`Delete form ${currentId}?`)) return;
                try {
                  const res = await fetch(`${API_BASE}/api/form/delete/${encodeURIComponent(currentId)}`, { method: 'DELETE' });
                  if (!res.ok) throw new Error(`delete failed: ${res.status}`);
                  setCurrentId(DEFAULT_ID);
                  lastSavedRef.current = '';
                  refreshList();
                } catch (err: any) {
                  alert(`Delete failed: ${err?.message ?? String(err)}`);
                }
              }}
            >Delete</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function NewFormForm({ onCreate, initialName }: { onCreate: (name: string, useDefault: boolean) => Promise<void> | void; initialName?: string }) {
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
