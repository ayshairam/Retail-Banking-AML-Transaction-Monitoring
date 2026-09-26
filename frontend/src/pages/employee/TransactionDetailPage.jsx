import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/format';
import StatusBadge from '../../components/StatusBadge';
import RiskBadge from '../../components/RiskBadge';
import { ErrorState } from '../../components/LoadingState';

export default function EmployeeTransactionDetailPage() {
  const location = useLocation();
  const transaction = location.state?.transaction;

  if (!transaction) {
    return (
      <div className="max-w-lg">
        <ErrorState message="Open this transaction from a list or search result to view its details." />
        <Link to="/compliance/transactions" className="btn-secondary mt-4 inline-block">
          Go to transaction search
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Link to="/compliance/transactions" className="text-sm text-brand-600 hover:underline">&larr; Back to transactions</Link>
      <h1 className="text-xl font-bold text-slate-900">Transaction Details</h1>

      <div className="card p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Field label="Transaction Reference" value={<span className="font-mono">{transaction.transactionRef}</span>} />
          <Field label="Customer" value={transaction.customer?.name || '-'} />
          <Field label="Account" value={transaction.account?.accountNumber || '-'} />
          <Field label="Date & Time" value={formatDate(transaction.timestamp)} />
          <Field label="Type" value={transaction.type} />
          <Field label="Amount" value={<span className="font-semibold">{formatCurrency(transaction.amount, transaction.currency)}</span>} />
          <Field label="Location" value={transaction.location} />
          <Field label="Status" value={<StatusBadge status={transaction.status} />} />
          <Field label="Description" value={transaction.description || '-'} />
        </dl>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Risk & AML Status</h2>
        <div className="flex items-center gap-3 mb-2">
          <RiskBadge level={transaction.riskLevel} />
          <span className="text-sm text-slate-500">Risk score: {transaction.riskScore}/100</span>
        </div>
        {transaction.riskBreakdown && (
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
            <Field label="Amount Risk" value={`${transaction.riskBreakdown.amountRisk}/30`} />
            <Field label="Frequency Risk" value={`${transaction.riskBreakdown.frequencyRisk}/30`} />
            <Field label="Location Risk" value={`${transaction.riskBreakdown.locationRisk}/20`} />
            <Field label="Customer Risk" value={`${transaction.riskBreakdown.customerRisk}/20`} />
          </dl>
        )}
        {transaction.isSuspicious && (
          <p className="text-sm text-rose-600 mt-3">
            This transaction triggered AML rules: {(transaction.triggeredRuleCodes || []).join(', ')}. See AML Alerts
            for the full review workflow.
          </p>
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
