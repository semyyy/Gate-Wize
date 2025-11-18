export function formIdFromName(name?: string) {
  if (!name || typeof name !== 'string') return 'default';
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'default'
  );
}
