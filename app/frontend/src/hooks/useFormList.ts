import { useCallback, useEffect, useState } from 'react';
import { listForms } from '@/lib/formApi';

export function useFormList() {
  const [forms, setForms] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listForms();
      setForms(data);
      setJustRefreshed(true);
      setTimeout(() => setJustRefreshed(false), 1200);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { forms, setForms, loading, justRefreshed, refresh };
}
