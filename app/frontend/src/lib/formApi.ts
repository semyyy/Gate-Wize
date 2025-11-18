import type { FormSpec } from '@/components/structured-form/types';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

export type FormListItem = { id: string; name: string };

export async function listForms(): Promise<FormListItem[]> {
  const r = await fetch(`${API_BASE}/api/form/list`);
  const j = await r.json();
  return j?.ok ? (j.data ?? []) : [];
}

export async function loadForm(id: string): Promise<FormSpec | null> {
  const r = await fetch(`${API_BASE}/api/form/load/${encodeURIComponent(id)}`);
  if (!r.ok) return null;
  const j = await r.json();
  const data = j && typeof j === 'object' && 'data' in j ? j.data : j;
  return (data as FormSpec) ?? null;
}

export async function saveForm(id: string, spec: FormSpec): Promise<void> {
  const r = await fetch(`${API_BASE}/api/form/save/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spec),
  });
  if (!r.ok) throw new Error(`save failed: ${r.status}`);
}

export async function deleteForm(id: string): Promise<void> {
  const r = await fetch(`${API_BASE}/api/form/delete/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`delete failed: ${r.status}`);
}
