import { useCallback } from 'react';
import type { FieldRating } from '@/components/structured-form/ratings/FieldRating';

// Configuration for local storage keys
const APP_NAMESPACE = 'gatewize:v1';
const KEY_PATTERNS = {
    DATA: (id: string) => `${APP_NAMESPACE}:form:${id}:data`,
    RATINGS: (id: string) => `${APP_NAMESPACE}:form:${id}:ratings`,
};

type StorageEnvelope<T> = {
    version: number;
    timestamp: number;
    payload: T;
};

export function useFormPersistence() {
    // Helper to allow safer interaction with localStorage
    const setItem = <T>(key: string, data: T) => {
        if (typeof window === 'undefined') return;
        try {
            const envelope: StorageEnvelope<T> = {
                version: 1,
                timestamp: Date.now(),
                payload: data
            };
            localStorage.setItem(key, JSON.stringify(envelope));
        } catch (error) {
            console.error(`[useFormPersistence] Failed to save ${key}:`, error);
        }
    };

    const getItem = <T>(key: string): T | null => {
        if (typeof window === 'undefined') return null;
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;

            // Try parsing as envelope
            const parsed = JSON.parse(raw);

            // Handle legacy raw data (backward compatibility check)
            if (contextualIsEnvelope(parsed)) {
                return parsed.payload as T;
            }
            return parsed as T;
        } catch (error) {
            console.error(`[useFormPersistence] Failed to load ${key}:`, error);
            return null;
        }
    };

    const removeItem = (key: string) => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(key);
    };

    // --- Public API ---

    const saveFormData = useCallback((formId: string, data: Record<string, unknown>) => {
        if (!formId) return;
        setItem(KEY_PATTERNS.DATA(formId), data);
    }, []);

    const loadFormData = useCallback((formId: string): Record<string, unknown> => {
        if (!formId) return {};
        return getItem<Record<string, unknown>>(KEY_PATTERNS.DATA(formId)) || {};
    }, []);

    const saveRatings = useCallback((formId: string, ratings: Record<string, FieldRating>) => {
        if (!formId) return;
        setItem(KEY_PATTERNS.RATINGS(formId), ratings);
    }, []);

    const loadRatings = useCallback((formId: string): Record<string, FieldRating> => {
        if (!formId) return {};
        return getItem<Record<string, FieldRating>>(KEY_PATTERNS.RATINGS(formId)) || {};
    }, []);

    const clearFormData = useCallback((formId: string) => {
        if (!formId) return;
        removeItem(KEY_PATTERNS.DATA(formId));
        removeItem(KEY_PATTERNS.RATINGS(formId));
    }, []);

    const clearRatings = useCallback((formId: string) => {
        if (!formId) return;
        removeItem(KEY_PATTERNS.RATINGS(formId));
    }, []);

    const clearAllFormData = useCallback(() => {
        if (typeof window === 'undefined') return;
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(APP_NAMESPACE)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch (error) {
            console.error('[useFormPersistence] Failed to clear all data:', error);
        }
    }, []);

    return {
        saveFormData,
        loadFormData,
        clearFormData,
        clearAllFormData,
        saveRatings,
        loadRatings,
        clearRatings,
    };
}

// Runtime type guard for envelope
function contextualIsEnvelope(obj: any): obj is StorageEnvelope<any> {
    return obj && typeof obj === 'object' && 'version' in obj && 'payload' in obj;
}
