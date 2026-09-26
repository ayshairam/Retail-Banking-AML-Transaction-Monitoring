import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as transactionService from '../../services/transactionService';
import TransactionTable from '../../components/TransactionTable';
import Pagination from '../../components/Pagination';
import { LoadingState, EmptyState, ErrorState } from '../../components/LoadingState';
import { unwrapError } from '../../services/api';

const TYPES = ['', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'PAYMENT'];
const STATUSES = ['', 'PENDING', 'COMPLETED', 'FAILED', 'REJECTED'];

export default function TransactionsPage() {
  const { account } = useAuth();
  const [filters, setFilters] = useState({ type: '', status: '', startDate: '', endDate: '', page: 1 });
  const [result, setResult] = useState({ data: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!account) return;
    setLoading(true);
    const params = { ...filters, limit: 15 };
    Object.keys(params).forEach((k) => { if (params[k] === '') delete params[k]; });
    transactionService
      .getAccountTransactions(account.id || account._id, params)
      .then(setResult)
      .catch((err) => setError(unwrapError(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, filters]);

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Transaction History</h1>

      <div className="card p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="label">Type</label>
          <select className="input" value={filters.type} onChange={(e) => updateFilter('type', e.target.value)}>
            {TYPES.map((t) => <option key={t} value={t}>{t || 'All'}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s || 'All'}</option>)}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={filters.startDate} onChange={(e) => updateFilter('startDate', e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={filters.endDate} onChange={(e) => updateFilter('endDate', e.target.value)} />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : result.data.length === 0 ? (
          <EmptyState title="No transactions found" description="Try adjusting your filters." />
        ) : (
          <>
            <TransactionTable transactions={result.data} />
            <Pagination meta={result.meta} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
          </>
        )}
      </div>
    </div>
  );
}
