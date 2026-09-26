import React, { useEffect, useState } from 'react';
import * as customerService from '../../services/customerService';
import * as accountService from '../../services/accountService';
import { LoadingState, EmptyState, ErrorState } from '../../components/LoadingState';
import Pagination from '../../components/Pagination';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatCurrency } from '../../utils/format';
import { unwrapError } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function AccountControlsPage() {
  const { showToast } = useToast();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // { account, customerName, type }

  function load() {
    setLoading(true);
    const params = { page, limit: 10 };
    if (q) params.q = q;
    customerService
      .searchCustomers(params)
      .then(setResult)
      .catch((err) => setError(unwrapError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [q, page]);

  async function confirmAction() {
    const { account, type } = pendingAction;
    try {
      if (type === 'freeze') {
        await accountService.freezeAccount(account._id, 'Frozen via Account Controls');
        showToast('Account frozen', 'success');
      } else {
        await accountService.unfreezeAccount(account._id);
        showToast('Account unfrozen', 'success');
      }
      setPendingAction(null);
      load();
    } catch (err) {
      showToast(unwrapError(err), 'error');
      setPendingAction(null);
    }
  }

  const rows = result.data.flatMap((c) => (c.accounts || []).map((a) => ({ ...a, customerName: c.name, customerEmail: c.email })));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Account Controls</h1>
      <p className="text-sm text-slate-500">Freeze or unfreeze customer accounts. Frozen accounts cannot perform any transactions.</p>

      <div className="card p-4">
        <label className="label" htmlFor="q">Search customers or accounts</label>
        <input id="q" className="input" placeholder="Name, email, phone, or account number" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>

      <div className="card">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : rows.length === 0 ? (
          <EmptyState title="No accounts found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Customer</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Account Number</th>
                    <th className="px-4 py-2 text-right font-semibold text-slate-600">Balance</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50">
                      <td className="px-4 py-2">{a.customerName}</td>
                      <td className="px-4 py-2 font-mono">{a.accountNumber}</td>
                      <td className="px-4 py-2 text-right font-mono">{formatCurrency(a.balance, a.currency)}</td>
                      <td className="px-4 py-2"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          className={a.status === 'FROZEN' ? 'btn-secondary btn-sm' : 'btn-danger btn-sm'}
                          onClick={() => setPendingAction({ account: a, type: a.status === 'FROZEN' ? 'unfreeze' : 'freeze' })}
                        >
                          {a.status === 'FROZEN' ? 'Unfreeze' : 'Freeze'}
                        </button>
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

      <ConfirmDialog
        open={!!pendingAction}
        title={pendingAction?.type === 'freeze' ? 'Freeze this account?' : 'Unfreeze this account?'}
        description={
          pendingAction?.type === 'freeze'
            ? `${pendingAction?.account.accountNumber} will be blocked from all transactions.`
            : `${pendingAction?.account.accountNumber} will regain the ability to transact.`
        }
        confirmLabel={pendingAction?.type === 'freeze' ? 'Freeze account' : 'Unfreeze account'}
        danger={pendingAction?.type === 'freeze'}
        onConfirm={confirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
