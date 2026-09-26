import React from 'react';

const STYLES = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  FROZEN: 'bg-sky-100 text-sky-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  PENDING: 'bg-amber-100 text-amber-800',
  FAILED: 'bg-rose-100 text-rose-800',
  REJECTED: 'bg-rose-100 text-rose-800',
  OPEN: 'bg-rose-100 text-rose-800',
  UNDER_REVIEW: 'bg-amber-100 text-amber-800',
  CLEARED: 'bg-emerald-100 text-emerald-800',
  CONFIRMED_SUSPICIOUS: 'bg-rose-200 text-rose-900',
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <span className={`badge ${STYLES[status] || 'bg-slate-100 text-slate-700'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
