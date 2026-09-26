import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as customerService from '../../services/customerService';
import * as accountService from '../../services/accountService';
import * as transactionService from '../../services/transactionService';
import { LoadingState, ErrorState, EmptyState } from '../../components/LoadingState';
import StatusBadge from '../../components/StatusBadge';
import RiskBadge from '../../components/RiskBadge';
import TransactionTable from '../../components/TransactionTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatCurrency, formatDate } from '../../utils/format';
import { unwrapError } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);

  function load() {
    setLoading(true);
    customerService
      .getCustomer(id)
      .then((res) => {
        setData(res);
        if (res.accounts?.length) setSelectedAccount(res.accounts[0]);
      })
      .catch((err) => setError(unwrapError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  useEffect(() => {
    if (!selectedAccount) return;
    transactionService
      .getAccountTransactions(selectedAccount._id, { limit: 10 })
      .then((res) => setTransactions(res.data))
      .catch(() => setTransactions([]));
  }, [selectedAccount]);

  async function handleFreezeToggle() {
    try {
      if (selectedAccount.status === 'FROZEN') {
        await accountService.unfreezeAccount(selectedAccount._id);
        showToast('Account unfrozen', 'success');
      } else {
        await accountService.freezeAccount(selectedAccount._id, 'Frozen via compliance review');
        showToast('Account frozen', 'success');
      }
      setConfirmAction(null);
      load();
    } catch (err) {
      showToast(unwrapError(err), 'error');
      setConfirmAction(null);
    }
  }

  if (loading) return <LoadingState label="Loading customer..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { customer, accounts } = data;

  return (
    <div className="space-y-6">
      <Link to="/compliance/customers" className="text-sm text-brand-600 hover:underline">&larr; Back to search</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{customer.name}</h1>
          <p className="text-sm text-slate-500">{customer.email} &middot; {customer.phone}</p>
        </div>
        <RiskBadge level={customer.customerRiskLevel} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-1">
          <h2 className="font-semibold text-slate-800 mb-3">Accounts</h2>
          <div className="space-y-2">
            {accounts.map((a) => (
              <button
                type="button"
                key={a._id}
                onClick={() => setSelectedAccount(a)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                  selectedAccount?._id === a._id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono">{a.accountNumber}</span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="text-slate-500 mt-1">{formatCurrency(a.balance, a.currency)}</div>
              </button>
            ))}
          </div>
        </div>

        {selectedAccount && (
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Account {selectedAccount.accountNumber}</h2>
              <button
                type="button"
                className={selectedAccount.status === 'FROZEN' ? 'btn-secondary btn-sm' : 'btn-danger btn-sm'}
                onClick={() => setConfirmAction(selectedAccount.status === 'FROZEN' ? 'unfreeze' : 'freeze')}
              >
                {selectedAccount.status === 'FROZEN' ? 'Unfreeze Account' : 'Freeze Account'}
              </button>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-2">
              <div>
                <dt className="text-slate-500">Balance</dt>
                <dd className="font-semibold">{formatCurrency(selectedAccount.balance, selectedAccount.currency)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd><StatusBadge status={selectedAccount.status} /></dd>
              </div>
              <div>
                <dt className="text-slate-500">Opened</dt>
                <dd>{formatDate(selectedAccount.createdAt)}</dd>
              </div>
              {selectedAccount.frozenReason && (
                <div>
                  <dt className="text-slate-500">Frozen Reason</dt>
                  <dd>{selectedAccount.frozenReason}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Recent Transactions</h2>
        </div>
        {transactions.length === 0 ? (
          <EmptyState title="No transactions for this account" />
        ) : (
          <TransactionTable transactions={transactions} detailBasePath="/compliance/transactions" />
        )}
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction === 'freeze' ? 'Freeze this account?' : 'Unfreeze this account?'}
        description={
          confirmAction === 'freeze'
            ? 'The customer will not be able to perform any transactions until this account is unfrozen.'
            : 'The customer will regain the ability to perform transactions on this account.'
        }
        confirmLabel={confirmAction === 'freeze' ? 'Freeze account' : 'Unfreeze account'}
        danger={confirmAction === 'freeze'}
        onConfirm={handleFreezeToggle}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
