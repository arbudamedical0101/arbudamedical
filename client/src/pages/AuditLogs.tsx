import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, Input, Badge } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { PageHeader, Pagination } from '@/components/Page';
import { formatDate } from '@/lib/utils';

interface Log { _id: string; createdAt: string; userName?: string; action: string; entity: string; entityId?: string; meta?: Record<string, unknown> }

export default function AuditLogs() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['/audit-logs', { search, page }],
    queryFn: async () => (await api.get('/audit-logs', { params: { search, page, limit: 30 } })).data,
  });

  return (
    <div>
      <PageHeader title="Audit Trail" subtitle="Sensitive actions — price edits, adjustments, returns, deletes" />
      <Card className="!p-0">
        <div className="border-b border-slate-100 p-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="Filter by action…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <div className="p-3">
          <DataTable<Log>
            columns={[
              { key: 'createdAt', header: 'When', render: (r) => formatDate(r.createdAt, true) },
              { key: 'userName', header: 'User', render: (r) => r.userName || '—' },
              { key: 'action', header: 'Action', render: (r) => <Badge tone="blue">{r.action}</Badge> },
              { key: 'entity', header: 'Entity' },
              { key: 'meta', header: 'Details', hideOnMobile: true, render: (r) => <code className="text-xs text-slate-500">{r.meta ? JSON.stringify(r.meta) : ''}</code> },
            ]}
            rows={(data?.data ?? []) as Log[]}
            rowKey={(r) => r._id}
            loading={isLoading}
          />
          <Pagination page={page} pages={data?.pagination?.pages ?? 1} onChange={setPage} />
        </div>
      </Card>
    </div>
  );
}
