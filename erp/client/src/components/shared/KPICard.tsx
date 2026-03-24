import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}

export function KPICard({ title, value, icon, trend, className }: KPICardProps) {
  return (
    <div className={clsx("p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</h3>
        {icon && <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">{icon}</div>}
      </div>
      <div className="flex items-baseline space-x-2">
        <h2 className="text-3xl font-bold text-slate-900">{value}</h2>
        {trend && (
          <span className={clsx(
            "text-sm font-semibold rounded-full px-2 py-0.5", 
            trend.isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
          </span>
        )}
      </div>
    </div>
  );
}
