import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as amlService from '../../services/amlService';
import { LoadingState, EmptyState, ErrorState } from '../../components/LoadingState';
import Pagination from '../../components/Pagination';
import RiskBadge from '../../components/RiskBadge';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/format';
import { unwrapError } from '../../services/api';

const STATUSES = ['', 'OPEN', 'UNDER_REVIEW', 'CLEARED', 'CONFIRMED_SUSPICIOUS'];
const RISK_LEVELS = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function AlertsPage() {
  const [filters, setFilters] = useState({ status: '', riskLevel: '', page: 1 });
  const [result, setResult] = useState({ data: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = { ...filters, limit: 15 };
    Object.keys(params).forEach((k) => { if (params[k] === '') delete params[k]; });
    amlService
      .listAlerts(params)
      .then(setResult)
      .catch((err) => setError(unwrapError(err)))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">AML Alerts</h1>

      <div className="card p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="label">Status</label>
          <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
            {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'All'}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Risk Level</label>
          <select className="input" value={filters.riskLevel} onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value, page: 1 })}>
            {RISK_LEVELS.map((r) => <option key={r} value={r}>{r || 'All'}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : result.data.length === 0 ? (
          <EmptyState title="No AML alerts" description="No alerts match the current filters." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Created</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Customer</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Triggered Rules</th>
                    <th className="px-4 py-2 text-right font-semibold text-slate-600">Amount</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Risk</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.data.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 whitespace-nowrap text-slate-500">{formatDate(a.createdAt)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{a.customer?.name || '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {a.triggeredRules.map((r) => (
                          <span key={r.ruleCode} className="badge bg-slate-100 text-slate-700 mr-1">{r.ruleCode}</span>
                        ))}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right font-mono">{formatCurrency(a.transaction?.amount)}</td>
                      <td className="px-4 py-2 whitespace-nowrap"><RiskBadge level={a.riskLevel} /></td>
                      <td className="px-4 py-2 whitespace-nowrap"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-2 whitespace-nowrap text-right">
                        <Link to={`/compliance/alerts/${a._id}`} className="text-brand-600 hover:underline text-xs font-medium">
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={result.meta} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
          </>
        )}
      </div>
    </div>
  );
}
