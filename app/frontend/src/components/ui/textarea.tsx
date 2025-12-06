import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const combinedRef = (node: HTMLTextAreaElement) => {
    textareaRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
  };

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      // Reset height to allow shrinking when text is deleted
      textarea.style.height = 'auto';
      // Set height to the calculated scroll height for auto-expansion
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    textarea.addEventListener('input', adjustHeight);
    // Adjust on initial render and value updates if controlled
    adjustHeight();

    return () => textarea.removeEventListener('input', adjustHeight);
  }, [props.value]);

  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'resize-none overflow-hidden', // Key for auto-resize: prevents manual resize and hides scrollbar
        'transition duration-200 ease-in-out', // Smooth transitions
        className
      )}
      ref={combinedRef}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
