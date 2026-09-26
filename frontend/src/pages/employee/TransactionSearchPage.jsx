import React, { useEffect, useState } from 'react';
import * as transactionService from '../../services/transactionService';
import TransactionTable from '../../components/TransactionTable';
import Pagination from '../../components/Pagination';
import { LoadingState, EmptyState, ErrorState } from '../../components/LoadingState';
import { unwrapError } from '../../services/api';

const TYPES = ['', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'PAYMENT'];
const RISK_LEVELS = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SORT_FIELDS = [
  { value: 'timestamp', label: 'Date' },
  { value: 'amount', label: 'Amount' },
  { value: 'riskScore', label: 'Risk Score' },
];

export default function TransactionSearchPage() {
  const [filters, setFilters] = useState({
    type: '',
    riskLevel: '',
    isSuspicious: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    sortBy: 'timestamp',
    sortDir: 'desc',
    page: 1,
  });
  const [result, setResult] = useState({ data: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = { ...filters, limit: 15 };
    Object.keys(params).forEach((k) => { if (params[k] === '') delete params[k]; });
    transactionService
      .searchTransactions(params)
      .then(setResult)
      .catch((err) => setError(unwrapError(err)))
      .finally(() => setLoading(false));
  }, [filters]);

  function update(key, value) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Transaction Search</h1>

      <div className="card p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div>
          <label className="label">Type</label>
          <select className="input" value={filters.type} onChange={(e) => update('type', e.target.value)}>
            {TYPES.map((t) => <option key={t} value={t}>{t || 'All'}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Risk Level</label>
          <select className="input" value={filters.riskLevel} onChange={(e) => update('riskLevel', e.target.value)}>
            {RISK_LEVELS.map((r) => <option key={r} value={r}>{r || 'All'}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Suspicious</label>
          <select className="input" value={filters.isSuspicious} onChange={(e) => update('isSuspicious', e.target.value)}>
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="label">Min Amount</label>
          <input type="number" className="input" value={filters.minAmount} onChange={(e) => update('minAmount', e.target.value)} />
        </div>
        <div>
          <label className="label">Max Amount</label>
          <input type="number" className="input" value={filters.maxAmount} onChange={(e) => update('maxAmount', e.target.value)} />
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={filters.startDate} onChange={(e) => update('startDate', e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={filters.endDate} onChange={(e) => update('endDate', e.target.value)} />
        </div>
        <div>
          <label className="label">Sort By</label>
          <select className="input" value={filters.sortBy} onChange={(e) => update('sortBy', e.target.value)}>
            {SORT_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : result.data.length === 0 ? (
          <EmptyState title="No transactions found" description="Try adjusting your search filters." />
        ) : (
          <>
            <TransactionTable transactions={result.data} showCustomer detailBasePath="/compliance/transactions" />
            <Pagination meta={result.meta} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
          </>
        )}
      </div>
    </div>
  );
}
