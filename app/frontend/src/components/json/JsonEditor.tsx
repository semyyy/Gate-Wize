"use client";

import Editor, { type OnMount } from '@monaco-editor/react';
import { useCallback, useEffect, useRef } from 'react';

export type JsonEditorError = { offset: number; length: number; message: string };

export function JsonEditor({ value, onChange, errors, className, scrollToOffset }: { value: string; onChange: (next: string) => void; errors?: JsonEditorError[]; className?: string; scrollToOffset?: number | null }) {
  const handleChange = useCallback((v?: string) => onChange(v ?? ''), [onChange]);

  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco as unknown as typeof import('monaco-editor');
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: true,
      trailingCommas: 'ignore', // Note: jsonc-parser supports trailing commas, but standard JSON doesn't. Admin editor is for JSON.
    });
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || scrollToOffset === undefined || scrollToOffset === null) return;

    const model = editor.getModel();
    if (!model) return;

    const position = model.getPositionAt(scrollToOffset);
    editor.revealPositionInCenter(position);
    editor.setPosition(position);
    editor.focus();

  }, [scrollToOffset]);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) return;

    const markers = (errors ?? []).map((e) => {
      const start = model.getPositionAt(e.offset);
      const end = model.getPositionAt(e.offset + Math.max(1, e.length));
      return {
        severity: monaco.MarkerSeverity.Error,
        message: e.message,
        startLineNumber: start.lineNumber,
        startColumn: start.column,
        endLineNumber: end.lineNumber,
        endColumn: end.column,
      } satisfies import('monaco-editor').editor.IMarkerData;
    });
    monaco.editor.setModelMarkers(model, 'json', markers);
  }, [errors, value]);

  return (
    <div className={(className ? className : 'h-[600px]') + " border rounded-md overflow-hidden"}>
      <Editor
        height="100%"
        defaultLanguage="json"
        theme="vs"
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          wordWrap: 'off',
          formatOnPaste: true,
          formatOnType: true,
          automaticLayout: true,
          tabSize: 2,
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}
