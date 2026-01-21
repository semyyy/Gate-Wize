import type { FormSpec } from '@/components/structured-form/types';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000';

export type FormListItem = { id: string; name: string; status?: string };

export async function listForms(includeUnpublished = false): Promise<FormListItem[]> {
  const url = includeUnpublished
    ? `${API_BASE}/api/form/list?includeUnpublished=true`
    : `${API_BASE}/api/form/list`;
  const r = await fetch(url, { cache: 'no-store' });
  const j = await r.json();
  return j?.ok ? (j.data ?? []) : [];
}

export async function loadForm(id: string): Promise<FormSpec | null> {
  const r = await fetch(`${API_BASE}/api/form/load/${encodeURIComponent(id)}`, { cache: 'no-store' });
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

export type FieldRating = { rate: 'invalid' | 'partial' | 'valid'; comment: string; suggestionResponse?: string };
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

export type FieldRatingResult = { comment: string; rate?: 'invalid' | 'partial' | 'valid'; suggestionResponse?: string };
export type FieldRatingError = { error: true; message: string };
export type FieldRatingResponse = FieldRatingResult | FieldRatingError | null;

export function isFieldRatingError(response: FieldRatingResponse): response is FieldRatingError {
  return response !== null && 'error' in response && response.error === true;
}

export async function rateSimpleField(
  question: string,
  value: string,
  examples?: string[],
  promptConfig?: { task?: string; role?: string; guidelines?: string }
): Promise<FieldRatingResponse> {
  try {
    const r = await fetch(`${API_BASE}/api/llm/rate-simple-field`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, value, examples, promptConfig }),
    });
    if (!r.ok) {
      const errorText = await r.text().catch(() => '');
      console.error('Simple field rating HTTP error:', r.status, errorText);
      return { error: true, message: `Validation service unavailable , try again later.` };
    }
    const j = await r.json();
    return (j?.data as FieldRatingResult) ?? null;
  } catch (e) {
    console.error('Simple field rating error:', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { error: true, message: `Validation failed: ${message}` };
  }
}

export async function rateDetailedRow(
  question: string,
  attributeName: string,
  attributeValue: string,
  rowData: Record<string, unknown>,
  examples?: string[],
  promptConfig?: { task?: string; role?: string; guidelines?: string }
): Promise<FieldRatingResponse> {
  try {
    const r = await fetch(`${API_BASE}/api/llm/rate-detailed-row`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, attributeName, attributeValue, rowData, examples, promptConfig }),
    });
    if (!r.ok) {
      const errorText = await r.text().catch(() => '');
      console.error('Detailed row rating HTTP error:', r.status, errorText);
      return { error: true, message: `Validation service unavailable , try again later.` };
    }
    const j = await r.json();
    return (j?.data as FieldRatingResult) ?? null;
  } catch (e) {
    console.error('Detailed row rating error:', e);
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { error: true, message: `Validation failed: ${message}` };
  }
}

export async function exportFormToPdf(
  spec: FormSpec,
  value: Record<string, unknown>
): Promise<void> {
  try {
    const r = await fetch(`${API_BASE}/api/form/export-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spec, value }),
    });

    if (!r.ok) {
      const errorData = await r.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Export failed: ${r.status}`);
    }

    // Get the PDF blob
    const blob = await r.blob();

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spec.name.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 5000);


  } catch (e) {
    console.error('PDF export error:', e);
    throw e;
  }
}
