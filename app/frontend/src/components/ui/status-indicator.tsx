import * as React from 'react';
import { Cloud, CheckCircle2, RotateCw, AlertCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unsaved' | 'synced';

interface StatusIndicatorProps {
    status: SaveStatus;
    lastSaved?: Date;
    errorMessage?: string | null;
    className?: string;
    showText?: boolean;
}

export function StatusIndicator({
    status,
    lastSaved,
    errorMessage,
    className,
    showText = true,
}: StatusIndicatorProps) {
    // Google Colab style:
    // - Saving: Spinning circle arrows or similar
    // - Saved/Synced: Checkmark cloud or just checkmark
    // - Error: Warning icon

    const getContent = () => {
        switch (status) {
            case 'saving':
                return {
                    icon: <RotateCw className="h-4 w-4 animate-spin text-orange-500" />,
                    text: 'Saving...',
                    color: 'text-orange-600',
                };
            case 'saved':
            case 'synced':
                return {
                    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
                    text: 'All changes saved',
                    color: 'text-gray-500',
                };
            case 'error':
                return {
                    icon: <AlertCircle className="h-4 w-4 text-red-500" />,
                    text: errorMessage || 'Error saving changes',
                    color: 'text-red-600',
                };
            case 'unsaved':
                return {
                    icon: <Circle className="h-4 w-4 text-amber-500 fill-amber-100" />,
                    text: 'Unsaved changes',
                    color: 'text-amber-700',
                };
            case 'idle':
            default:
                return null; // Don't show anything for idle if desired, or maybe "Ready"
        }
    };

    const content = getContent();
    if (!content) return null;

    return (
        <div className={cn("flex items-center gap-2 text-sm transition-all duration-300", content.color, className)} title={status === 'error' ? errorMessage || undefined : undefined}>
            {content.icon}
            {showText && <span className="font-medium text-xs">{content.text}</span>}
        </div>
    );
}
