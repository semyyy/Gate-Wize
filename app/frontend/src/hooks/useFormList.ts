import { useCallback, useEffect, useState } from 'react';
import { listForms, deleteForm } from '@/lib/formApi';

export function useFormList(includeUnpublished = false) {
  const [forms, setForms] = useState<{ id: string; name: string; status?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listForms(includeUnpublished);
      setForms(data);
      setJustRefreshed(true);
      setTimeout(() => setJustRefreshed(false), 1200);
    } finally {
      setLoading(false);
    }
  }, [includeUnpublished]);

  const removeForm = useCallback(async (id: string) => {
    await deleteForm(id);
    await refresh();
  }, [refresh]);

  const removeForms = useCallback(async (ids: string[]) => {
    await Promise.all(ids.map(id => deleteForm(id)));
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Automatic refresh for user side (every 30 seconds)
  useEffect(() => {
    if (includeUnpublished) return; // Only auto-refresh on user side, not admin

    const interval = setInterval(() => {
      refresh();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [includeUnpublished, refresh]);

  return { forms, setForms, loading, justRefreshed, refresh, removeForm, removeForms };
}
