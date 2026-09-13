import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
  active = false,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }[size];

  const variantClasses = {
    default:
      'bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-800 dark:text-neutral-200 border border-black/5 dark:border-white/10',
    primary:
      'bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 font-medium shadow-sm',
    ghost:
      'bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100',
    icon: 'p-2 aspect-square inline-flex items-center justify-center bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-300 rounded-full',
  }[variant];

  return (
    <button
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none',
          variant !== 'icon' && sizeClasses,
          variantClasses,
          active && 'bg-black/15 dark:bg-white/20 font-medium text-neutral-900 dark:text-white',
          className
        )
      )}
      {...props}
    >
      {children}
    </button>
  );
};
