import React from 'react';
import { Link } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl font-bold text-slate-800">403</h1>
      <p className="text-slate-600 mt-2">You do not have permission to access this page.</p>
      <Link to="/" className="btn-primary mt-6">Go home</Link>
    </div>
  );
}
