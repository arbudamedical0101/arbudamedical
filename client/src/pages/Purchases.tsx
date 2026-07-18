import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { api, apiError } from '@/lib/api';
import { Button, Card, Input, Select, Field, Modal } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { PageHeader, Pagination } from '@/components/Page';
import { formatINR, formatDate } from '@/lib/utils';

interface PLine { medicineId: string; batchNo: string; expiry: string; qty: number; purchaseRate: number; mrp: number; saleRate: number; gstRate: number }
interface Purchase { _id: string; invoiceNo: string; invoiceDate: string; supplierId?: { name: string }; items: PLine[]; grandTotal: number }

const emptyLine = (): PLine => ({ medicineId: '', batchNo: '', expiry: '', qty: 1, purchaseRate: 0, mrp: 0, saleRate: 0, gstRate: 12 });

export default function Purchases() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['/purchases', { page }],
    queryFn: async () => (await api.get('/purchases', { params: { page, limit: 20 } })).data,
  });

  return (
    <div>
      <PageHeader title="Purchases (GRN)" subtitle="Goods received — auto stock-in on save" actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Purchase</Button>} />
      <Card className="!p-3">
        <DataTable<Purchase>
          columns={[
            { key: 'invoiceNo', header: 'Invoice', render: (r) => <span className="font-medium text-slate-800">{r.invoiceNo}</span> },
            { key: 'invoiceDate', header: 'Date', render: (r) => formatDate(r.invoiceDate) },
            { key: 'supplier', header: 'Supplier', render: (r) => r.supplierId?.name ?? '—' },
            { key: 'items', header: 'Lines', render: (r) => r.items.length },
            { key: 'grandTotal', header: 'Total', className: 'text-right', render: (r) => <span className="font-semibold">{formatINR(r.grandTotal)}</span> },
          ]}
          rows={(data?.data ?? []) as Purchase[]}
          rowKey={(r) => r._id}
          loading={isLoading}
        />
        <Pagination page={page} pages={data?.pagination?.pages ?? 1} onChange={setPage} />
      </Card>
      {open && <NewPurchase onClose={() => setOpen(false)} />}
    </div>
  );
}

function NewPurchase({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [lines, setLines] = useState<PLine[]>([emptyLine()]);

  const { data: suppliers } = useQuery({ queryKey: ['/suppliers', 'all'], queryFn: async () => (await api.get('/suppliers', { params: { limit: 200 } })).data });
  const { data: medicines } = useQuery({ queryKey: ['/medicines', 'all'], queryFn: async () => (await api.get('/medicines', { params: { limit: 500 } })).data });

  const setLine = (i: number, patch: Partial<PLine>) => setLines((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const total = lines.reduce((a, l) => a + l.qty * l.purchaseRate * (1 + l.gstRate / 100), 0);

  const save = useMutation({
    mutationFn: async () => {
      const items = lines.filter((l) => l.medicineId && l.batchNo && l.expiry && l.qty > 0);
      if (!items.length) throw new Error('Add at least one complete line item');
      return (await api.post('/purchases', { supplierId, invoiceNo, invoiceDate, items })).data;
    },
    onSuccess: () => { toast.success('Purchase saved — stock updated'); qc.invalidateQueries({ queryKey: ['/purchases'] }); qc.invalidateQueries({ queryKey: ['/batches'] }); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <Modal open onClose={onClose} title="New Purchase (GRN)" wide>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Supplier">
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
            <option value="">Select supplier…</option>
            {suppliers?.data?.map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Invoice No"><Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} required /></Field>
        <Field label="Invoice Date"><Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required /></Field>
      </div>

      <div className="mt-4 space-y-3">
        {lines.map((l, i) => (
          <div key={i} className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Line {i + 1}</span>
              {lines.length > 1 && <button onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))} className="text-red-500"><Trash2 className="h-4 w-4" /></button>}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-4">
                <Select value={l.medicineId} onChange={(e) => { const m = medicines?.data?.find((x: { _id: string }) => x._id === e.target.value); setLine(i, { medicineId: e.target.value, gstRate: m?.gstRate ?? 12 }); }}>
                  <option value="">Select medicine…</option>
                  {medicines?.data?.map((m: { _id: string; name: string }) => <option key={m._id} value={m._id}>{m.name}</option>)}
                </Select>
              </div>
              <Input placeholder="Batch no" value={l.batchNo} onChange={(e) => setLine(i, { batchNo: e.target.value })} />
              <Input type="date" value={l.expiry} onChange={(e) => setLine(i, { expiry: e.target.value })} />
              <Input type="number" placeholder="Qty" value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} />
              <Input type="number" placeholder="GST %" value={l.gstRate} onChange={(e) => setLine(i, { gstRate: Number(e.target.value) })} />
              <Input type="number" step="0.01" placeholder="Purchase rate" value={l.purchaseRate} onChange={(e) => setLine(i, { purchaseRate: Number(e.target.value) })} />
              <Input type="number" step="0.01" placeholder="MRP" value={l.mrp} onChange={(e) => setLine(i, { mrp: Number(e.target.value) })} />
              <Input type="number" step="0.01" placeholder="Sale rate" value={l.saleRate} onChange={(e) => setLine(i, { saleRate: Number(e.target.value) })} />
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={() => setLines((p) => [...p, emptyLine()])}><Plus className="h-4 w-4" /> Add line</Button>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
        <span className="text-lg font-semibold">Total (incl. GST)</span>
        <span className="text-xl font-bold text-accent-700">{formatINR(total)}</span>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={save.isPending} onClick={() => save.mutate()} disabled={!supplierId || !invoiceNo}>Save & Stock-in</Button>
      </div>
    </Modal>
  );
}
