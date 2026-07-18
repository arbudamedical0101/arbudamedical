import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Wallet, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiError } from '@/lib/api';
import { Button, Card, Input, Field, Modal, Badge, Select } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { PageHeader, Pagination } from '@/components/Page';
import { formatINR, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

interface LedgerEntry { _id?: string; type: string; amount: number; ref?: string; note?: string; date: string }
interface Customer {
  _id: string;
  name: string;
  phone?: string;
  address?: string;
  creditBalance: number;
  creditLedger?: LedgerEntry[];
}

export default function Customers() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [ledgerId, setLedgerId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['/customers', { search, page }],
    queryFn: async () => (await api.get('/customers', { params: { search, page, limit: 20 } })).data,
  });

  const save = useMutation({
    mutationFn: async (payload: Partial<Customer>) =>
      editing
        ? (await api.patch(`/customers/${editing._id}`, payload)).data
        : (await api.post('/customers', payload)).data,
    onSuccess: () => {
      toast.success('Saved');
      setEditing(null);
      setCreating(false);
      qc.invalidateQueries({ queryKey: ['/customers'] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Customer master and khata (credit) ledger"
        actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New</Button>}
      />

      <Card className="!p-0">
        <div className="border-b border-slate-100 p-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search by name or phone…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <div className="p-3">
          <DataTable<Customer>
            columns={[
              { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
              { key: 'phone', header: 'Phone' },
              {
                key: 'creditBalance',
                header: 'Khata Balance',
                render: (r) =>
                  r.creditBalance > 0 ? <Badge tone="amber">{formatINR(r.creditBalance)}</Badge> : <span className="text-slate-400">—</span>,
              },
              {
                key: '_actions',
                header: 'Actions',
                className: 'text-right',
                render: (r) => (
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button className="rounded-lg p-2 text-accent-600 hover:bg-accent-50" onClick={() => setLedgerId(r._id)} aria-label="Ledger">
                      <Wallet className="h-4 w-4" />
                    </button>
                    <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setEditing(r)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={(data?.data ?? []) as Customer[]}
            rowKey={(r) => r._id}
            loading={isLoading}
          />
          <Pagination page={page} pages={data?.pagination?.pages ?? 1} onChange={setPage} />
        </div>
      </Card>

      {(creating || editing) && (
        <CustomerForm
          initial={editing ?? undefined}
          saving={save.isPending}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSubmit={(p) => save.mutate(p)}
        />
      )}

      {ledgerId && <LedgerModal customerId={ledgerId} canPay={can('pharmacist')} onClose={() => setLedgerId(null)} />}
    </div>
  );
}

function CustomerForm({ initial, onClose, onSubmit, saving }: { initial?: Customer; onClose: () => void; onSubmit: (p: Partial<Customer>) => void; saving: boolean }) {
  const [form, setForm] = useState({ name: initial?.name ?? '', phone: initial?.phone ?? '', address: initial?.address ?? '' });
  return (
    <Modal open onClose={onClose} title={initial ? 'Edit Customer' : 'New Customer'}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
        <Field label="Name"><Input value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function LedgerModal({ customerId, canPay, onClose }: { customerId: string; canPay: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('cash');
  const { data } = useQuery({
    queryKey: ['/customers', customerId],
    queryFn: async () => (await api.get(`/customers/${customerId}`)).data,
  });
  const customer: Customer | undefined = data?.data;

  const pay = useMutation({
    mutationFn: async () => (await api.post(`/customers/${customerId}/payments`, { amount: Number(amount), mode })).data,
    onSuccess: () => {
      toast.success('Payment recorded');
      setAmount('');
      qc.invalidateQueries({ queryKey: ['/customers'] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <Modal open onClose={onClose} title={customer ? `${customer.name} — Khata` : 'Khata'} wide>
      <div className="mb-4 rounded-lg bg-amber-50 p-4">
        <p className="text-sm text-amber-700">Outstanding balance</p>
        <p className="text-2xl font-bold text-amber-800">{formatINR(customer?.creditBalance)}</p>
      </div>

      {canPay && (customer?.creditBalance ?? 0) > 0 && (
        <form onSubmit={(e) => { e.preventDefault(); pay.mutate(); }} className="mb-4 flex flex-wrap items-end gap-2">
          <Field label="Receive payment"><Input type="number" step="0.01" value={amount} required onChange={(e) => setAmount(e.target.value)} placeholder="Amount" /></Field>
          <Select value={mode} onChange={(e) => setMode(e.target.value)} className="w-32">
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
          </Select>
          <Button type="submit" loading={pay.isPending}>Record</Button>
        </form>
      )}

      <div className="max-h-72 overflow-y-auto">
        <DataTable<LedgerEntry>
          columns={[
            { key: 'date', header: 'Date', render: (r) => formatDate(r.date, true) },
            { key: 'type', header: 'Type', render: (r) => <Badge tone={r.type === 'credit' ? 'amber' : 'green'}>{r.type}</Badge> },
            { key: 'ref', header: 'Reference' },
            { key: 'amount', header: 'Amount', className: 'text-right', render: (r) => formatINR(r.amount) },
          ]}
          rows={[...(customer?.creditLedger ?? [])].reverse()}
          rowKey={(r) => r._id ?? `${r.date}-${r.amount}`}
        />
      </div>
    </Modal>
  );
}
