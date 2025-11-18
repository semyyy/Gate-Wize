"use client";

import { useEffect, useRef, useState } from 'react';
import { StructuredForm } from '@/components/structured-form/StructuredForm';
import { JsonEditor, type JsonEditorError } from '@/components/json/JsonEditor';
import { parse, printParseErrorCode, type ParseError } from 'jsonc-parser';
import { saveForm, formExists } from '@/lib/formApi';
import { formIdFromName } from '@/lib/slug';
import type { FormSpec } from '@/components/structured-form/types';
import { validateSpec } from '@/lib/validateSpec';
import { Dialog, DialogContent, DialogHeader, DialogTrigger, DialogClose } from '@/components/ui/dialog';

const default_form: FormSpec = {
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

export default function AdminPage() {
  const [text, setText] = useState<string>('');
  const [val, setVal] = useState<Record<string, unknown>>({});
  const [parseErrors, setParseErrors] = useState<JsonEditorError[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [spec, setSpec] = useState<FormSpec>(default_form); // last valid spec for preview
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'unsaved' | 'synced'>('idle');
  const saveErrorRef = useRef<string | null>(null);
  const suspendSaveRef = useRef<boolean>(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  const [firstSavedId, setFirstSavedId] = useState<string | null>(null); // once set, autosave to this id
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';
  // Single-document editor with first-save then autosync


  // utilities moved to lib/formUtils


  useEffect(() => {
    const errors: ParseError[] = [];
    if (text.trim() === '') {
      setParseErrors([]);
      setValidationErrors([]);
      return;
    }
    const obj = parse(text, errors, { allowTrailingComma: true, disallowComments: false });
    setParseErrors(
      errors.map((e) => ({
        offset: e.offset,
        length: e.length,
        message: `JSON error: ${printParseErrorCode(e.error)}`,
      }))
    );
    if (errors.length > 0) return;
    const vErrs = validateSpec(obj);
    setValidationErrors(vErrs);
    if (vErrs.length === 0) setSpec(obj as FormSpec);
    // mark unsaved if after first save or before save
    setSaveStatus(firstSavedId ? 'unsaved' : 'idle');
  }, [text, firstSavedId]);


  // No selection: optional load by typing an id in name and clicking Load button could be added later
  // First save with optional override confirm; afterward, autosave
  const handleSave = async () => {
    if (text.trim().length === 0) return;
    if (parseErrors.length > 0 || validationErrors.length > 0) return;
    const id = firstSavedId ?? formIdFromName((spec as FormSpec)?.name as string | undefined);
    if (!id) return;
    try {
      setSaveStatus('saving');
      if (!firstSavedId) {
        const exists = await formExists(id);
        if (exists) {
          // ask confirmation via dialog component (handled in UI); this function is called only on Confirm
        }
      }
      await saveForm(id, spec as FormSpec);
      setFirstSavedId(id);
      lastSavedRef.current = JSON.stringify(spec);
      setSaveStatus('saved');
    } catch (err: any) {
      saveErrorRef.current = err?.message ?? String(err);
      setSaveStatus('error');
    }
  };

  // Autosave after first successful save
  useEffect(() => {
    if (!firstSavedId) return;
    if (parseErrors.length > 0 || validationErrors.length > 0) return;
    if (suspendSaveRef.current) return;
    const current = JSON.stringify(spec);
    if (current === lastSavedRef.current) {
      setSaveStatus('synced');
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        await saveForm(firstSavedId, spec as FormSpec);
        lastSavedRef.current = current;
        setSaveStatus('synced');
      } catch (err: any) {
        saveErrorRef.current = err?.message ?? String(err);
        setSaveStatus('error');
      }
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [spec, firstSavedId, parseErrors, validationErrors]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 h-screen">
      {
        <section className="rounded-lg border p-4 flex flex-col min-h-0">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Spec JSON</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm border rounded px-3 py-1 cursor-pointer" title="Upload JSON file">
                Upload JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    setText(text);
                  }}
                />
              </label>
              <button
                className="text-sm border rounded px-3 py-1"
                title="Load the default template into the editor"
                onClick={async () => {
                  const base = { ...default_form } as FormSpec;
                  setText(JSON.stringify(base, null, 2));
                  setSaveStatus('unsaved');
                  setFirstSavedId(null);
                  lastSavedRef.current = '';
                }}
              >
                Use default template
              </button>
            </div>
          </div>
          <div className="mt-2 flex-1 min-h-0">
            <JsonEditor value={text} onChange={setText} errors={parseErrors} className="h-full" />
          </div>
          {parseErrors.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-sm text-red-600">
              {parseErrors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
          )}
        </section>
      }
      <section className="rounded-lg border p-0 flex flex-col min-h-0">
        <div className="sticky top-0 z-10 border-b bg-background px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Preview</h2>
            <div className="flex items-center gap-3">
              {parseErrors.length > 0 ? (
                <span className="text-sm text-red-600">Parse errors: {parseErrors.length}. Showing last valid.</span>
              ) : validationErrors.length > 0 ? (
                <span className="text-sm text-amber-600">Spec issues: {validationErrors.length}. Showing last valid.</span>
              ) : saveStatus === 'saving' ? (
                <span className="text-sm text-blue-600">Saving…</span>
              ) : saveStatus === 'error' ? (
                <span className="text-sm text-red-600">Save failed{saveErrorRef.current ? `: ${saveErrorRef.current}` : ''}</span>
              ) : saveStatus === 'unsaved' ? (
                <span className="text-sm text-amber-600">Unsaved changes</span>
              ) : saveStatus === 'saved' ? (
                <span className="text-sm text-emerald-600">Saved</span>
              ) : saveStatus === 'synced' ? (
                <span className="text-sm text-emerald-600">Synced</span>
              ) : null}
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    className="border rounded p-2 disabled:opacity-50"
                    disabled={text.trim().length === 0 || parseErrors.length > 0 || validationErrors.length > 0}
                    title="Save (first time asks to override if exists)"
                    aria-label="Save"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h8l4 4v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h8V3" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 21v-6h6v6" />
                    </svg>
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader
                    title="Save Form"
                    description={
                      (() => {
                        const id = firstSavedId ?? formIdFromName((spec as FormSpec)?.name as string | undefined);
                        return firstSavedId
                          ? `Saving updates to \"${firstSavedId}\".`
                          : `This will create or overwrite \"${id}\" if it exists. Continue?`;
                      })()
                    }
                  />
                  <div className="flex justify-end gap-2">
                    <DialogClose asChild>
                      <button className="border rounded px-3 py-1 text-sm">Cancel</button>
                    </DialogClose>
                    <DialogClose asChild>
                      <button className="border rounded px-3 py-1 text-sm bg-black text-white" onClick={handleSave}>
                        Confirm Save
                      </button>
                    </DialogClose>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        <div className="px-4 py-4 flex-1 min-h-0 overflow-auto">
          {text.trim().length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Start by uploading JSON or using the default template.</div>
          ) : (
            <div className="flex flex-col gap-4">
              <StructuredForm spec={spec} onChange={setVal} />
              {parseErrors.length > 0 || validationErrors.length > 0 ? (
                <span className="text-sm text-red-600">Fix errors before saving.</span>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

