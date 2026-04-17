import type { ReactNode } from 'react';

interface Props {
  title: string;
  value: string | number;
  sub?: string;
  trend?: { value: string; up: boolean };
  color?: 'indigo' | 'emerald' | 'amber' | 'red' | 'slate' | 'violet';
  icon?: ReactNode;
}

const cfg = {
  indigo: { glow: 'from-indigo-500/10 to-transparent', icon: 'text-indigo-500 dark:text-indigo-400 bg-indigo-500/10', dot: 'bg-indigo-500' },
  emerald:{ glow: 'from-emerald-500/10 to-transparent', icon: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10', dot: 'bg-emerald-500' },
  amber:  { glow: 'from-amber-500/10 to-transparent', icon: 'text-amber-600 dark:text-amber-400 bg-amber-500/10', dot: 'bg-amber-500' },
  red:    { glow: 'from-red-500/10 to-transparent', icon: 'text-red-600 dark:text-red-400 bg-red-500/10', dot: 'bg-red-500' },
  slate:  { glow: 'from-slate-500/5 to-transparent', icon: 'text-c3 bg-cbrd', dot: 'bg-slate-400' },
  violet: { glow: 'from-violet-500/10 to-transparent', icon: 'text-violet-600 dark:text-violet-400 bg-violet-500/10', dot: 'bg-violet-500' },
};

export default function StatsCard({ title, value, sub, trend, color = 'indigo', icon }: Props) {
  const c = cfg[color];
  return (
    <div className="relative overflow-hidden card-hover p-5 group cursor-default">
      {/* Gradient sweep */}
      <div className={`absolute inset-0 bg-gradient-to-br ${c.glow} pointer-events-none`} />

      {/* Accent dot */}
      <div className={`absolute top-4 right-4 w-1.5 h-1.5 rounded-full ${c.dot} opacity-40`} />

      <div className="relative space-y-3">
        {/* Label + icon */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-c4">{title}</p>
          {icon && (
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.icon}
                              transition-transform duration-200 group-hover:scale-110`}>
              {icon}
            </span>
          )}
        </div>

        {/* Value */}
        <p className="text-[28px] font-semibold leading-none tracking-tight text-c1">{value}</p>

        {/* Sub + trend */}
        <div className="flex items-center gap-2 pt-0.5">
          {sub && <p className="text-[12px] text-c4 leading-none">{sub}</p>}
          {trend && (
            <span className={`text-[12px] font-semibold flex items-center gap-0.5 leading-none
              ${trend.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {trend.up ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
      </div>

      {/* Bottom line */}
      <div className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r ${c.glow}`} />
    </div>
  );
}
