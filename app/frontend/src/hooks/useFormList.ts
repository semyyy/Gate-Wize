/**
 * Copyright (c) 2026 EAExpertise
 *
 * This software is licensed under the MIT License with Commons Clause.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to use,
 * copy, modify, merge, publish, distribute, and sublicense the Software,
 * subject to the conditions of the MIT License and the Commons Clause.
 *
 * Commercial use of this Software is strictly prohibited unless explicit prior
 * written permission is obtained from EAExpertise.
 *
 * The Software may be used for internal business purposes, research,
 * evaluation, or other non-commercial purposes.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

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
