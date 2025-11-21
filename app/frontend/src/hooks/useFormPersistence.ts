import { useCallback } from 'react';

const STORAGE_PREFIX = 'form_data_';

export function useFormPersistence() {
    const saveFormData = useCallback((formId: string, data: Record<string, unknown>) => {
        try {
            const key = `${STORAGE_PREFIX}${formId}`;
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save form data to localStorage:', error);
        }
    }, []);

    const loadFormData = useCallback((formId: string): Record<string, unknown> => {
        try {
            const key = `${STORAGE_PREFIX}${formId}`;
            const stored = localStorage.getItem(key);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load form data from localStorage:', error);
        }
        return {};
    }, []);

    const clearFormData = useCallback((formId: string) => {
        try {
            const key = `${STORAGE_PREFIX}${formId}`;
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Failed to clear form data from localStorage:', error);
        }
    }, []);

    const clearAllFormData = useCallback(() => {
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(STORAGE_PREFIX)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (error) {
            console.error('Failed to clear all form data from localStorage:', error);
        }
    }, []);

    return {
        saveFormData,
        loadFormData,
        clearFormData,
        clearAllFormData,
    };
}
