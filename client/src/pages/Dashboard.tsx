import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { IndianRupee, Receipt, PackageX, CalendarClock, AlertTriangle, Wallet, Banknote, Smartphone, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, Badge, Skeleton } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/Page';
import { formatINR, formatDate } from '@/lib/utils';

interface Dash {
  todaySales: number;
  todayBillCount: number;
  paymentSplit: { cash: number; card: number; upi: number; credit: number };
  lowStockCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  outstandingCredit: number;
  nearExpiryDays: number;
  recentSales: { _id: string; invoiceNo: string; grandTotal: number; customerName?: string; createdAt: string }[];
}

function Kpi({ icon: Icon, label, value, tone = 'neutral', to, pulse }: { icon: typeof IndianRupee; label: string; value: string; tone?: 'neutral' | 'amber' | 'red' | 'green'; to?: string; pulse?: boolean }) {
  const toneClass = { neutral: 'text-accent-600 bg-accent-50', amber: 'text-amber-600 bg-amber-50', red: 'text-red-600 bg-red-50', green: 'text-accent-600 bg-accent-50' }[tone];
  const body = (
    <Card className="flex items-center gap-4 transition-shadow hover:shadow-md">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${toneClass} ${pulse ? 'animate-pulse-soft' : ''}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="truncate text-xl font-bold text-slate-800">{value}</p>
      </div>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['/dashboard'],
    queryFn: async () => (await api.get('/dashboard')).data.data as Dash,
  });

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Today at a glance" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Today, ${formatDate(new Date())}`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={IndianRupee} label="Today's Sales" value={formatINR(data.todaySales)} />
        <Kpi icon={Receipt} label="Bills Today" value={String(data.todayBillCount)} />
        <Kpi icon={Wallet} label="Outstanding Credit" value={formatINR(data.outstandingCredit)} tone="amber" to="/customers" />
        <Kpi icon={PackageX} label="Low Stock Items" value={String(data.lowStockCount)} tone={data.lowStockCount ? 'amber' : 'neutral'} to="/stock" pulse={data.lowStockCount > 0} />
        <Kpi icon={CalendarClock} label={`Expiring (${data.nearExpiryDays}d)`} value={String(data.expiringSoonCount)} tone={data.expiringSoonCount ? 'amber' : 'neutral'} to="/stock" pulse={data.expiringSoonCount > 0} />
        <Kpi icon={AlertTriangle} label="Expired In Stock" value={String(data.expiredCount)} tone={data.expiredCount ? 'red' : 'neutral'} to="/stock" pulse={data.expiredCount > 0} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h3 className="mb-4 font-semibold text-slate-800">Today's Collection</h3>
          <div className="space-y-3">
            {[
              { label: 'Cash', value: data.paymentSplit.cash, icon: Banknote },
              { label: 'UPI', value: data.paymentSplit.upi, icon: Smartphone },
              { label: 'Card', value: data.paymentSplit.card, icon: CreditCard },
              { label: 'Credit', value: data.paymentSplit.credit, icon: Wallet },
            ].map((p) => (
              <div key={p.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-600"><p.icon className="h-4 w-4 text-slate-400" /> {p.label}</span>
                <span className="font-medium text-slate-800">{formatINR(p.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-semibold text-slate-800">Recent Bills</h3>
          <DataTable
            columns={[
              { key: 'invoiceNo', header: 'Invoice', render: (r: Dash['recentSales'][0]) => <span className="font-medium">{r.invoiceNo}</span> },
              { key: 'customerName', header: 'Customer', render: (r: Dash['recentSales'][0]) => r.customerName || 'Walk-in' },
              { key: 'createdAt', header: 'Time', render: (r: Dash['recentSales'][0]) => formatDate(r.createdAt, true) },
              { key: 'grandTotal', header: 'Amount', className: 'text-right', render: (r: Dash['recentSales'][0]) => <span className="font-semibold">{formatINR(r.grandTotal)}</span> },
            ]}
            rows={data.recentSales}
            rowKey={(r) => r._id}
            empty={<div className="py-8 text-center text-sm text-slate-400">No bills yet today</div>}
          />
        </Card>
      </div>
    </div>
  );
}
