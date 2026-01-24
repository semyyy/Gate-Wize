"use client";

import { useEffect, useRef, useState } from 'react';
import { StructuredForm } from '@/components/structured-form/StructuredForm';
import { JsonEditor, type JsonEditorError } from '@/components/json/JsonEditor';
import { parse, parseTree, getLocation, findNodeAtLocation, printParseErrorCode, type ParseError } from 'jsonc-parser';
import { saveForm, formExists, loadForm, type FieldRatingResult } from '@/lib/formApi';
import { useFormList } from '@/hooks/useFormList';
import { formIdFromName } from '@/lib/slug';
import type { FormSpec } from '@/components/structured-form/types';
import { validateSpec } from '@/lib/validateSpec';
import { Dialog, DialogContent, DialogHeader, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StatusIndicator } from '@/components/ui/status-indicator';

const default_form: FormSpec = {
  "name": "Demo Form - All Features",
  "status": "draft",
  "description": "Compact demo showcasing all question types and custom AI prompts",
  "sections": [
    {
      "title": "Project Overview",
      "description": "Basic project information",
      "questions": [
        {
          "type": "simple",
          "question": "What is your project name?",
          "aiValidation": false,
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
          "multiple": true,
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
              "width": 0.25,
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
              "width": 0.4,
              "examples": [
                "User Authentication",
                "Real-time Notifications",
                "Data Export"
              ]
            },
            {
              "name": "priority",
              "description": "Priority",
              "width": 0.15,
              "options": [
                "Must have",
                "Should have",
                "Nice to have"
              ]
            },
            {
              "name": "description",
              "description": "Details",
              "width": 0.45,
              "inputType": "textarea",
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
  const { forms, setForms, loading: formsLoading, removeForm, removeForms, refresh } = useFormList(true); // Include unpublished forms
  const [selectedFormId, setSelectedFormId] = useState<string | undefined>(undefined);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [manageSelection, setManageSelection] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'batch' | 'current'; id?: string } | null>(null);
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


  const [activePath, setActivePath] = useState<string | null>(null);
  const [editorScrollOffset, setEditorScrollOffset] = useState<number | null>(null);

  // Sync Preview -> Editor
  const handleSyncFromPreview = (path: string) => {
    const segments: (string | number)[] = [];

    // Simple regex parser for path string: sections[0].questions[1] -> ['sections', 0, 'questions', 1]
    const regex = /(\w+)|\[(\d+)\]/g;
    let match;
    while ((match = regex.exec(path)) !== null) {
      if (match[1]) {
        segments.push(match[1]);
      } else if (match[2]) {
        segments.push(parseInt(match[2], 10));
      }
    }

    const errors: ParseError[] = [];
    const root = parseTree(text, errors);
    if (root) {
      const node = findNodeAtLocation(root, segments);
      if (node && node.offset !== undefined) {
        setEditorScrollOffset(node.offset);
      }
    }
  };

  const handleSyncFromEditor = (offset: number) => {
    // Offset -> Path
    const location = getLocation(text, offset);
    if (location.path) {
      // Convert array path to string path
      // ['sections', 0, 'questions', 1] -> sections[0].questions[1]
      let pathStr = '';
      location.path.forEach((seg) => {
        if (typeof seg === 'number') {
          pathStr += `[${seg}]`;
        } else {
          if (pathStr) pathStr += '.';
          pathStr += seg;
        }
      });
      setActivePath(pathStr);
    }
  };


  // utilities moved to lib/formUtils

  // Load selected form into editor
  useEffect(() => {
    if (!selectedFormId) return;

    (async () => {
      try {
        const loaded = await loadForm(selectedFormId);
        if (loaded) {
          setText(JSON.stringify(loaded, null, 2));
          setFirstSavedId(selectedFormId);
          lastSavedRef.current = JSON.stringify(loaded);
          setSaveStatus('synced');
        }
      } catch (error) {
        console.error('Failed to load form:', error);
      }
    })();
  }, [selectedFormId]);

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


  // Handle confirmed deletion
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'single' && deleteTarget.id) {
        await removeForm(deleteTarget.id);
        // If we just deleted the current form, reset
        if (selectedFormId === deleteTarget.id) {
          setSelectedFormId(undefined);
          setText('');
          setFirstSavedId(null);
          setSaveStatus('idle');
        }
      } else if (deleteTarget.type === 'batch') {
        const ids = Array.from(manageSelection);
        await removeForms(ids);
        setManageSelection(new Set());
        const currentFormId = selectedFormId || (firstSavedId ? formIdFromName(firstSavedId) : null);
        if (currentFormId && ids.includes(currentFormId)) {
          setSelectedFormId(undefined);
          setText('');
          setFirstSavedId(null);
          setSaveStatus('idle');
        }
      } else if (deleteTarget.type === 'current' && firstSavedId) {
        const formIdToDelete = selectedFormId || formIdFromName(firstSavedId);
        await removeForm(formIdToDelete);
        setSelectedFormId(undefined);
        setText('');
        setFirstSavedId(null);
        setSaveStatus('idle');
        refresh();
      }
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  // Sync form in the forms list after save (add if new, update if exists)
  const syncFormStatus = (formName: string, status: 'draft' | 'published') => {
    const formId = formIdFromName(formName);
    setForms(prevForms => {
      const existingIndex = prevForms.findIndex(f => f.id === formId);
      if (existingIndex >= 0) {
        // Update existing form
        return prevForms.map(f =>
          f.id === formId ? { ...f, status } : f
        );
      } else {
        // Add new form to the list
        return [...prevForms, { id: formId, name: formName, status }];
      }
    });
  };

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

      // Sync the status in the forms list
      syncFormStatus(spec.name, spec.status);
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

        // Sync the status in the forms list
        syncFormStatus(spec.name, spec.status);
      } catch (err: any) {
        saveErrorRef.current = err?.message ?? String(err);
        setSaveStatus('error');
      }
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [spec, parseErrors, validationErrors]);

  // We need to import FieldRating from where it's defined or redefine it compatible
  type FieldRating = { rate: 'invalid' | 'partial' | 'valid'; comment: string; suggestionResponse?: string };
  const [previewValue, setPreviewValue] = useState<Record<string, unknown>>({});
  const [previewRatings, setPreviewRatings] = useState<Record<string, FieldRating>>({});

  // Reset preview state when spec changes (e.g. loaded new form or edited json)
  useEffect(() => {
    setPreviewValue({});
    setPreviewRatings({});
  }, [spec]);

  // Helper to determine if a value is effectively empty
  const isEmpty = (v: unknown) => {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return false;
  };

  // Helper to look up value from flat form state using rating path
  const resolveValue = (formValue: Record<string, unknown>, path: string): unknown => {
    // 1. Direct match (Simple questions)
    if (path in formValue) return formValue[path];

    // 2. Nested match (Detailed questions: sX.qY.rowIndex.attrName)
    // Matches standard StructuredForm path generation: s0.q0.1.attributeName
    const match = path.match(/^(s\d+\.q\d+)\.(\d+)\.(.+)$/);
    if (match) {
      const [, baseKey, methodStr, attr] = match;
      const array = formValue[baseKey];
      if (Array.isArray(array)) {
        const index = parseInt(methodStr, 10);
        return array[index]?.[attr];
      }
    }
    // 3. Simple Question Multiple match (sX.qY[id])
    // We cannot resolve the value without the ID map, which is internal to the component.
    // However, we should NOT delete the rating here. The component manages its own lifecycle.
    if (path.includes('[') && path.includes(']')) {
      return "SKIP_CHECK";
    }

    return undefined;
  };

  const handlePreviewRatingChange = (path: string, rating: FieldRatingResult | null) => {
    if (!rating) {
      setPreviewRatings(prev => {
        const next = { ...prev };
        delete next[path];
        return next;
      });
      return;
    }
    const normalized: FieldRating = {
      comment: rating.comment,
      rate: rating.rate || 'partial',
      ...(rating.suggestionResponse && { suggestionResponse: rating.suggestionResponse })
    };
    setPreviewRatings(prev => ({ ...prev, [path]: normalized }));
  };

  const handlePreviewValueChange = (newValue: Record<string, unknown>) => {
    // Check for cleared values and remove corresponding ratings
    let nextRatings = { ...previewRatings };
    let ratingsChanged = false;

    for (const path of Object.keys(nextRatings)) {
      const val = resolveValue(newValue, path);
      if (isEmpty(val)) {
        delete nextRatings[path];
        ratingsChanged = true;
      }
    }

    if (ratingsChanged) {
      setPreviewRatings(nextRatings);
    }
    setPreviewValue(newValue);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 h-screen">

      <section className="rounded-lg border p-4 flex flex-col min-h-0">
        {/* Title Row */}
        <div className="mb-3">
          <h2 className="text-xl font-semibold">Spec JSON</h2>
        </div>

        {/* Toolbar Row */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            className="text-sm border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded px-3 py-1.5 transition-colors flex items-center gap-1.5"
            title="Create a new form from scratch"
            onClick={() => {
              setText('');
              setSaveStatus('idle');
              setFirstSavedId(null);
              setSelectedFormId(undefined);
              lastSavedRef.current = '';
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Form
          </button>

          {forms.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="border border-gray-300 rounded px-3 py-1.5 min-w-[200px] flex items-center justify-between bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  disabled={formsLoading}
                >
                  <span className="truncate text-gray-800">
                    {selectedFormId ? forms.find(f => f.id === selectedFormId)?.name || 'Load form...' : 'Load form...'}
                  </span>
                  <svg className="ml-2 h-4 w-4 opacity-60 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-[200px]">
                {forms.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    onClick={() => {
                      if (f.id === selectedFormId) return;
                      setSelectedFormId(f.id);
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1 truncate">{f.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.status === 'draft'
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                      >
                        {f.status === 'draft' ? 'Draft' : 'Published'}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <label className="text-sm border border-gray-300 bg-white hover:bg-gray-50 rounded px-3 py-1.5 cursor-pointer transition-colors" title="Upload JSON file">
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
                setSelectedFormId(undefined);
                lastSavedRef.current = '';
                // Allow re-uploading the same file by clearing input value
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
          </label>

          <button
            className="text-sm border border-gray-300 bg-white hover:bg-gray-50 rounded px-3 py-1.5 transition-colors"
            title="Load the default template into the editor"
            onClick={async () => {
              const base = { ...default_form } as FormSpec;
              setText(JSON.stringify(base, null, 2));
              setSaveStatus('unsaved');
              setFirstSavedId(null);
              setSelectedFormId(undefined);
              lastSavedRef.current = '';
            }}
          >
            Use Template
          </button>
        </div>
        <div className="flex gap-2">
          <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
            <DialogTrigger asChild>
              <button className="text-xs border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 rounded px-2 py-1 transition-colors">
                Manage Forms
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader title="Manage Forms" description="Select forms to delete. This action cannot be undone." />
              <div className="mt-2 text-sm max-h-[60vh] overflow-y-auto border rounded divide-y">
                {forms.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No forms found.</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0 bg-opacity-100">
                      <tr>
                        <th className="p-2 w-8">
                          <input
                            type="checkbox"
                            checked={forms.length > 0 && manageSelection.size === forms.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setManageSelection(new Set(forms.map(f => f.id)));
                              } else {
                                setManageSelection(new Set());
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="p-2 font-medium text-gray-600">Name</th>
                        <th className="p-2 font-medium text-gray-600 w-20">Status</th>
                        <th className="p-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {forms.map(f => (
                        <tr key={f.id} className="hover:bg-gray-50/50 group">
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={manageSelection.has(f.id)}
                              onChange={(e) => {
                                const next = new Set(manageSelection);
                                if (e.target.checked) next.add(f.id);
                                else next.delete(f.id);
                                setManageSelection(next);
                              }}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="p-2 font-medium text-gray-800 truncate max-w-[180px]" title={f.name}>
                            {f.name}
                          </td>
                          <td className="p-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${f.status === 'draft'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                                }`}
                            >
                              {f.status === 'draft' ? 'Draft' : 'Pub'}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            <button
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Delete this form"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({ type: 'single', id: f.id });
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {manageSelection.size} selected
                </span>
                <div className="flex gap-2">
                  <DialogClose asChild>
                    <button className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50">Close</button>
                  </DialogClose>
                  {manageSelection.size > 0 && (
                    <button
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-1.5"
                      onClick={() => {
                        setDeleteTarget({ type: 'batch' });
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      Delete Selected
                    </button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
          <JsonEditor
            value={text}
            onChange={setText}
            errors={parseErrors}
            className="h-full"
            scrollToOffset={editorScrollOffset}
          />
        </div>
      </section>

      <section className="rounded-lg border p-4 flex flex-col min-h-0">
        {/* Title Row */}
        <div className="mb-3">
          <h2 className="text-xl font-semibold">Preview</h2>
        </div>

        {/* Toolbar Row */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 pb-3 border-b">
          <div className="flex items-center gap-2">
            {parseErrors.length > 0 ? (
              <span className="text-sm text-red-600">Parse errors: {parseErrors.length}. Showing last valid.</span>
            ) : validationErrors.length > 0 ? (
              <span className="text-sm text-amber-600">Spec issues: {validationErrors.length}. Showing last valid.</span>
            ) : (
              <StatusIndicator status={saveStatus} errorMessage={saveErrorRef.current} />
            )}
          </div>

          <div className="flex items-center gap-2">
            {firstSavedId && (
              <button
                className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-red-50"
                title="Delete current form"
                onClick={() => {
                  setDeleteTarget({ type: 'current' });
                  setDeleteConfirmOpen(true);
                }}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <Dialog>
              <DialogTrigger asChild>
                <button
                  className="border border-gray-300 bg-white hover:bg-gray-50 rounded px-3 py-1.5 disabled:opacity-50 transition-colors flex items-center gap-2"
                  disabled={text.trim().length === 0 || parseErrors.length > 0 || validationErrors.length > 0}
                  title="Save form"
                  aria-label="Save"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h8l4 4v12a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h8V3" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 21v-6h6v6" />
                  </svg>
                  <span className="text-sm">Save</span>
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
        <div className="px-4 py-4 flex-1 min-h-0 overflow-auto">
          {text.trim().length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Start by uploading JSON or using the default template.</div>
          ) : (
            <StructuredForm
              spec={spec}
              value={previewValue}
              onChange={handlePreviewValueChange}
              ratings={previewRatings}
              onRatingChange={handlePreviewRatingChange}
              onSyncRequest={handleSyncFromPreview}
            />
          )}
        </div>
      </section>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader
            title="Confirm Deletion"
            description={
              deleteTarget?.type === 'single'
                ? `Are you sure you want to delete "${forms.find(f => f.id === deleteTarget.id)?.name}"? This action cannot be undone.`
                : deleteTarget?.type === 'batch'
                  ? `Are you sure you want to delete ${manageSelection.size} form${manageSelection.size > 1 ? 's' : ''}? This action cannot be undone.`
                  : 'Are you sure you want to delete this form? This action cannot be undone.'
            }
          />
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <button className="border rounded px-4 py-2 text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </DialogClose>
            <button
              className="bg-red-600 text-white rounded px-4 py-2 text-sm hover:bg-red-700 transition-colors"
              onClick={handleConfirmDelete}
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}

