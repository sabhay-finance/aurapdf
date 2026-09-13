import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'card' | 'surface' | 'pill';
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  variant = 'card',
  hoverEffect = false,
  ...props
}) => {
  const baseClasses =
    variant === 'pill'
      ? 'glass-pill rounded-full'
      : variant === 'surface'
      ? 'glass-surface rounded-2xl'
      : 'glass-card rounded-2xl';

  return (
    <div
      className={twMerge(
        clsx(
          baseClasses,
          hoverEffect && 'transition-all duration-200 hover:border-black/20 dark:hover:border-white/20',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
