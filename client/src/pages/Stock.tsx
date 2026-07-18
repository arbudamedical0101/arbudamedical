import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, SlidersHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiError } from '@/lib/api';
import { Button, Card, Input, Badge, Modal, Field, Select } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { PageHeader, Pagination } from '@/components/Page';
import { formatINR, formatDate, expiryStatus } from '@/lib/utils';

interface Batch {
  _id: string; batchNo: string; expiry: string; mrp: number; purchaseRate: number; saleRate: number; qtyInStock: number;
  medicine: { _id: string; name: string; unit: string };
}

interface LowStockRow { medicine: { _id: string; name: string }; totalQty: number; reorderLevel: number }

const TABS = ['Stock', 'Low Stock', 'Near Expiry', 'Expired'] as const;

export default function Stock() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Stock');
  const [adjust, setAdjust] = useState<Batch | null>(null);

  return (
    <div>
      <PageHeader title="Stock & Alerts" subtitle="Batch-level inventory, expiry and low-stock alerts" />
      <Valuation />
      <div className="mb-4 mt-5 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${tab === t ? 'bg-accent-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>{t}</button>
        ))}
      </div>
      {tab === 'Stock' ? <StockList onAdjust={setAdjust} /> : <AlertsView tab={tab} />}
      {adjust && <AdjustModal batch={adjust} onClose={() => setAdjust(null)} />}
    </div>
  );
}

function Valuation() {
  const { data } = useQuery({ queryKey: ['/batches/valuation'], queryFn: async () => (await api.get('/batches/valuation')).data.data });
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card className="!p-3"><p className="text-xs text-slate-500">Stock value (cost)</p><p className="text-lg font-bold text-slate-800">{formatINR(data?.atPurchase)}</p></Card>
      <Card className="!p-3"><p className="text-xs text-slate-500">Stock value (MRP)</p><p className="text-lg font-bold text-slate-800">{formatINR(data?.atMrp)}</p></Card>
      <Card className="!p-3"><p className="text-xs text-slate-500">Total units</p><p className="text-lg font-bold text-slate-800">{data?.totalUnits ?? 0}</p></Card>
      <Card className="!p-3"><p className="text-xs text-slate-500">Active batches</p><p className="text-lg font-bold text-slate-800">{data?.batchCount ?? 0}</p></Card>
    </div>
  );
}

function batchColumns(onAdjust?: (b: Batch) => void) {
  return [
    { key: 'name', header: 'Medicine', render: (r: Batch) => <span className="font-medium text-slate-800">{r.medicine?.name}</span> },
    { key: 'batchNo', header: 'Batch' },
    {
      key: 'expiry', header: 'Expiry',
      render: (r: Batch) => {
        const st = expiryStatus(r.expiry);
        return <span className="inline-flex items-center gap-1">{formatDate(r.expiry)}{st !== 'ok' && <Badge tone={st === 'expired' ? 'red' : 'amber'} pulse>{st === 'expired' ? 'Expired' : 'Near'}</Badge>}</span>;
      },
    },
    { key: 'qtyInStock', header: 'Qty', className: 'text-right', render: (r: Batch) => <span className="font-semibold">{r.qtyInStock}</span> },
    { key: 'mrp', header: 'MRP', className: 'text-right', render: (r: Batch) => formatINR(r.mrp) },
    ...(onAdjust ? [{
      key: '_a', header: '', className: 'text-right',
      render: (r: Batch) => <button onClick={(e) => { e.stopPropagation(); onAdjust(r); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><SlidersHorizontal className="h-4 w-4" /></button>,
    }] : []),
  ];
}

function StockList({ onAdjust }: { onAdjust: (b: Batch) => void }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['/batches', { search, page }],
    queryFn: async () => (await api.get('/batches', { params: { search, page, limit: 20, inStock: true } })).data,
  });
  return (
    <Card className="!p-0">
      <div className="border-b border-slate-100 p-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Search medicine or batch…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>
      <div className="p-3">
        <DataTable<Batch> columns={batchColumns(onAdjust)} rows={(data?.data ?? []) as Batch[]} rowKey={(r) => r._id} loading={isLoading} />
        <Pagination page={page} pages={data?.pagination?.pages ?? 1} onChange={setPage} />
      </div>
    </Card>
  );
}

function AlertsView({ tab }: { tab: string }) {
  const { data, isLoading } = useQuery({ queryKey: ['/batches/alerts'], queryFn: async () => (await api.get('/batches/alerts')).data.data });
  if (isLoading) return <Card>Loading…</Card>;

  if (tab === 'Low Stock') {
    return (
      <Card className="!p-3">
        <DataTable<LowStockRow>
          columns={[
            { key: 'name', header: 'Medicine', render: (r) => <span className="font-medium">{r.medicine.name}</span> },
            { key: 'totalQty', header: 'In Stock', className: 'text-right', render: (r) => <Badge tone="amber" pulse>{r.totalQty}</Badge> },
            { key: 'reorderLevel', header: 'Reorder At', className: 'text-right' },
          ]}
          rows={(data?.lowStock ?? []) as LowStockRow[]}
          rowKey={(r) => r.medicine._id}
          empty={<div className="py-8 text-center text-sm text-slate-400">No items below reorder level 🎉</div>}
        />
      </Card>
    );
  }
  const rows: Batch[] = tab === 'Expired' ? data?.expired ?? [] : data?.nearExpiry ?? [];
  return (
    <Card className="!p-3">
      <DataTable<Batch> columns={batchColumns()} rows={rows} rowKey={(r) => r._id} empty={<div className="py-8 text-center text-sm text-slate-400">Nothing here 🎉</div>} />
    </Card>
  );
}

function AdjustModal({ batch, onClose }: { batch: Batch; onClose: () => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState('damage');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');

  const submit = useMutation({
    mutationFn: async () => {
      const n = Number(qty);
      const qtyChange = type === 'correction' ? n : -Math.abs(n);
      return (await api.post('/stock-adjustments', { batchId: batch._id, type, qtyChange, reason })).data;
    },
    onSuccess: () => { toast.success('Stock adjusted'); qc.invalidateQueries({ queryKey: ['/batches'] }); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <Modal open onClose={onClose} title={`Adjust — ${batch.medicine?.name}`}>
      <p className="mb-3 text-sm text-slate-500">Batch {batch.batchNo} · current stock <b>{batch.qtyInStock}</b></p>
      <div className="space-y-4">
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="damage">Damage (write-off)</option>
            <option value="expiry">Expiry (write-off)</option>
            <option value="correction">Correction (+/-)</option>
          </Select>
        </Field>
        <Field label={type === 'correction' ? 'Quantity change (use - to reduce)' : 'Quantity to write off'}>
          <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} required />
        </Field>
        <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} required /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={submit.isPending} onClick={() => submit.mutate()} disabled={!qty || !reason}>Apply</Button>
        </div>
      </div>
    </Modal>
  );
}
