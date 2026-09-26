import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { unwrapError } from '../../services/api';

const ROLE_HOME = { CUSTOMER: '/dashboard', EMPLOYEE: '/compliance/dashboard', ADMIN: '/compliance/dashboard' };

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await login(form);
      showToast('Login successful', 'success');
      navigate(ROLE_HOME[result.user.role] || '/dashboard');
    } catch (err) {
      setError(unwrapError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">CBA <span className="text-brand-400">Retail Bank</span></h1>
          <p className="text-slate-400 text-sm mt-1">AML Transaction Monitoring System</p>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Sign in to your account</h2>
          {error && <p className="mb-4 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-600">
            New customer?{' '}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
        <div className="mt-4 text-center text-xs text-slate-500">
          Demo: admin@bank.com / Admin@1234 &middot; employee@bank.com / Employee@1234
        </div>
      </div>
    </div>
  );
}
