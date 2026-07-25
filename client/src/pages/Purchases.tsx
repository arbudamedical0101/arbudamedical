import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ScanLine } from 'lucide-react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { api, apiError } from '@/lib/api';
import { Button, Card, Input, Select, Field, Modal } from '@/components/ui';
import { Scanner } from '@/components/Scanner';
import { parseGs1 } from '@/lib/gs1';
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

  // Quick-add dialogs so a missing supplier/medicine can be created inline.
  const [addSupplier, setAddSupplier] = useState(false);
  const [addMedFor, setAddMedFor] = useState<number | null>(null);
  const [scanFor, setScanFor] = useState<number | null>(null);

  const handleScan = async (i: number, raw: string) => {
    setScanFor(null);
    const g = parseGs1(raw);
    const patch: Partial<PLine> = {};
    if (g.batch) patch.batchNo = g.batch;
    if (g.expiry) patch.expiry = g.expiry;
    // Try to match a medicine by the scanned code / GTIN (stored as barcode).
    try {
      const { data } = await api.get('/medicines', { params: { search: g.code, limit: 1 } });
      const med = data.data?.[0] as { _id: string; gstRate?: number } | undefined;
      if (med) { patch.medicineId = med._id; patch.gstRate = med.gstRate ?? 12; }
      else toast('Scanned — set the medicine manually (no match for this code)', { icon: 'ℹ️' });
    } catch { /* ignore lookup failure, still fill batch/expiry */ }
    setLine(i, patch);
    if (g.batch || g.expiry) toast.success('Batch / expiry filled from scan');
  };

  const appendToCache = (key: string, item: unknown) =>
    qc.setQueryData([key, 'all'], (old: { data?: unknown[] } | undefined) =>
      old ? { ...old, data: [...(old.data ?? []), item] } : old,
    );

  const handleSupplierCreated = (s: { _id: string; name: string }) => {
    appendToCache('/suppliers', s);
    qc.invalidateQueries({ queryKey: ['/suppliers'] });
    setSupplierId(s._id);
  };
  const handleMedicineCreated = (i: number, m: { _id: string; name: string; gstRate: number }) => {
    appendToCache('/medicines', m);
    qc.invalidateQueries({ queryKey: ['/medicines'] });
    setLine(i, { medicineId: m._id, gstRate: m.gstRate ?? 12 });
  };

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
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                <option value="">Select supplier…</option>
                {suppliers?.data?.map((s: { _id: string; name: string }) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </Select>
            </div>
            <Button type="button" variant="outline" className="shrink-0" title="Add new supplier" onClick={() => setAddSupplier(true)}><Plus className="h-4 w-4" /></Button>
          </div>
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
                <Field label="Medicine">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Select value={l.medicineId} onChange={(e) => { const m = medicines?.data?.find((x: { _id: string }) => x._id === e.target.value); setLine(i, { medicineId: e.target.value, gstRate: m?.gstRate ?? 12 }); }}>
                        <option value="">Select medicine…</option>
                        {medicines?.data?.map((m: { _id: string; name: string }) => <option key={m._id} value={m._id}>{m.name}</option>)}
                      </Select>
                    </div>
                    <Button type="button" variant="outline" className="shrink-0" title="Scan pack barcode / QR" onClick={() => setScanFor(i)}><ScanLine className="h-4 w-4" /></Button>
                    <Button type="button" variant="outline" className="shrink-0" title="Add new medicine" onClick={() => setAddMedFor(i)}><Plus className="h-4 w-4" /> New</Button>
                  </div>
                </Field>
              </div>
              <Field label="Batch No"><Input placeholder="e.g. AB123" value={l.batchNo} onChange={(e) => setLine(i, { batchNo: e.target.value })} /></Field>
              <Field label="Expiry Date"><Input type="date" value={l.expiry} onChange={(e) => setLine(i, { expiry: e.target.value })} /></Field>
              <Field label="Quantity"><Input type="number" placeholder="Qty" value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) })} /></Field>
              <Field label="GST %"><Input type="number" placeholder="GST %" value={l.gstRate} onChange={(e) => setLine(i, { gstRate: Number(e.target.value) })} /></Field>
              <Field label="Purchase Rate (₹)"><Input type="number" step="0.01" placeholder="Cost / unit" value={l.purchaseRate} onChange={(e) => setLine(i, { purchaseRate: Number(e.target.value) })} /></Field>
              <Field label="MRP / Sale Rate (₹)" hint="Sale price = MRP"><Input type="number" step="0.01" placeholder="MRP / unit" value={l.mrp} onChange={(e) => { const v = Number(e.target.value); setLine(i, { mrp: v, saleRate: v }); }} /></Field>
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

      {scanFor !== null && (
        <Scanner title="Scan pack barcode / QR" onDetected={(raw) => handleScan(scanFor, raw)} onClose={() => setScanFor(null)} />
      )}
      {addSupplier && <QuickAddSupplier onClose={() => setAddSupplier(false)} onCreated={handleSupplierCreated} />}
      {addMedFor !== null && (
        <QuickAddMedicine
          onClose={() => setAddMedFor(null)}
          onCreated={(m) => handleMedicineCreated(addMedFor, m)}
        />
      )}
    </Modal>
  );
}

function QuickAddSupplier({ onClose, onCreated }: { onClose: () => void; onCreated: (s: { _id: string; name: string }) => void }) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [gstin, setGstin] = useState('');

  const save = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { name: name.trim() };
      if (contact.trim()) body.contact = contact.trim();
      if (gstin.trim()) body.gstin = gstin.trim();
      return (await api.post('/suppliers', body)).data.data as { _id: string; name: string };
    },
    onSuccess: (s) => { toast.success('Supplier added'); onCreated(s); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <Modal open onClose={onClose} title="Add Supplier">
      <div className="space-y-4">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required /></Field>
        <Field label="Contact number"><Input value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
        <Field label="GSTIN"><Input value={gstin} onChange={(e) => setGstin(e.target.value)} /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} onClick={() => save.mutate()} disabled={!name.trim()}>Add supplier</Button>
        </div>
      </div>
    </Modal>
  );
}

function QuickAddMedicine({ onClose, onCreated }: { onClose: () => void; onCreated: (m: { _id: string; name: string; gstRate: number }) => void }) {
  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState('OTC');
  const [gstRate, setGstRate] = useState('12');
  const [unit, setUnit] = useState('strip');
  const [unitsPerPack, setUnitsPerPack] = useState('1');

  const save = useMutation({
    mutationFn: async () => {
      return (await api.post('/medicines', {
        name: name.trim(),
        schedule,
        gstRate: Number(gstRate) || 0,
        unit: unit.trim() || 'strip',
        unitsPerPack: Math.max(1, Number(unitsPerPack) || 1),
      })).data.data as { _id: string; name: string; gstRate: number };
    },
    onSuccess: (m) => { toast.success('Medicine added'); onCreated(m); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <Modal open onClose={onClose} title="Add Medicine">
      <div className="space-y-4">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Drug Schedule">
            <Select value={schedule} onChange={(e) => setSchedule(e.target.value)}>
              <option value="OTC">OTC (over the counter)</option>
              <option value="H">Schedule H</option>
              <option value="H1">Schedule H1</option>
              <option value="X">Schedule X</option>
            </Select>
          </Field>
          <Field label="GST %"><Input type="number" step="0.01" value={gstRate} onChange={(e) => setGstRate(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit">
            <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="strip">Strip</option>
              <option value="syrup">Syrup</option>
              <option value="piece">Piece</option>
            </Select>
          </Field>
          <Field label="Tablets per strip" hint="For loose sale (e.g. 10)"><Input type="number" min="1" value={unitsPerPack} onChange={(e) => setUnitsPerPack(e.target.value)} /></Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} onClick={() => save.mutate()} disabled={!name.trim()}>Add medicine</Button>
        </div>
      </div>
    </Modal>
  );
}
