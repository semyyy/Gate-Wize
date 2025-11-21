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
import InlineRename from '@/components/ui/InlineRename';

const default_form: FormSpec ={
  "name": "Default Project Form",
  "description": "Default form template mirroring the project assessment layout",
  "sections": [
    {
      "title": "Drivers & Stakeholders",
      "description": "understand the context and reasons behind the project",
      "questions": [
        {
          "type": "detailed",
          "question": "Which problems or opportunities motivate this project?",
          "description": "Describe current issues or the opportunities to capture.",
          "attributes": [
            {
              "name": "type",
              "description": "Type",
              "options": [
                "probleme",
                "opportunite"
              ]
            },
            {
              "name": "description",
              "description": "Description / impact",
              "examples": [
                "Increase in ROI",
                "High customer churn in mobile app",
                "Opportunity to automate manual accounting process"
              ]
            }
          ],
          
        },
        {
          "type": "detailed",
          "question": "Which major stakeholders are involved?",
          "description": "List the key roles and how they are involved.",
          "attributes": [
            {
              "name": "stakeholder",
              "description": "Stakeholder",
              "examples": [
                "Project Manager",
                "Business Owner",
                "IT Operations Manager"
              ]
            },
            {
              "name": "role",
              "description": "Role / Detail",
              "examples": [
                "Oversees the whole project, assigns tasks, contacts client",
                "Validates functional scope, ensures business alignment",
                "Manages production deployment and ensures platform stability"
              ]
            }
          ],
         
        }
      ]
    },
    {
      "title": "Objectives and expected results (Goals & Outcomes)",
      "description": "define the purpose and expected impact",
      "questions": [
        {
          "type": "detailed",
          "question": "Which business objectives should this project deliver?",
          "description": "Formulate measurable objectives whenever possible.",
          "attributes": [
            {
              "name": "objective",
              "description": "Business objective",
              "examples": [
                "Reduce customer support workload",
                "Increase online conversion rate",
                "Improve product availability visibility"
              ]
            },
            {
              "name": "indicator",
              "description": "Indicator / target",
              "examples": [
                "Reduce support tickets by 20% in 6 months",
                "Increase conversion from 1.8% to 3%",
                "95% accuracy in stock data across all channels"
              ]
            }
          ],
          
        },
        {
          "type": "detailed",
          "question": "What benefits or concrete changes do you expect?",
          "description": "Focus on results that are visible to users and the business.",
          "attributes": [
            {
              "name": "benefit",
              "description": "Benefit / change",
              "examples": [
                "Faster checkout process",
                "Improved data reliability",
                "Simplified back-office operations"
              ]
            },
            {
              "name": "detail",
              "description": "Detail",
              "examples": [
                "Reduce number of steps required to validate a purchase",
                "Automated synchronization between systems",
                "Less manual intervention required by support teams"
              ]
            }
          ],
        
        }
      ]
    },
    {
      "title": "Strategic alignment",
      "description": "connect the project to the company vision",
      "questions": [
        {
          "type": "simple",
          "question": "How does this project contribute to the company strategy?",
          "description": "Link it to transformation, customer experience, e-commerce, etc.",
          "examples": [
            "Supports digital transformation roadmap by migrating legacy processes",
            "Improves customer experience through faster omnichannel journeys",
            "Strengthens e-commerce capabilities by modernizing checkout pipeline"
          ]
        }
      ]
    },
    {
      "title": "Functional & non-functional requirements (Requirements & Constraints)",
      "description": "describe what the solution must do and under which conditions",
      "questions": [
        {
          "type": "detailed",
          "question": "Which main features are expected?",
          "attributes": [
            {
              "name": "feature",
              "description": "Feature",
              "examples":[
                "View Loyalty Points"
              ]
            },
            {
              "name": "description",
              "description": "Description / Detail",
              "examples":[
                "Display balance, points history, and usage rules."

              ]
            }
          ],
          
        },
        {
          "type": "detailed",
          "question": "Do you have non-functional requirements to consider?",
          "attributes": [
            {
              "name": "requirement",
              "description": "Non-functional requirement",
              "examples":[
                "Response Time < 2s",
                "24/7 availability"
              ]
            },
            {
              "name": "detail",
              "description": "Detail",
              "examples": [
                "For critical ordering journeys",
                "Availability rate, maintenance windows"
              ]
            }
          ]
        },
        {
          "type": "detailed",
          "question": "Are there constraints to consider?",
          "attributes": [
            {
              "name": "constraint",
              "description": "Constraint",
              "examples":[
                "Legacy System dependency"
              ]
            },
            {
              "name": "detail",
              "description": "Detail",
              "examples": [
                "Must connect to an existing ERP that cannot be modified"
              ]
            }
          ],
          
        }
      ]
    },
    {
      "title": "Solution implementation approach",
      "description": "identify the nature of the project (make, buy, etc.)",
      "questions": [
        {
          "type": "option",
          "question": "What type of solution are you considering?",
          "options": [
            "make",
            "buy",
            "integration",
            "rollout",
            "autre"
          ],
          "justification": true,
        }
      ]
    },
    {
      "title": "Users and roles",
      "description": "identify the system actors",
      "questions": [
        {
          "type": "detailed",
          "question": "Who will use the solution and what will each user do?",
          "attributes": [
            {
              "name": "user_type",
              "description": "User type",
              "examples":[
                "Store manager"
              ]
            },
            {
              "name": "role",
              "description": "Role in the solution",
              "examples":[
                "Validates local orders and monitors performance"
              ]
            }
          ],
          
        }
      ]
    },
    {
      "title": "Target architecture and integrations",
      "description": "position the solution within the IS",
      "questions": [
        {
          "type": "simple",
          "question": "Does this solution replace an existing one?",
          "description": "Indicate which tool or system is replaced, if any.",
          "examples": [
            "Replaces legacy CRM tool",
            "Modernizes outdated reporting system",
            "No replacement — new capability"
          ]
        },
        {
          "type": "detailed",
          "question": "Does the solution need to integrate with other applications?",
          "attributes": [
            {
              "name": "application",
              "description": "Application / system",
              "examples":[
                "Payment Gateaway"
              ]
            },
            {
              "name": "usage",
              "description": "Integration type / usage",
              "examples":[
                "Process online payments and refunds"
              ]
            }
          ],
          
        }
      ]
    },
    {
      "title": "Lifecycle, governance, and scalability",
      "description": "plan for maintenance and sustainability",
      "questions": [
        {
          "type": "simple",
          "question": "Who will handle maintenance and scalability for the solution?",
          "description": "Specify the teams, partners, or vendors.",
          "examples": [
            "IT Operations team for platform maintenance",
            "External SaaS provider handles scalability and updates",
            "Internal development squad ensures feature lifecycle"
          ]
        },
        {
          "type": "detailed",
          "question": "Do you have portability or scalability requirements?",
          "attributes": [
            {
              "name": "requirement",
              "description": "Requirement",
              "examples":[
                "Horizontal scalability"
              ]
            },
            {
              "name": "detail",
              "description": "Detail",
              "examples":[
                "Support more traffic peaks during seasonal sales"
              ]
            }
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
            <div className="flex flex-col gap-4">
              <StructuredForm spec={spec} />
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

