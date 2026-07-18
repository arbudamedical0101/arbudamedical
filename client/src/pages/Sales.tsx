import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, FileText, Undo2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiError, openAuthedPdf } from '@/lib/api';
import { Button, Card, Input, Badge, Modal } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { PageHeader, Pagination } from '@/components/Page';
import { formatINR, formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

interface SaleItem { medicineId: string; batchId: string; name: string; batchNo: string; qty: number; rate: number; gstRate: number; lineTotal: number }
interface Sale {
  _id: string; invoiceNo: string; customerName?: string; createdAt: string;
  subTotal: number; gstTotal: number; grandTotal: number; creditAmount: number; status: string;
  items: SaleItem[]; payments: { mode: string; amount: number }[];
}

const statusTone = (s: string) => (s === 'returned' ? 'red' : s === 'partially-returned' ? 'amber' : 'green');

export default function Sales() {
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Sale | null>(null);
  const [returning, setReturning] = useState<Sale | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['/sales', { search, page }],
    queryFn: async () => (await api.get('/sales', { params: { search, page, limit: 20 } })).data,
  });

  return (
    <div>
      <PageHeader title="Sales" subtitle="All invoices — open to view, reprint or return" />
      <Card className="!p-0">
        <div className="border-b border-slate-100 p-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Search invoice no…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <div className="p-3">
          <DataTable<Sale>
            columns={[
              { key: 'invoiceNo', header: 'Invoice', render: (r) => <span className="font-medium text-slate-800">{r.invoiceNo}</span> },
              { key: 'createdAt', header: 'Date', render: (r) => formatDate(r.createdAt, true) },
              { key: 'customerName', header: 'Customer', render: (r) => r.customerName || 'Walk-in' },
              { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
              { key: 'grandTotal', header: 'Total', className: 'text-right', render: (r) => <span className="font-semibold">{formatINR(r.grandTotal)}</span> },
            ]}
            rows={(data?.data ?? []) as Sale[]}
            rowKey={(r) => r._id}
            loading={isLoading}
            onRowClick={setSelected}
          />
          <Pagination page={page} pages={data?.pagination?.pages ?? 1} onChange={setPage} />
        </div>
      </Card>

      {selected && (
        <SaleDetail
          sale={selected}
          canReturn={can('pharmacist')}
          onClose={() => setSelected(null)}
          onReturn={() => { setReturning(selected); setSelected(null); }}
        />
      )}
      {returning && <ReturnModal sale={returning} onClose={() => setReturning(null)} />}
    </div>
  );
}

function SaleDetail({ sale, canReturn, onClose, onReturn }: { sale: Sale; canReturn: boolean; onClose: () => void; onReturn: () => void }) {
  return (
    <Modal open onClose={onClose} title={`Invoice ${sale.invoiceNo}`} wide>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <span>{formatDate(sale.createdAt, true)} · {sale.customerName || 'Walk-in'}</span>
        <Badge tone={statusTone(sale.status)}>{sale.status}</Badge>
      </div>
      <DataTable<SaleItem>
        columns={[
          { key: 'name', header: 'Item', render: (r) => <span>{r.name} <span className="text-xs text-slate-400">({r.batchNo})</span></span> },
          { key: 'qty', header: 'Qty', className: 'text-right' },
          { key: 'rate', header: 'Rate', className: 'text-right', render: (r) => formatINR(r.rate) },
          { key: 'gstRate', header: 'GST', className: 'text-right', render: (r) => `${r.gstRate}%` },
          { key: 'lineTotal', header: 'Total', className: 'text-right', render: (r) => formatINR(r.lineTotal) },
        ]}
        rows={sale.items}
        rowKey={(r) => r.batchId}
      />
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Taxable</span><span>{formatINR(sale.subTotal)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">GST</span><span>{formatINR(sale.gstTotal)}</span></div>
        <div className="flex justify-between text-base font-bold"><span>Grand Total</span><span className="text-accent-700">{formatINR(sale.grandTotal)}</span></div>
        {sale.creditAmount > 0 && <div className="flex justify-between text-amber-700"><span>On credit</span><span>{formatINR(sale.creditAmount)}</span></div>}
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {canReturn && sale.status !== 'returned' && <Button variant="outline" onClick={onReturn}><Undo2 className="h-4 w-4" /> Sales Return</Button>}
        <Button
          variant="secondary"
          onClick={() => {
            const win = window.open('', '_blank');
            openAuthedPdf(`/sales/${sale._id}/invoice.pdf`, win).catch((e) => toast.error(apiError(e)));
          }}
        >
          <Printer className="h-4 w-4" /> Print / PDF
        </Button>
      </div>
    </Modal>
  );
}

function ReturnModal({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const qc = useQueryClient();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [mode, setMode] = useState('cash');
  const [reason, setReason] = useState('');

  const submit = useMutation({
    mutationFn: async () => {
      const items = sale.items
        .filter((it) => (qty[it.batchId] ?? 0) > 0)
        .map((it) => ({ medicineId: it.medicineId, batchId: it.batchId, qty: qty[it.batchId] }));
      if (!items.length) throw new Error('Select at least one item and quantity');
      return (await api.post('/sales-returns', { saleId: sale._id, items, refundMode: mode, reason })).data;
    },
    onSuccess: (res) => {
      toast.success(`Return ${res.data.returnNo} created — ${formatINR(res.data.refundTotal)} refunded`);
      qc.invalidateQueries({ queryKey: ['/sales'] });
      onClose();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <Modal open onClose={onClose} title={`Return against ${sale.invoiceNo}`} wide>
      <div className="space-y-2">
        {sale.items.map((it) => (
          <div key={it.batchId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
            <div className="min-w-0"><p className="font-medium text-slate-800">{it.name}</p><p className="text-xs text-slate-400">Batch {it.batchNo} · sold {it.qty}</p></div>
            <Input type="number" min={0} max={it.qty} className="h-10 w-20" value={qty[it.batchId] ?? 0} onChange={(e) => setQty({ ...qty, [it.batchId]: Math.max(0, Math.min(it.qty, Number(e.target.value) || 0)) })} />
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="label-base">Refund mode</label>
          <select className="input-base" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="credit-adjustment">Adjust khata</option>
          </select>
        </div>
        <div>
          <label className="label-base">Reason</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={submit.isPending} onClick={() => submit.mutate()}>Process Return</Button>
      </div>
    </Modal>
  );
}
