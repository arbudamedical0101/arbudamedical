import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiError } from '@/lib/api';
import { Button, Card, Input, Select, Field, Modal, Badge } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/Page';

interface U { id: string; name: string; email: string; role: string; active: boolean }

export default function Users() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<U | null>(null);
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['/auth/users'], queryFn: async () => (await api.get('/auth/users')).data });

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      editing ? (await api.patch(`/auth/users/${editing.id}`, payload)).data : (await api.post('/auth/users', payload)).data,
    onSuccess: () => { toast.success('Saved'); setEditing(null); setCreating(false); qc.invalidateQueries({ queryKey: ['/auth/users'] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div>
      <PageHeader title="Users" subtitle="Staff accounts and roles" actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New User</Button>} />
      <Card className="!p-3">
        <DataTable<U>
          columns={[
            { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
            { key: 'email', header: 'Email' },
            { key: 'role', header: 'Role', render: (r) => <Badge tone={r.role === 'admin' ? 'blue' : r.role === 'pharmacist' ? 'green' : 'neutral'}>{r.role}</Badge> },
            { key: 'active', header: 'Status', render: (r) => r.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Disabled</Badge> },
            { key: '_a', header: '', className: 'text-right', render: (r) => <button onClick={() => setEditing(r)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button> },
          ]}
          rows={(data?.data ?? []) as U[]}
          rowKey={(r) => r.id}
          loading={isLoading}
        />
      </Card>
      {(creating || editing) && <UserForm initial={editing ?? undefined} saving={save.isPending} onClose={() => { setEditing(null); setCreating(false); }} onSubmit={(p) => save.mutate(p)} />}
    </div>
  );
}

function UserForm({ initial, onClose, onSubmit, saving }: { initial?: U; onClose: () => void; onSubmit: (p: Record<string, unknown>) => void; saving: boolean }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initial?.role ?? 'cashier');
  const [active, setActive] = useState(initial?.active ?? true);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = { name, role };
    if (!initial) { payload.email = email; payload.password = password; }
    else { payload.active = active; if (password) payload.password = password; }
    onSubmit(payload);
  };

  return (
    <Modal open onClose={onClose} title={initial ? 'Edit User' : 'New User'}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name"><Input value={name} required onChange={(e) => setName(e.target.value)} /></Field>
        {!initial && <Field label="Email"><Input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} /></Field>}
        <Field label={initial ? 'New password (optional)' : 'Password'}><Input type="password" value={password} required={!initial} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="cashier">Cashier (billing only)</option>
            <option value="pharmacist">Pharmacist (billing + stock + register)</option>
            <option value="admin">Admin (everything)</option>
          </Select>
        </Field>
        {initial && (
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" className="h-5 w-5 rounded border-slate-300 text-accent-600" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
          </label>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
