import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; onClick?: () => void }>;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-1.5 text-xs text-slate-500 mb-1">
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-slate-400">/</span>}
                {bc.onClick ? (
                  <button
                    onClick={bc.onClick}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {bc.label}
                  </button>
                ) : (
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {bc.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-center space-x-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
          {badge && <div>{badge}</div>}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
