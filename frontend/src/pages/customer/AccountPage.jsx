import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as accountService from '../../services/accountService';
import * as transactionService from '../../services/transactionService';
import { formatCurrency, formatDate } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { unwrapError } from '../../services/api';
import { LoadingState, ErrorState } from '../../components/LoadingState';
import StatusBadge from '../../components/StatusBadge';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function monthAgoISO() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

export default function AccountPage() {
  const { account: authAccount, customer, setAccount } = useAuth();
  const { showToast } = useToast();
  const [account, setLocalAccount] = useState(authAccount);
  const [loading, setLoading] = useState(!authAccount);
  const [error, setError] = useState(null);
  const [statementForm, setStatementForm] = useState({ startDate: monthAgoISO(), endDate: todayISO(), format: 'pdf' });
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!authAccount) return;
    accountService
      .getAccount(authAccount.id || authAccount._id)
      .then((data) => {
        setLocalAccount(data);
        setAccount(data);
      })
      .catch((err) => setError(unwrapError(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownload(e) {
    e.preventDefault();
    setDownloading(true);
    try {
      const accountId = account.id || account._id;
      const blob = await transactionService.downloadStatement(accountId, statementForm);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statement-${account.accountNumber}.${statementForm.format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('Statement downloaded', 'success');
    } catch (err) {
      showToast(unwrapError(err), 'error');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <LoadingState label="Loading account..." />;
  if (error) return <ErrorState message={error} />;
  if (!account) return <ErrorState message="Account information unavailable." />;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-bold text-slate-900">My Account</h1>

      <div className="card p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Account Holder</dt>
            <dd className="font-medium text-slate-900">{customer?.name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Account Number</dt>
            <dd className="font-medium text-slate-900 font-mono">{account.accountNumber}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Available Balance</dt>
            <dd className="font-semibold text-lg text-slate-900">{formatCurrency(account.balance, account.currency)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd><StatusBadge status={account.status} /></dd>
          </div>
          <div>
            <dt className="text-slate-500">Currency</dt>
            <dd className="font-medium text-slate-900">{account.currency}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Account Opened</dt>
            <dd className="font-medium text-slate-900">{formatDate(account.createdAt)}</dd>
          </div>
        </dl>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold text-slate-800 mb-1">Download Statement</h2>
        <p className="text-sm text-slate-500 mb-4">Generate a statement of your transactions for a chosen date range.</p>
        <form onSubmit={handleDownload} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="label" htmlFor="startDate">From</label>
            <input
              id="startDate"
              type="date"
              className="input"
              required
              value={statementForm.startDate}
              onChange={(e) => setStatementForm({ ...statementForm, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="endDate">To</label>
            <input
              id="endDate"
              type="date"
              className="input"
              required
              value={statementForm.endDate}
              onChange={(e) => setStatementForm({ ...statementForm, endDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="format">Format</label>
            <select
              id="format"
              className="input"
              value={statementForm.format}
              onChange={(e) => setStatementForm({ ...statementForm, format: e.target.value })}
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={downloading}>
            {downloading ? 'Preparing...' : 'Download'}
          </button>
        </form>
      </div>
    </div>
  );
}
