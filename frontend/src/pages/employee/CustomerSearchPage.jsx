import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as customerService from '../../services/customerService';
import { LoadingState, EmptyState, ErrorState } from '../../components/LoadingState';
import Pagination from '../../components/Pagination';
import RiskBadge from '../../components/RiskBadge';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency } from '../../utils/format';
import { unwrapError } from '../../services/api';

export default function CustomerSearchPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 10 };
    if (q) params.q = q;
    customerService
      .searchCustomers(params)
      .then(setResult)
      .catch((err) => setError(unwrapError(err)))
      .finally(() => setLoading(false));
  }, [q, page]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Customer Search</h1>

      <div className="card p-4">
        <label className="label" htmlFor="q">Search by name, email, phone, or account number</label>
        <input
          id="q"
          className="input"
          placeholder="e.g. Alice Fernandes, alice@bank.com, CBA123..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
      </div>

      <div className="card">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : result.data.length === 0 ? (
          <EmptyState title="No customers found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Name</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Email</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Phone</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Accounts</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Risk</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.data.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-800">{c.name}</td>
                      <td className="px-4 py-2 text-slate-500">{c.email}</td>
                      <td className="px-4 py-2 text-slate-500">{c.phone}</td>
                      <td className="px-4 py-2">
                        {c.accounts?.map((a) => (
                          <div key={a._id} className="flex items-center gap-2">
                            <span className="font-mono text-xs">{a.accountNumber}</span>
                            <StatusBadge status={a.status} />
                            <span className="text-xs text-slate-400">{formatCurrency(a.balance)}</span>
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-2"><RiskBadge level={c.customerRiskLevel} /></td>
                      <td className="px-4 py-2 text-right">
                        <Link to={`/compliance/customers/${c._id}`} className="text-brand-600 hover:underline text-xs font-medium">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={result.meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
