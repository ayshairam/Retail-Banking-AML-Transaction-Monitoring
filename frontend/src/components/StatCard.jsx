import React from 'react';

export default function StatCard({ label, value, sublabel, tone = 'default', icon }) {
  const toneStyles = {
    default: 'text-slate-900',
    danger: 'text-rose-600',
    warning: 'text-amber-600',
    success: 'text-emerald-600',
  };
  return (
    <div className="card p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        {icon && <span className="text-slate-300 text-lg">{icon}</span>}
      </div>
      <span className={`text-2xl font-bold ${toneStyles[tone]}`}>{value}</span>
      {sublabel && <span className="text-xs text-slate-400">{sublabel}</span>}
    </div>
  );
}
