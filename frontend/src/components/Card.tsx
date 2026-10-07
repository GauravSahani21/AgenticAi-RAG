import React, { type HTMLAttributes } from 'react';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  padded = true,
  children,
  className = '',
  ...props
}) => (
  <div className={`rounded-xl border border-zinc-200 bg-white ${className}`} {...props}>
    {(title || subtitle || action) && (
      <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
        <div className="min-w-0">
          {title && <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>}
          {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )}
    <div className={padded ? 'p-5' : ''}>{children}</div>
  </div>
);
