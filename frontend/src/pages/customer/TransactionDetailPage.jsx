import React, { useEffect, useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as transactionService from '../../services/transactionService';
import { formatCurrency, formatDate } from '../../utils/format';
import StatusBadge from '../../components/StatusBadge';
import RiskBadge from '../../components/RiskBadge';
import { LoadingState, ErrorState } from '../../components/LoadingState';
import { unwrapError } from '../../services/api';

export default function TransactionDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { account } = useAuth();
  const [transaction, setTransaction] = useState(location.state?.transaction || null);
  const [loading, setLoading] = useState(!transaction);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (transaction || !account) return;
    transactionService
      .getAccountTransactions(account.id || account._id, { limit: 100 })
      .then((res) => {
        const found = res.data.find((t) => t._id === id);
        if (!found) throw new Error('Transaction not found');
        setTransaction(found);
      })
      .catch((err) => setError(unwrapError(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, account]);

  if (loading) return <LoadingState label="Loading transaction..." />;
  if (error) return <ErrorState message={error} />;
  if (!transaction) return <ErrorState message="Transaction not found." />;

  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/transactions" className="text-sm text-brand-600 hover:underline">&larr; Back to transactions</Link>
      <h1 className="text-xl font-bold text-slate-900">Transaction Details</h1>

      <div className="card p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Field label="Transaction Reference" value={<span className="font-mono">{transaction.transactionRef}</span>} />
          <Field label="Date & Time" value={formatDate(transaction.timestamp)} />
          <Field label="Type" value={transaction.type} />
          <Field label="Amount" value={<span className="font-semibold">{formatCurrency(transaction.amount, transaction.currency)}</span>} />
          <Field label="Location" value={transaction.location} />
          <Field label="Status" value={<StatusBadge status={transaction.status} />} />
          <Field label="Balance After" value={formatCurrency(transaction.balanceAfter, transaction.currency)} />
          <Field label="Description" value={transaction.description || '-'} />
          {transaction.counterparty?.name && (
            <Field label="Counterparty" value={`${transaction.counterparty.name}${transaction.counterparty.accountNumber ? ` (${transaction.counterparty.accountNumber})` : ''}`} />
          )}
        </dl>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Monitoring Status</h2>
        <div className="flex items-center gap-3 mb-3">
          <RiskBadge level={transaction.riskLevel} />
          <span className="text-sm text-slate-500">Risk score: {transaction.riskScore}/100</span>
          {transaction.isSuspicious && <span className="badge bg-rose-100 text-rose-800">Flagged for review</span>}
        </div>
        {transaction.isSuspicious ? (
          <p className="text-sm text-slate-600">
            This transaction was flagged by our automated monitoring system and is under compliance review.
            No action is required from you at this time.
          </p>
        ) : (
          <p className="text-sm text-slate-600">No suspicious activity was detected for this transaction.</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900 mt-0.5">{value}</dd>
    </div>
  );
}
