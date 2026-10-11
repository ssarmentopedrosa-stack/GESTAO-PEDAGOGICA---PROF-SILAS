import React from 'react';

export interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  subtext?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
  accentColor?: 'blue' | 'emerald' | 'amber' | 'rose' | 'teal' | 'slate';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  description,
  subtext,
  icon,
  badge,
  onClick,
  accentColor = 'blue',
  className = '',
}) => {
  const iconBgStyles = {
    blue: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
    teal: 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  };

  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs transition-all ${
        isClickable
          ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
          : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            {label}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {value}
            </span>
            {badge && <div>{badge}</div>}
          </div>
          {description && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
              {description}
            </p>
          )}
          {subtext && (
            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
              {subtext}
            </p>
          )}
        </div>

        {icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBgStyles[accentColor]}`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
