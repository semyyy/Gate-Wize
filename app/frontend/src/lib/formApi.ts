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

export async function formExists(id: string): Promise<boolean> {
  const r = await fetch(`${API_BASE}/api/form/exists/${encodeURIComponent(id)}`);
  if (!r.ok) return false;
  const j = await r.json();
  return Boolean(j?.data);
}

export async function saveForm(spec: FormSpec): Promise<void> {
  const toSend: any = { ...spec };
  const r = await fetch(`${API_BASE}/api/form/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toSend),
  });
  if (!r.ok) throw new Error(`save failed: ${r.status}`);
}

export async function deleteForm(id: string): Promise<void> {
  const r = await fetch(`${API_BASE}/api/form/delete/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(`delete failed: ${r.status}`);
}

export async function renameForm(id: string, name: string): Promise<void> {
  const r = await fetch(`${API_BASE}/api/form/rename/${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!r.ok) throw new Error(`rename failed: ${r.status}`);
}

export type FieldRating = { rate: 'invalid' | 'partial' | 'valid'; comment: string };
export type RatingsResponse = { ratings: Record<string, FieldRating> };

export async function rateForm(spec: unknown, value: Record<string, unknown>): Promise<RatingsResponse> {
  const r = await fetch(`${API_BASE}/api/llm/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spec, value }),
  });
  if (!r.ok) throw new Error(`rate failed: ${r.status}`);
  const j = await r.json();
  return (j?.data as RatingsResponse) ?? { ratings: {} };
}

export type FieldRatingResult = { comment: string; rate?: 'invalid' | 'partial' | 'valid' };

export async function rateField(question: string, value: string, examples?: string[]): Promise<FieldRatingResult | null> {
  try {
    const r = await fetch(`${API_BASE}/api/llm/rate-field`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, value, examples }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return (j?.data as FieldRatingResult) ?? null;
  } catch (e) {
    console.error('Field rating error:', e);
    return null;
  }
}
