import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as transactionService from '../../services/transactionService';
import { useToast } from '../../context/ToastContext';
import { unwrapError } from '../../services/api';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatCurrency } from '../../utils/format';

const TYPES = [
  { value: 'DEPOSIT', label: 'Deposit' },
  { value: 'WITHDRAWAL', label: 'Withdrawal' },
  { value: 'TRANSFER', label: 'Transfer to another account' },
  { value: 'PAYMENT', label: 'Payment' },
];

export default function NewTransactionPage() {
  const { account, setAccount } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    type: 'DEPOSIT',
    amount: '',
    location: 'Bengaluru, IN',
    description: '',
    destinationAccountNumber: '',
    counterpartyName: '',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState(null);

  function handleChange(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    setConfirmOpen(false);
    try {
      const payload = {
        accountId: account.id || account._id,
        type: form.type,
        amount: Number(form.amount),
        location: form.location,
        description: form.description,
      };
      if (form.type === 'TRANSFER') payload.destinationAccountNumber = form.destinationAccountNumber;
      if (form.type === 'PAYMENT' && form.counterpartyName) payload.counterpartyName = form.counterpartyName;

      const res = await transactionService.createTransaction(payload);
      setResult(res);
      if (res.transaction.balanceAfter != null) {
        const updatedAccount = { ...account, balance: res.transaction.balanceAfter };
        setAccount(updatedAccount);
        localStorage.setItem('cba_account', JSON.stringify(updatedAccount));
      }
      showToast(res.alertGenerated ? 'Transaction completed - flagged for compliance review' : 'Transaction completed successfully', res.alertGenerated ? 'error' : 'success');
    } catch (err) {
      setError(unwrapError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setConfirmOpen(true);
  }

  if (result) {
    return (
      <div className="max-w-lg">
        <div className="card p-6 text-center">
          <div className="text-4xl mb-2">{result.alertGenerated ? '⚠️' : '✅'}</div>
          <h1 className="text-lg font-semibold text-slate-900">
            {result.alertGenerated ? 'Transaction completed, flagged for review' : 'Transaction completed'}
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            {formatCurrency(result.transaction.amount, result.transaction.currency)} {result.transaction.type.toLowerCase()} processed successfully.
          </p>
          {result.alertGenerated && (
            <p className="text-sm text-rose-600 mt-2">
              This transaction was automatically referred to our compliance team for review as part of routine
              monitoring.
            </p>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <button className="btn-secondary" onClick={() => { setResult(null); setForm({ ...form, amount: '', description: '' }); }}>
              New transaction
            </button>
            <button className="btn-primary" onClick={() => navigate('/dashboard')}>
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-bold text-slate-900">New Transaction</h1>
      {account?.status === 'FROZEN' && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 text-sky-800 px-4 py-3 text-sm">
          Your account is frozen. Transactions cannot be created until it is unfrozen.
        </div>
      )}
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="label" htmlFor="type">Transaction type</label>
          <select id="type" className="input" value={form.type} onChange={(e) => handleChange('type', e.target.value)}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="amount">Amount (INR)</label>
          <input
            id="amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            className="input"
            value={form.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
          />
        </div>
        {form.type === 'TRANSFER' && (
          <div>
            <label className="label" htmlFor="destinationAccountNumber">Destination account number</label>
            <input
              id="destinationAccountNumber"
              required
              className="input"
              value={form.destinationAccountNumber}
              onChange={(e) => handleChange('destinationAccountNumber', e.target.value)}
            />
          </div>
        )}
        {form.type === 'PAYMENT' && (
          <div>
            <label className="label" htmlFor="counterpartyName">Payee name</label>
            <input
              id="counterpartyName"
              className="input"
              value={form.counterpartyName}
              onChange={(e) => handleChange('counterpartyName', e.target.value)}
            />
          </div>
        )}
        <div>
          <label className="label" htmlFor="location">Location</label>
          <input id="location" className="input" value={form.location} onChange={(e) => handleChange('location', e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="description">Description (optional)</label>
          <input id="description" className="input" value={form.description} onChange={(e) => handleChange('description', e.target.value)} />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting || account?.status === 'FROZEN'}>
          {submitting ? 'Processing...' : 'Submit transaction'}
        </button>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm transaction"
        description={`You are about to ${form.type.toLowerCase()} ${formatCurrency(Number(form.amount) || 0)}. This action will be processed immediately.`}
        confirmLabel="Confirm"
        onConfirm={submit}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
