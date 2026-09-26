import React from 'react';

const STYLES = {
  LOW: 'bg-emerald-100 text-emerald-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-rose-100 text-rose-800',
};

export default function RiskBadge({ level }) {
  if (!level) return null;
  return <span className={`badge ${STYLES[level] || 'bg-slate-100 text-slate-700'}`}>{level}</span>;
}
