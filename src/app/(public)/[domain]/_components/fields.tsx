import { cn } from "@/lib/utils";
import { forwardRef } from "react";

/**
 * Button Component
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
}

export const FormButton = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
        const variants = {
            primary: 'bg-black text-white hover:bg-zinc-800 shadow-sm border border-black',
            secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-200',
            outline: 'bg-transparent border border-zinc-200 text-zinc-900 hover:bg-zinc-50',
            ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100',
            danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-xs',
            md: 'px-4 py-2 text-sm',
            lg: 'px-6 py-3 text-base',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            />
        );
    }
);

/**
 * Input Component
 */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    description?: string;
}

export const FormInput = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, description, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="w-full space-y-1.5 text-left">
                {label && (
                    <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    ref={ref}
                    className={cn(
                        'flex w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
                        error && 'border-red-500 focus:ring-red-500',
                        className
                    )}
                    {...props}
                />
                {description && <p className="text-xs text-zinc-400">{description}</p>}
                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
        );
    }
);

/**
 * Textarea Component
 */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    description?: string;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, error, description, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="w-full space-y-1.5 text-left">
                {label && (
                    <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        {label}
                    </label>
                )}
                <textarea
                    id={inputId}
                    ref={ref}
                    className={cn(
                        'flex min-h-[100px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
                        error && 'border-red-500 focus:ring-red-500',
                        className
                    )}
                    {...props}
                />
                {description && <p className="text-xs text-zinc-400">{description}</p>}
                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
        );
    }
);

/**
 * Checkbox Component
 */
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

export const FormCheckbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, label, id, ...props }, ref) => {
        const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
        return (
            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    id={inputId}
                    ref={ref}
                    className={cn(
                        'h-4 w-4 rounded border-zinc-300 text-black focus:ring-black accent-black',
                        className
                    )}
                    {...props}
                />
                <label htmlFor={inputId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                    {label}
                </label>
            </div>
        );
    }
);
