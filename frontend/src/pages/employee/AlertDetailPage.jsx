import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as amlService from '../../services/amlService';
import { LoadingState, ErrorState } from '../../components/LoadingState';
import RiskBadge from '../../components/RiskBadge';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/format';
import { unwrapError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/ConfirmDialog';

const RISK_COMPONENTS = [
  { key: 'amountRisk', label: 'Amount Risk', max: 30 },
  { key: 'frequencyRisk', label: 'Frequency Risk', max: 30 },
  { key: 'locationRisk', label: 'Location Risk', max: 20 },
  { key: 'customerRisk', label: 'Customer Risk', max: 20 },
];

const REVIEW_OPTIONS = [
  { value: 'UNDER_REVIEW', label: 'Mark as Under Review' },
  { value: 'CLEARED', label: 'Clear (legitimate activity)' },
  { value: 'CONFIRMED_SUSPICIOUS', label: 'Confirm Suspicious' },
];

export default function AlertDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('CLEARED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    amlService
      .getAlert(id)
      .then((data) => {
        setAlert(data);
        setReviewStatus(data.status === 'OPEN' ? 'UNDER_REVIEW' : data.status);
        setReviewNotes(data.reviewNotes || '');
      })
      .catch((err) => setError(unwrapError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function submitReview() {
    setSubmitting(true);
    setConfirmOpen(false);
    try {
      await amlService.reviewAlert(id, { status: reviewStatus, reviewNotes });
      showToast('Alert review saved', 'success');
      load();
    } catch (err) {
      showToast(unwrapError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="Loading alert..." />;
  if (error) return <ErrorState message={error} />;
  if (!alert) return null;

  const { transaction, customer, account } = alert;

  return (
    <div className="max-w-4xl space-y-6">
      <Link to="/compliance/alerts" className="text-sm text-brand-600 hover:underline">&larr; Back to alerts</Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">AML Alert</h1>
          <p className="text-sm text-slate-500">Created {formatDate(alert.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={alert.riskLevel} />
          <StatusBadge status={alert.status} />
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Why was this transaction flagged?</h2>
        <p className="text-sm text-slate-700 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-3">{alert.reason}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {alert.triggeredRules.map((r) => (
            <span key={r.ruleCode} className="badge bg-slate-100 text-slate-700">{r.ruleName} ({r.ruleCode})</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <h2 className="font-semibold text-slate-800 mb-3">Transaction</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Type" value={transaction?.type} />
            <Field label="Amount" value={formatCurrency(transaction?.amount, transaction?.currency)} />
            <Field label="Location" value={transaction?.location} />
            <Field label="Date" value={formatDate(transaction?.timestamp)} />
            <Field label="Customer" value={customer?.name} />
            <Field label="Account" value={account?.accountNumber} />
          </dl>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-slate-800 mb-3">Risk Score Breakdown</h2>
          <div className="space-y-2">
            {RISK_COMPONENTS.map((c) => {
              const value = transaction?.riskBreakdown?.[c.key] ?? 0;
              return (
                <div key={c.key}>
                  <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                    <span>{c.label}</span>
                    <span>{value}/{c.max}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-brand-500" style={{ width: `${(value / c.max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="font-semibold text-slate-800">Total Risk Score</span>
            <span className="text-lg font-bold">{alert.riskScore}/100</span>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Review & Resolve</h2>
        {alert.reviewer && (
          <p className="text-xs text-slate-500 mb-3">
            Last reviewed by {alert.reviewer.name} on {formatDate(alert.reviewedAt)}
          </p>
        )}
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="reviewStatus">Decision</label>
            <select id="reviewStatus" className="input" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
              {REVIEW_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="reviewNotes">Review notes</label>
            <textarea
              id="reviewNotes"
              className="input min-h-[100px]"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Document your investigation and rationale..."
            />
          </div>
          <button type="button" className="btn-primary" disabled={submitting || !reviewNotes.trim()} onClick={() => setConfirmOpen(true)}>
            Save Review
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm alert review"
        description={`This will mark the alert as "${reviewStatus.replace(/_/g, ' ')}".`}
        confirmLabel="Save Review"
        onConfirm={submitReview}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value ?? '-'}</dd>
    </div>
  );
}
