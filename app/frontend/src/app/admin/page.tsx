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
  "name": "Demo Form - All Features",
  "description": "Compact demo showcasing all question types and custom AI prompts",
  "sections": [
    {
      "title": "Project Overview",
      "description": "Basic project information",
      "questions": [
        {
          "type": "simple",
          "question": "What is your project name?",
          "description": "Provide a clear, professional name",
          "examples": [
            "Customer Portal Redesign",
            "Inventory Management System",
            "Mobile App Modernization"
          ],
          "promptConfig": {
            "task": "Evaluate if the project name is professional, clear, and memorable.",
            "role": "You are a project naming expert evaluating business project titles.",
            "guidelines": "Check for: clarity (easy to understand), professionalism (appropriate for business), specificity (not too generic), and memorability. Avoid vague names like 'Project X' or overly technical jargon."
          }
        },
        {
          "type": "simple",
          "question": "Describe the main business problem this project solves",
          "examples": [
            "High customer churn due to poor mobile experience",
            "Manual inventory tracking causing stock discrepancies",
            "Slow checkout process reducing conversion rates"
          ]
        }
      ]
    },
    {
      "title": "Solution Approach",
      "description": "Define how you'll implement the solution",
      "questions": [
        {
          "type": "option",
          "question": "What type of solution are you considering?",
          "options": [
            "Build custom solution",
            "Buy/license existing software",
            "Integrate existing systems",
            "Hybrid approach"
          ],
          "justification": true
        },
        {
          "type": "option",
          "question": "Which platforms will you support?",
          "description": "Select all that apply",
          "options": [
            "Web",
            "iOS",
            "Android",
            "Desktop"
          ],
          "multiple": true
        }
      ]
    },
    {
      "title": "Team & Stakeholders",
      "description": "Identify key people involved",
      "questions": [
        {
          "type": "detailed",
          "question": "List the key stakeholders and their roles",
          "attributes": [
            {
              "name": "name",
              "description": "Stakeholder Name",
              "examples": [
                "Sarah Johnson",
                "Mike Chen"
              ]
            },
            {
              "name": "role",
              "description": "Role/Responsibility",
              "examples": [
                "Product Owner - defines requirements",
                "Tech Lead - oversees architecture",
                "Business Analyst - gathers user needs"
              ],
              "promptConfig": {
                "task": "Verify the role description is specific and actionable.",
                "guidelines": "Ensure the role clearly explains what the person does in the project. Avoid vague descriptions like 'helps with project' or 'involved in development'. Look for specific responsibilities."
              }
            }
          ]
        }
      ]
    },
    {
      "title": "Requirements",
      "description": "Core features and constraints",
      "questions": [
        {
          "type": "detailed",
          "question": "What are the main features or capabilities needed?",
          "attributes": [
            {
              "name": "feature",
              "description": "Feature Name",
              "examples": [
                "User Authentication",
                "Real-time Notifications",
                "Data Export"
              ]
            },
            {
              "name": "priority",
              "description": "Priority",
              "options": [
                "Must have",
                "Should have",
                "Nice to have"
              ]
            },
            {
              "name": "description",
              "description": "Details",
              "examples": [
                "Support login via email and social accounts",
                "Push notifications for order updates",
                "Export reports to PDF and Excel"
              ]
            }
          ]
        }
      ]
    },
    {
      "title": "Architecture",
      "description": "Technical overview",
      "questions": [
        {
          "type": "image",
          "question": "System Architecture Diagram",
          "description": "Upload or provide URL to your architecture diagram"
        },
        {
          "type": "simple",
          "question": "What are the main technical constraints or dependencies?",
          "examples": [
            "Must integrate with existing SAP system",
            "Limited to AWS cloud infrastructure",
            "Need to support 10,000 concurrent users"
          ]
        }
      ]
    }
  ]
}




export default function AdminPage() {
  const [text, setText] = useState<string>('');
  const [parseErrors, setParseErrors] = useState<JsonEditorError[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [spec, setSpec] = useState<FormSpec>(default_form); // last valid spec for preview
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | 'unsaved' | 'synced'>('idle');
  const saveErrorRef = useRef<string | null>(null);
  const suspendSaveRef = useRef<boolean>(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  const [firstSavedId, setFirstSavedId] = useState<string | null>(null); // once set, autosave to this id
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    try {
      setSaveStatus('saving');

      // include formName inside the saved spec (name key)
      const toSave = { ...(spec as any) } as any;

      await saveForm(toSave as FormSpec);
      setFirstSavedId(spec.name);
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
        const toSave = { ...spec } as any;
        await saveForm(toSave as FormSpec);
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
  }, [spec, parseErrors, validationErrors]);

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
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    setText(text);
                    // Reset autosave targets for a fresh spec upload
                    setSaveStatus('unsaved');
                    setFirstSavedId(null);
                    lastSavedRef.current = '';
                    // Allow re-uploading the same file by clearing input value
                    if (fileInputRef.current) fileInputRef.current.value = '';
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
          {/* Error Banner - Parse Errors */}
          {parseErrors.length > 0 && (
            <div className="mb-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
              <div className="flex items-start">
                <svg className="h-6 w-6 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-red-800 mb-2">JSON Syntax Errors ({parseErrors.length})</h3>
                  <p className="text-sm text-red-700 mb-3">Your JSON has syntax errors. Please fix them before saving:</p>
                  <ul className="space-y-1">
                    {parseErrors.map((e, i) => (
                      <li key={i} className="text-sm text-red-700 flex items-start">
                        <span className="mr-2">•</span>
                        <span>{e.message}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 text-xs text-red-600 bg-red-100 p-2 rounded">
                    💡 <strong>Tip:</strong> Check for missing commas, brackets, or quotes. Use a JSON validator if needed.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner - Validation Errors */}
          {parseErrors.length === 0 && validationErrors.length > 0 && (
            <div className="mb-3 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg">
              <div className="flex items-start">
                <svg className="h-6 w-6 text-amber-500 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-amber-800 mb-2">Form Specification Errors ({validationErrors.length})</h3>
                  <p className="text-sm text-amber-700 mb-3">Your JSON is valid, but the form specification has issues:</p>
                  <ul className="space-y-1">
                    {validationErrors.map((e, i) => (
                      <li key={i} className="text-sm text-amber-700 flex items-start">
                        <span className="mr-2">•</span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 text-xs text-amber-600 bg-amber-100 p-2 rounded">
                    💡 <strong>Tip:</strong> Make sure all required fields are present and question types are valid ('simple', 'option', 'detailed', or 'image').
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-2 flex-1 min-h-0">
            <JsonEditor value={text} onChange={setText} errors={parseErrors} className="h-full" />
          </div>
        </section>
      }
      <section className="rounded-lg border p-0 flex flex-col min-h-0">
        <div className="sticky top-0 z-10 border-b bg-background px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Preview</h2>
            </div>
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
                          ? `Saving updates to "${firstSavedId}".`
                          : `This will create or overwrite "${id}" if it exists. Continue?`;
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
            <StructuredForm spec={spec} />
          )}
        </div>
      </section>
    </div>
  );
}

