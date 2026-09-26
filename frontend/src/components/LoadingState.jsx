import React from 'react';

export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center py-16 text-slate-500" role="status" aria-live="polite">
      <svg className="animate-spin h-5 w-5 mr-2 text-brand-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
      <div className="text-3xl mb-2">📭</div>
      <p className="font-medium text-slate-700">{title}</p>
      {description && <p className="text-sm mt-1 max-w-sm">{description}</p>}
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm" role="alert">
      {message}
    </div>
  );
}
