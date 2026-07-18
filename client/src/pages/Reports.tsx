import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet } from 'lucide-react';
import dayjs from 'dayjs';
import { api, tokenStore } from '@/lib/api';
import { Button, Card, Input, Select, Loading } from '@/components/ui';
import { PageHeader } from '@/components/Page';

interface ReportDef { key: string; label: string; path: string; needsMedicine?: boolean }
const REPORTS: ReportDef[] = [
  { key: 'sales', label: 'Sales', path: '/reports/sales' },
  { key: 'gst', label: 'GST Summary (GSTR-1)', path: '/reports/gst' },
  { key: 'purchases', label: 'Purchase Register', path: '/reports/purchases' },
  { key: 'profit', label: 'Profit Margin', path: '/reports/profit' },
  { key: 'expiry', label: 'Expiry', path: '/reports/expiry' },
  { key: 'movers', label: 'Fast / Slow Movers', path: '/reports/movers' },
  { key: 'stock-ledger', label: 'Stock Ledger', path: '/reports/stock-ledger', needsMedicine: true },
];

export default function Reports() {
  const [active, setActive] = useState<ReportDef>(REPORTS[0]);
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [medicineId, setMedicineId] = useState('');

  const { data: medicines } = useQuery({ queryKey: ['/medicines', 'all'], queryFn: async () => (await api.get('/medicines', { params: { limit: 500 } })).data });

  const params: Record<string, string> = { from, to };
  if (active.needsMedicine && medicineId) params.medicineId = medicineId;

  const { data, isLoading } = useQuery({
    queryKey: [active.path, params],
    queryFn: async () => (await api.get(active.path, { params: { ...params, format: 'json' } })).data.data,
    enabled: !active.needsMedicine || !!medicineId,
  });

  const exportFile = async (format: 'excel' | 'pdf') => {
    const qp = new URLSearchParams({ ...params, format });
    const res = await fetch(`/api${active.path}?${qp}`, { headers: { Authorization: `Bearer ${tokenStore.access}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${active.key}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Sales, GST, purchases, profit, expiry and movers — exportable"
        actions={
          <>
            <Button variant="outline" onClick={() => exportFile('excel')}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
            <Button variant="outline" onClick={() => exportFile('pdf')}><Download className="h-4 w-4" /> PDF</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <button key={r.key} onClick={() => setActive(r)} className={`rounded-lg px-3 py-2 text-sm font-medium ${active.key === r.key ? 'bg-accent-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>{r.label}</button>
        ))}
      </div>

      <Card className="mb-4 !p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div><label className="label-base">From</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="label-base">To</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          {active.needsMedicine && (
            <div>
              <label className="label-base">Medicine</label>
              <Select value={medicineId} onChange={(e) => setMedicineId(e.target.value)}>
                <option value="">Select medicine…</option>
                {medicines?.data?.map((m: { _id: string; name: string }) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </Select>
            </div>
          )}
        </div>
      </Card>

      <Card className="!p-0">
        {active.needsMedicine && !medicineId ? (
          <div className="py-10 text-center text-sm text-slate-400">Select a medicine to view its stock ledger</div>
        ) : isLoading ? (
          <Loading />
        ) : (
          <ReportTable columns={data?.columns ?? []} rows={data?.rows ?? []} summary={data?.summary} />
        )}
      </Card>
    </div>
  );
}

function ReportTable({ columns, rows, summary }: { columns: { header: string; key: string }[]; rows: Record<string, unknown>[]; summary?: Record<string, unknown> }) {
  return (
    <div>
      {summary && (
        <div className="flex flex-wrap gap-4 border-b border-slate-100 p-4">
          {Object.entries(summary).map(([k, v]) => (
            <div key={k}><p className="text-xs uppercase text-slate-400">{k}</p><p className="text-lg font-bold text-slate-800">{String(v)}</p></div>
          ))}
        </div>
      )}
      <div className="overflow-x-auto p-3">
        {rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">No data for this period</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                {columns.map((c) => <th key={c.key} className="whitespace-nowrap px-3 py-2 font-semibold">{c.header}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {columns.map((c) => <td key={c.key} className="whitespace-nowrap px-3 py-2 text-slate-700">{String(row[c.key] ?? '')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
