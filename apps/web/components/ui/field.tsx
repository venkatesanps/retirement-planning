import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';

export function Label({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium mb-1.5">
      {children}
      {hint ? <span className="ml-2 text-xs text-muted-foreground font-normal">{hint}</span> : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
          'placeholder:text-muted-foreground/60',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}) {
  const v = {
    primary:
      'bg-primary text-primary-foreground hover:opacity-90 shadow-sm focus:ring-ring',
    secondary:
      'border border-border bg-card text-foreground hover:bg-muted focus:ring-ring',
    ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted focus:ring-ring',
    danger: 'border border-danger/40 text-danger hover:bg-danger/10 focus:ring-danger',
  }[variant];
  const s = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-3 text-sm' }[size];
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        v,
        s,
        className,
      )}
      {...props}
    />
  );
}
