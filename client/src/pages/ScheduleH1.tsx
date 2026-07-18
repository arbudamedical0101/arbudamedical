import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet } from 'lucide-react';
import { api, tokenStore } from '@/lib/api';
import { Button, Card, Input, Select, Badge } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { PageHeader, Pagination } from '@/components/Page';
import { formatDate } from '@/lib/utils';

interface H1 { _id: string; date: string; invoiceNo: string; drugName: string; schedule: string; qty: number; batchNo: string; patientName?: string; doctorName?: string }

export default function ScheduleH1() {
  const [filters, setFilters] = useState({ from: '', to: '', schedule: '', search: '' });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['/schedule-h1', { ...filters, page }],
    queryFn: async () => (await api.get('/schedule-h1', { params: { ...filters, page, limit: 20 } })).data,
  });

  // Export goes through fetch to attach the auth header, then downloads the blob.
  const exportFile = async (format: 'excel' | 'pdf') => {
    const params = new URLSearchParams({ ...filters, format });
    const res = await fetch(`/api/schedule-h1/export?${params}`, { headers: { Authorization: `Bearer ${tokenStore.access}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `h1-register.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Schedule H1 Register"
        subtitle="Mandatory register of scheduled (H/H1/X) drugs dispensed"
        actions={
          <>
            <Button variant="outline" onClick={() => exportFile('excel')}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
            <Button variant="outline" onClick={() => exportFile('pdf')}><Download className="h-4 w-4" /> PDF</Button>
          </>
        }
      />
      <Card className="mb-4 !p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <Input type="date" value={filters.from} onChange={(e) => { setFilters({ ...filters, from: e.target.value }); setPage(1); }} />
          <Input type="date" value={filters.to} onChange={(e) => { setFilters({ ...filters, to: e.target.value }); setPage(1); }} />
          <Select value={filters.schedule} onChange={(e) => { setFilters({ ...filters, schedule: e.target.value }); setPage(1); }}>
            <option value="">All schedules</option>
            <option value="H">H</option>
            <option value="H1">H1</option>
            <option value="X">X</option>
          </Select>
          <Input placeholder="Search drug / patient / doctor" value={filters.search} onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }} />
        </div>
      </Card>
      <Card className="!p-3">
        <DataTable<H1>
          columns={[
            { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
            { key: 'invoiceNo', header: 'Invoice' },
            { key: 'drugName', header: 'Drug', render: (r) => <span className="font-medium">{r.drugName}</span> },
            { key: 'schedule', header: 'Sch', render: (r) => <Badge tone={r.schedule === 'X' ? 'red' : 'amber'}>{r.schedule}</Badge> },
            { key: 'qty', header: 'Qty', className: 'text-right' },
            { key: 'patientName', header: 'Patient', render: (r) => r.patientName || '—' },
            { key: 'doctorName', header: 'Doctor', hideOnMobile: true, render: (r) => r.doctorName || '—' },
          ]}
          rows={(data?.data ?? []) as H1[]}
          rowKey={(r) => r._id}
          loading={isLoading}
          empty={<div className="py-8 text-center text-sm text-slate-400">No scheduled-drug sales in this range</div>}
        />
        <Pagination page={page} pages={data?.pagination?.pages ?? 1} onChange={setPage} />
      </Card>
    </div>
  );
}
