"use client";

import { useEffect, useRef, useState } from 'react';
import { StructuredForm } from '@/components/structured-form/StructuredForm';
import { JsonEditor, type JsonEditorError } from '@/components/json/JsonEditor';
import { parse, printParseErrorCode, type ParseError } from 'jsonc-parser';
import { useFormList } from '@/hooks/useFormList';
import { loadForm, saveForm, deleteForm } from '@/lib/formApi';
import { formIdFromName } from '@/lib/slug';
import { nextAvailableNameAndId } from '@/lib/formUtils';
import type { FormSpec } from '@/components/structured-form/types';
import FormToolbar from '@/components/forms/FormToolbar';
import { validateSpec } from '@/lib/validateSpec';

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
  const [spec, setSpec] = useState<FormSpec>(default_form); // keep last valid spec for preview
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');
  const saveErrorRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  const suspendSaveRef = useRef<boolean>(false);
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';
  // No default selection; default template is only used when creating a new form

  // list existing forms via shared hook (declare early for effects below)
  const { forms, setForms, loading: loadingList, justRefreshed: listJustRefreshed, refresh: refreshList } = useFormList();
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);


  // utilities moved to lib/formUtils


  useEffect(() => {
    const errors: ParseError[] = [];
    // When no forms exist and nothing selected, allow empty editor without errors
    if (text.trim() === '' && forms.length === 0 && !currentId) {
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
    if (errors.length > 0) return; // keep last valid spec
    const vErrs = validateSpec(obj);
    setValidationErrors(vErrs);
    if (vErrs.length === 0) setSpec(obj as FormSpec);
  }, [text, currentId, forms.length]);


  // pick first form if none selected when list updates
  useEffect(() => {
    if (!currentId && forms.length > 0) setCurrentId(forms[0].id);
  }, [forms, currentId]);

  // clear selection if no longer in list (avoid during loading/empty transient states)
  useEffect(() => {
    if (loadingList) return;
    if (!currentId) return;
    if (forms.length === 0) return;
    if (!forms.some((f) => f.id === currentId)) {
      setCurrentId(undefined);
    }
  }, [forms, currentId, loadingList]);

  // load selected form whenever currentId changes
  useEffect(() => {
    const id = currentId;
    suspendSaveRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    (async () => {
      try {
        if (!id) return;
        const loaded = await loadForm(id);
        if (loaded == null) {
          const fresh = { name: id, description: '', sections: [] } as FormSpec;
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
    // If no forms exist and user typed a valid spec, auto-create and save
    if (!currentId && forms.length === 0) {
      if (text.trim().length === 0) return;
      const id = formIdFromName((spec as FormSpec)?.name as string | undefined);
      const current = JSON.stringify(spec);
      if (current === lastSavedRef.current) {
        setSaveStatus('synced');
        return;
      }
      (async () => {
        setSaveStatus('saving');
        try {
          await saveForm(id, spec as FormSpec);
          lastSavedRef.current = current;
          setCurrentId(id);
          await refreshList();
          setSaveStatus('synced');
        } catch (err: any) {
          saveErrorRef.current = err?.message ?? String(err);
          setSaveStatus('error');
        }
      })();
      return;
    }
    if (!currentId) return; // don't persist when no form is selected (non-empty list)
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
        await saveForm(id, spec as FormSpec);
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
  }, [spec, parseErrors, validationErrors, API_BASE, currentId, refreshList]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      {(currentId || forms.length === 0) ? (
        <section className="rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Spec JSON</h2>
            {forms.length === 0 && !currentId ? (
              <div className="flex items-center gap-2">
                <button
                  className="text-sm border rounded px-3 py-1"
                  title="Create a new form from the default template"
                  onClick={async () => {
                    suspendSaveRef.current = true;
                    try {
                      const base = { ...default_form } as FormSpec;
                      const { name: uniqueName, id: newId } = nextAvailableNameAndId(base.name, forms);
                      base.name = uniqueName;
                      setText(JSON.stringify(base, null, 2));
                      lastSavedRef.current = '';
                      setSaveStatus('saving');
                      await saveForm(newId, base);
                      lastSavedRef.current = JSON.stringify(base);
                      setSaveStatus('synced');
                      setForms((prev) => (prev.some((f) => f.id === newId) ? prev : [...prev, { id: newId, name: base.name }]));
                      setCurrentId(newId);
                      await refreshList();
                    } finally {
                      suspendSaveRef.current = false;
                    }
                  }}
                >
                  Use default template
                </button>
              </div>
            ) : null}
          </div>
          <JsonEditor value={text} onChange={setText} errors={parseErrors} />
          {parseErrors.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-sm text-red-600">
              {parseErrors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      <section className="rounded-lg border p-4">
        {(() => {
          const canLocalPreview = !currentId && forms.length === 0 && text.trim().length > 0 && parseErrors.length === 0 && validationErrors.length === 0;
          return (currentId || canLocalPreview) ? (
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
          ) : null;
        })()}
        <div className="mt-6">
          <FormToolbar
            forms={forms}
            currentId={currentId}
            onChangeCurrent={(id) => setCurrentId(id)}
            loading={loadingList}
            justRefreshed={listJustRefreshed}
            onCreate={async (name, useDefault) => {
              const { name: finalName, id: finalId } = nextAvailableNameAndId(name, forms);
              suspendSaveRef.current = true;
              try {
                const base = useDefault
                  ? ({ ...default_form, name: finalName } as FormSpec)
                  : ({ name: finalName, description: '', sections: [] } as FormSpec);
                setText(JSON.stringify(base, null, 2));
                lastSavedRef.current = '';
                setSaveStatus('saving');
                await saveForm(finalId, base);
                lastSavedRef.current = JSON.stringify(base);
                setSaveStatus('synced');
                setForms((prev) => (prev.some((f) => f.id === finalId) ? prev : [...prev, { id: finalId, name: base.name }]));
                setCurrentId(finalId);
                await refreshList();
              } finally {
                suspendSaveRef.current = false;
              }
            }}
            onDelete={async () => {
              if (!currentId) return;
              try {
                const hadOnlyOne = forms.length <= 1;
                await deleteForm(currentId);
                setForms((prev) => prev.filter((f) => f.id !== currentId));
                setCurrentId(undefined);
                lastSavedRef.current = '';
                if (hadOnlyOne) {
                  setText('');
                  setSaveStatus('idle');
                  setParseErrors([]);
                  setValidationErrors([]);
                }
                await refreshList();
              } catch (err: any) {
                alert(`Delete failed: ${err?.message ?? String(err)}`);
              }
            }}
          />
        </div>
        {(() => {
          const canLocalPreview = !currentId && forms.length === 0 && text.trim().length > 0 && parseErrors.length === 0 && validationErrors.length === 0;
          if (currentId || canLocalPreview) {
            return <StructuredForm spec={spec} onChange={setVal} />;
          }
          if (forms.length === 0) {
            return <div className="py-12 text-center text-sm text-muted-foreground">No forms yet. Use the toolbar or the default template button to get started.</div>;
          }
          return <div className="py-12 text-center text-sm text-muted-foreground">No form selected. Choose one from the list.</div>;
        })()}
      </section>
    </div>
  );
}

