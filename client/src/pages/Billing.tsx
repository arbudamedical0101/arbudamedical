import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Trash2, Plus, Minus, X, Save, FilePlus, PauseCircle, Keyboard } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiError, openAuthedPdf } from '@/lib/api';
import { Button, Card, Input, Badge, Modal, Select, Field } from '@/components/ui';
import { priceCart } from '@/lib/billing';
import { formatINR, formatDate, expiryStatus } from '@/lib/utils';

interface CartItem {
  medicineId: string;
  name: string;
  schedule: string;
  batchId: string;
  batchNo: string;
  expiry: string;
  mrp: number;
  saleRate: number;
  gstRate: number;
  qty: number;
  discountPct: number;
  available: number;
}
interface MedResult { _id: string; name: string; composition?: string; schedule: string; barcode?: string }
interface Payment { mode: 'cash' | 'card' | 'upi' | 'credit'; amount: number }

const SCHEDULED = ['H', 'H1', 'X'];

export default function Billing() {
  const qc = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MedResult[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [billDiscount, setBillDiscount] = useState(0);
  const [customer, setCustomer] = useState<{ _id: string; name: string } | null>(null);
  const [patientName, setPatientName] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [showPay, setShowPay] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const printWinRef = useRef<Window | null>(null);

  const totals = priceCart(cart);
  const hasScheduled = cart.some((c) => SCHEDULED.includes(c.schedule));

  const focusSearch = useCallback(() => {
    setTimeout(() => searchRef.current?.focus(), 30);
  }, []);
  useEffect(() => focusSearch(), [focusSearch]);

  // Debounced medicine search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/medicines', { params: { search: query, limit: 8, active: true } });
        setResults(data.data);
        setHighlight(0);
      } catch { /* ignore */ }
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  const addMedicine = async (med: MedResult) => {
    try {
      const { data } = await api.get('/sales/lookup', { params: { medicineId: med._id, qty: 1 } });
      const batch = data.data.batch;
      if (!batch) {
        toast.error(`No sellable (non-expired) stock for ${med.name}`);
        return;
      }
      setCart((prev) => {
        const existing = prev.find((c) => c.batchId === batch._id);
        if (existing) {
          return prev.map((c) => (c.batchId === batch._id ? { ...c, qty: Math.min(c.qty + 1, c.available) } : c));
        }
        return [
          ...prev,
          {
            medicineId: med._id,
            name: data.data.medicine.name,
            schedule: data.data.medicine.schedule,
            batchId: batch._id,
            batchNo: batch.batchNo,
            expiry: batch.expiry,
            mrp: batch.mrp,
            saleRate: batch.saleRate,
            gstRate: data.data.medicine.gstRate,
            qty: 1,
            discountPct: 0,
            available: batch.qtyInStock,
          },
        ];
      });
      toast.success(`${med.name} added`, { duration: 1200 });
      setQuery('');
      setResults([]);
      focusSearch();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const updateQty = (batchId: string, delta: number) =>
    setCart((prev) =>
      prev.map((c) => (c.batchId === batchId ? { ...c, qty: Math.max(1, Math.min(c.available, c.qty + delta)) } : c))
    );
  const setQty = (batchId: string, qty: number) =>
    setCart((prev) => prev.map((c) => (c.batchId === batchId ? { ...c, qty: Math.max(1, Math.min(c.available, qty || 1)) } : c)));
  const setDisc = (batchId: string, d: number) =>
    setCart((prev) => prev.map((c) => (c.batchId === batchId ? { ...c, discountPct: Math.max(0, Math.min(100, d || 0)) } : c)));
  const removeItem = (batchId: string) => setCart((prev) => prev.filter((c) => c.batchId !== batchId));

  const clearBill = useCallback(() => {
    setCart([]);
    setBillDiscount(0);
    setCustomer(null);
    setPatientName('');
    setDoctorId('');
    setQuery('');
    focusSearch();
  }, [focusSearch]);

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[highlight]) addMedicine(results[highlight]); }
    else if (e.key === 'Escape') { setResults([]); }
  };

  // Global F-key shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); if (cart.length) setShowPay(true); }
      else if (e.key === 'F4') { e.preventDefault(); clearBill(); }
      else if (e.key === 'F1') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart.length, clearBill]);

  const save = useMutation({
    mutationFn: async (payments: Payment[]) => {
      const payload = {
        customerId: customer?._id,
        customerName: customer?.name,
        doctorId: doctorId || undefined,
        patientName: patientName || customer?.name,
        billDiscountPct: billDiscount,
        items: cart.map((c) => ({ medicineId: c.medicineId, batchId: c.batchId, qty: c.qty, discountPct: c.discountPct })),
        payments,
      };
      return (await api.post('/sales', payload)).data.data;
    },
    onSuccess: (sale) => {
      toast.success(`Bill ${sale.invoiceNo} saved`);
      setShowPay(false);
      // Open the invoice in the tab we pre-opened on the Confirm click.
      openAuthedPdf(`/sales/${sale._id}/invoice.pdf`, printWinRef.current).catch(() => toast.error('Bill saved, but the invoice PDF could not open'));
      qc.invalidateQueries({ queryKey: ['/dashboard'] });
      clearBill();
    },
    onError: (e) => {
      printWinRef.current?.close();
      toast.error(apiError(e));
    },
  });

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Billing</h1>
          <p className="text-sm text-slate-500">Fast counter billing — keyboard-driven</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setShowShortcuts(true)} className="hidden sm:inline-flex"><Keyboard className="h-4 w-4" /> Shortcuts</Button>
          <Button variant="outline" onClick={clearBill}><FilePlus className="h-4 w-4" /> New <kbd className="ml-1 hidden text-xs sm:inline">F4</kbd></Button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Cart + search */}
        <div className="lg:col-span-2">
          <Card className="!p-0">
            <div className="relative border-b border-slate-100 p-3">
              <Search className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                ref={searchRef}
                className="h-12 pl-11 text-base"
                placeholder="Scan barcode or search medicine, then Enter…  (F1)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKey}
              />
              {results.length > 0 && (
                <div className="absolute left-3 right-3 z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg animate-fade-in">
                  {results.map((r, i) => (
                    <button
                      key={r._id}
                      onClick={() => addMedicine(r)}
                      onMouseEnter={() => setHighlight(i)}
                      className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm ${i === highlight ? 'bg-accent-50' : ''}`}
                    >
                      <span>
                        <span className="font-medium text-slate-800">{r.name}</span>
                        {r.composition && <span className="ml-2 text-xs text-slate-400">{r.composition}</span>}
                      </span>
                      {SCHEDULED.includes(r.schedule) && <Badge tone={r.schedule === 'X' ? 'red' : 'amber'}>{r.schedule}</Badge>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="min-h-[300px] p-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1 py-16 text-center text-slate-400">
                  <Search className="h-8 w-8" />
                  <p className="text-sm">Search and add medicines to start a bill</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((c) => {
                    const st = expiryStatus(c.expiry);
                    const lineTotal = c.saleRate * c.qty * (1 - c.discountPct / 100);
                    return (
                      <div key={c.batchId} className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800">{c.name}{SCHEDULED.includes(c.schedule) && <Badge tone={c.schedule === 'X' ? 'red' : 'amber'} className="ml-2">{c.schedule}</Badge>}</p>
                            <p className="text-xs text-slate-400">
                              Batch {c.batchNo} · Exp{' '}
                              <span className={st === 'near' ? 'text-amber-600' : st === 'expired' ? 'text-red-600' : ''}>{formatDate(c.expiry)}</span>
                              {' '}· MRP {formatINR(c.mrp)} · {c.gstRate}% GST · {c.available} in stock
                            </p>
                          </div>
                          <button onClick={() => removeItem(c.batchId)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <div className="flex items-center rounded-lg border border-slate-200">
                            <button onClick={() => updateQty(c.batchId, -1)} className="px-2.5 py-2 text-slate-600 hover:bg-slate-50"><Minus className="h-4 w-4" /></button>
                            <input
                              type="number"
                              className="w-12 border-x border-slate-200 py-2 text-center text-sm outline-none"
                              value={c.qty}
                              onChange={(e) => setQty(c.batchId, Number(e.target.value))}
                            />
                            <button onClick={() => updateQty(c.batchId, 1)} className="px-2.5 py-2 text-slate-600 hover:bg-slate-50"><Plus className="h-4 w-4" /></button>
                          </div>
                          <label className="flex items-center gap-1 text-xs text-slate-500">
                            Disc%
                            <input type="number" className="w-14 rounded border border-slate-200 px-2 py-1.5 text-sm" value={c.discountPct} onChange={(e) => setDisc(c.batchId, Number(e.target.value))} />
                          </label>
                          <span className="ml-auto font-semibold text-slate-800">{formatINR(lineTotal)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-0">
            <CustomerPicker customer={customer} onSelect={setCustomer} />

            {hasScheduled && (
              <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                ⚠ Scheduled drug in cart — patient & doctor are recorded in the H1 register.
                <div className="mt-2 space-y-2">
                  <Input placeholder="Patient name" value={patientName} onChange={(e) => setPatientName(e.target.value)} className="h-9 bg-white text-sm" />
                  <DoctorSelect value={doctorId} onChange={setDoctorId} />
                </div>
              </div>
            )}

            <div className="my-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <Row label="Taxable" value={formatINR(totals.subTotal)} />
              <Row label="CGST" value={formatINR(totals.gstTotal / 2)} />
              <Row label="SGST" value={formatINR(totals.gstTotal / 2)} />
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Bill discount %</span>
                <input type="number" className="w-20 rounded border border-slate-200 px-2 py-1 text-right text-sm" value={billDiscount} onChange={(e) => setBillDiscount(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
              </div>
              {totals.billDiscountAmount > 0 && <Row label="Discount" value={`- ${formatINR(totals.billDiscountAmount)}`} />}
              {totals.roundOff !== 0 && <Row label="Round off" value={formatINR(totals.roundOff)} />}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-lg font-semibold text-slate-700">Total</span>
              <span className="text-2xl font-bold text-accent-700">{formatINR(totals.grandTotal)}</span>
            </div>

            <Button className="mt-4 h-12 w-full text-base" disabled={!cart.length} onClick={() => setShowPay(true)}>
              <Save className="h-5 w-5" /> Pay & Save <kbd className="ml-1 text-xs opacity-80">F2</kbd>
            </Button>
            <HoldRecall cart={cart} setCart={setCart} />
          </Card>
        </div>
      </div>

      {showPay && (
        <PaymentModal
          total={totals.grandTotal}
          hasCustomer={!!customer}
          saving={save.isPending}
          onClose={() => setShowPay(false)}
          onConfirm={(payments, win) => {
            printWinRef.current = win;
            save.mutate(payments);
          }}
        />
      )}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-slate-500">{label}</span><span className="text-slate-700">{value}</span></div>;
}

function CustomerPicker({ customer, onSelect }: { customer: { _id: string; name: string } | null; onSelect: (c: { _id: string; name: string } | null) => void }) {
  const [q, setQ] = useState('');
  const { data } = useQuery({
    queryKey: ['/customers', { search: q, picker: true }],
    queryFn: async () => (await api.get('/customers', { params: { search: q, limit: 6 } })).data,
    enabled: q.length > 0,
  });
  if (customer) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-accent-50 px-3 py-2">
        <div><p className="text-xs text-slate-500">Customer</p><p className="font-medium text-slate-800">{customer.name}</p></div>
        <button onClick={() => onSelect(null)} className="rounded p-1 text-slate-400 hover:bg-white"><X className="h-4 w-4" /></button>
      </div>
    );
  }
  return (
    <div className="relative">
      <Input placeholder="Walk-in — search customer (optional)" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 text-sm" />
      {q && (data?.data?.length ?? 0) > 0 && (
        <div className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {data.data.map((c: { _id: string; name: string; phone?: string }) => (
            <button key={c._id} onClick={() => { onSelect({ _id: c._id, name: c.name }); setQ(''); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-accent-50">
              {c.name} <span className="text-xs text-slate-400">{c.phone}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DoctorSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data } = useQuery({ queryKey: ['/doctors', 'all'], queryFn: async () => (await api.get('/doctors', { params: { limit: 100 } })).data });
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 bg-white text-sm">
      <option value="">Doctor (optional)</option>
      {data?.data?.map((d: { _id: string; name: string }) => <option key={d._id} value={d._id}>{d.name}</option>)}
    </Select>
  );
}

function PaymentModal({ total, hasCustomer, onClose, onConfirm, saving }: { total: number; hasCustomer: boolean; onClose: () => void; onConfirm: (p: Payment[], win: Window | null) => void; saving: boolean }) {
  const [mode, setMode] = useState<Payment['mode']>('cash');
  const [credit, setCredit] = useState(0);
  const payNow = Math.max(0, total - credit);

  const confirm = () => {
    const payments: Payment[] = [];
    if (payNow > 0) payments.push({ mode, amount: payNow });
    if (credit > 0) payments.push({ mode: 'credit', amount: credit });
    if (!payments.length) payments.push({ mode, amount: total });
    // Pre-open the print tab here (user gesture) so the invoice isn't popup-blocked.
    const win = window.open('', '_blank');
    onConfirm(payments, win);
  };

  return (
    <Modal open onClose={onClose} title="Payment">
      <div className="mb-4 rounded-lg bg-accent-50 p-4 text-center">
        <p className="text-sm text-slate-500">Amount payable</p>
        <p className="text-3xl font-bold text-accent-700">{formatINR(total)}</p>
      </div>
      <div className="space-y-4">
        <Field label="Payment mode">
          <div className="grid grid-cols-3 gap-2">
            {(['cash', 'upi', 'card'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`min-h-[44px] rounded-lg border text-sm font-medium capitalize ${mode === m ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-slate-200'}`}>{m}</button>
            ))}
          </div>
        </Field>
        <Field label="Put on khata (credit)" hint={hasCustomer ? `Paying ${formatINR(payNow)} now by ${mode}` : 'Select a customer to allow credit'}>
          <Input type="number" step="0.01" disabled={!hasCustomer} value={credit} onChange={(e) => setCredit(Math.max(0, Math.min(total, Number(e.target.value) || 0)))} />
        </Field>
        <Button className="h-12 w-full text-base" loading={saving} onClick={confirm}>Confirm & Print Invoice</Button>
      </div>
    </Modal>
  );
}

function HoldRecall({ cart, setCart }: { cart: CartItem[]; setCart: (c: CartItem[]) => void }) {
  const qc = useQueryClient();
  const [showRecall, setShowRecall] = useState(false);
  const { data } = useQuery({ queryKey: ['/sales/held'], queryFn: async () => (await api.get('/sales/held')).data });

  const hold = useMutation({
    mutationFn: async () => (await api.post('/sales/held', { payload: { cart }, label: `${cart.length} items` })).data,
    onSuccess: () => { toast.success('Bill held'); setCart([]); qc.invalidateQueries({ queryKey: ['/sales/held'] }); },
  });
  const del = useMutation({
    mutationFn: async (id: string) => api.delete(`/sales/held/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['/sales/held'] }),
  });

  return (
    <div className="mt-2 flex gap-2">
      <Button variant="outline" className="flex-1" disabled={!cart.length} onClick={() => hold.mutate()}><PauseCircle className="h-4 w-4" /> Hold</Button>
      <Button variant="outline" className="flex-1" onClick={() => setShowRecall(true)}>Recall ({data?.data?.length ?? 0})</Button>
      {showRecall && (
        <Modal open onClose={() => setShowRecall(false)} title="Held bills">
          {(data?.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No held bills</p>
          ) : (
            <div className="space-y-2">
              {data.data.map((h: { _id: string; label: string; payload: { cart: CartItem[] }; createdAt: string }) => (
                <div key={h._id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                  <div><p className="text-sm font-medium">{h.label}</p><p className="text-xs text-slate-400">{formatDate(h.createdAt, true)}</p></div>
                  <div className="flex gap-2">
                    <Button className="min-h-[40px]" onClick={() => { setCart(h.payload.cart); del.mutate(h._id); setShowRecall(false); }}>Recall</Button>
                    <button onClick={() => del.mutate(h._id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const items = [['F1', 'Focus search'], ['Enter', 'Add highlighted medicine'], ['↑ / ↓', 'Navigate results'], ['F2', 'Pay & save bill'], ['F4', 'New / clear bill'], ['Esc', 'Close dropdown / modal']];
  return (
    <Modal open onClose={onClose} title="Keyboard shortcuts">
      <div className="space-y-2">
        {items.map(([k, d]) => (
          <div key={k} className="flex items-center justify-between"><span className="text-sm text-slate-600">{d}</span><kbd className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs">{k}</kbd></div>
        ))}
      </div>
    </Modal>
  );
}
