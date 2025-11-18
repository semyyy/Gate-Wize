import { formIdFromName } from '@/lib/slug';

export type FormListItem = { id: string; name: string };

export function nextAvailableNameAndId(baseName: string, forms: FormListItem[]): { name: string; id: string } {
  const names = new Set((forms ?? []).map((f) => (f.name || '').trim()).filter(Boolean));
  const ids = new Set((forms ?? []).map((f) => f.id));
  const base = (baseName || '').trim() || 'Untitled';
  let i = 0;
  while (true) {
    const name = i === 0 ? base : `${base} ${i + 1}`;
    const id = formIdFromName(name);
    if (!names.has(name) && !ids.has(id)) return { name, id };
    i += 1;
  }
}
