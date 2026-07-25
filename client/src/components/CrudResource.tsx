import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiError } from '@/lib/api';
import { Button, Card, Input, Select, Textarea, Field, Modal } from './ui';
import { Scanner } from './Scanner';
import { StripOcr } from './StripOcr';
import { parseGs1 } from '@/lib/gs1';
import type { StripFields } from '@/lib/stripParse';
import { DataTable, Column } from './DataTable';
import { PageHeader, Pagination } from './Page';

export interface FormField {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'textarea' | 'checkbox';
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  defaultValue?: unknown;
  step?: string;
  scan?: boolean; // show a camera-scan button that fills this field
}

interface Props<T extends { _id: string }> {
  title: string;
  subtitle?: string;
  endpoint: string;
  columns: Column<T>[];
  fields: FormField[];
  canManage: boolean;
  canDelete?: boolean;
  searchPlaceholder?: string;
  extraActions?: (row: T) => React.ReactNode;
  scanSearch?: boolean; // show a camera-scan button next to the search box
  photoOcr?: boolean; // show "Fill from strip photo" (on-device OCR) in the form
}

export function CrudResource<T extends { _id: string }>({
  title, subtitle, endpoint, columns, fields, canManage, canDelete, searchPlaceholder, extraActions, scanSearch, photoOcr,
}: Props<T>) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<T | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const [scanningSearch, setScanningSearch] = useState(false);

  const key = [endpoint, { search, page }];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => (await api.get(endpoint, { params: { search, page, limit: 20 } })).data,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: [endpoint] });

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (editing) return (await api.patch(`${endpoint}/${editing._id}`, payload)).data;
      return (await api.post(endpoint, payload)).data;
    },
    onSuccess: () => {
      toast.success(editing ? 'Updated' : 'Created');
      setEditing(null);
      setCreating(false);
      invalidate();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const remove = useMutation({
    mutationFn: async ({ id, force }: { id: string; force?: boolean }) =>
      (await api.delete(`${endpoint}/${id}`, { params: force ? { force: true } : {} })).data,
    onSuccess: () => {
      toast.success('Deleted');
      setConfirmId(null);
      setConflictMsg(null);
      invalidate();
    },
    onError: (e) => {
      const err = e as { response?: { status?: number } };
      // 409 = server refused because the record still has stock/links.
      // Keep the dialog open and offer a "delete anyway" (force) action.
      if (err.response?.status === 409) {
        setConflictMsg(apiError(e));
      } else {
        toast.error(apiError(e));
        setConfirmId(null);
      }
    },
  });

  const closeConfirm = () => {
    setConfirmId(null);
    setConflictMsg(null);
  };

  const allColumns: Column<T>[] = [...columns];
  if (canManage) {
    allColumns.push({
      key: '_actions',
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {extraActions?.(row)}
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setEditing(row)} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          {canDelete && (
            <button
              className="rounded-lg p-2 text-red-500 hover:bg-red-50"
              onClick={() => { setConflictMsg(null); setConfirmId(row._id); }}
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    });
  }

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={canManage && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New</Button>}
      />

      <Card className="!p-0">
        <div className="border-b border-slate-100 p-3">
          <div className="flex max-w-md gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder={searchPlaceholder ?? 'Search…'}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            {scanSearch && (
              <Button variant="outline" className="shrink-0" title="Scan barcode / QR" onClick={() => setScanningSearch(true)}>
                <ScanLine className="h-4 w-4" /> <span className="hidden sm:inline">Scan</span>
              </Button>
            )}
          </div>
        </div>
        <div className="p-3">
          <DataTable
            columns={allColumns}
            rows={(data?.data ?? []) as T[]}
            rowKey={(r) => r._id}
            loading={isLoading}
          />
          <Pagination page={page} pages={data?.pagination?.pages ?? 1} onChange={setPage} />
        </div>
      </Card>

      {(creating || editing) && (
        <ResourceForm
          title={editing ? `Edit ${title}` : `New ${title}`}
          fields={fields}
          initial={editing ?? undefined}
          saving={save.isPending}
          photoOcr={photoOcr}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSubmit={(payload) => save.mutate(payload)}
        />
      )}

      {scanningSearch && (
        <Scanner
          title="Scan barcode / QR"
          onDetected={(raw) => { setSearch(parseGs1(raw).code); setPage(1); setScanningSearch(false); }}
          onClose={() => setScanningSearch(false)}
        />
      )}

      {confirmId && (
        <Modal open onClose={closeConfirm} title={conflictMsg ? 'Delete anyway?' : 'Confirm delete'}>
          <p className="text-sm text-slate-600">
            {conflictMsg ?? 'Are you sure you want to delete this record? This action cannot be undone.'}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={closeConfirm}>Cancel</Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => remove.mutate({ id: confirmId, force: Boolean(conflictMsg) })}
            >
              {conflictMsg ? 'Delete anyway' : 'Delete'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ResourceForm({
  title, fields, initial, onClose, onSubmit, saving, photoOcr,
}: {
  title: string;
  fields: FormField[];
  initial?: Record<string, unknown>;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
  saving: boolean;
  photoOcr?: boolean;
}) {
  const [form, setForm] = useState<Record<string, unknown>>(() => {
    const f: Record<string, unknown> = {};
    fields.forEach((fld) => {
      f[fld.name] = initial?.[fld.name] ?? fld.defaultValue ?? (fld.type === 'checkbox' ? false : '');
    });
    return f;
  });
  const [scanField, setScanField] = useState<string | null>(null);
  const [showOcr, setShowOcr] = useState(false);

  // Apply OCR-extracted values to any form field with a matching name.
  const applyOcr = (f: StripFields) => {
    const names = new Set(fields.map((x) => x.name));
    setForm((prev) => {
      const next = { ...prev };
      (Object.keys(f) as (keyof StripFields)[]).forEach((k) => {
        if (names.has(k) && f[k] != null && f[k] !== '') next[k] = f[k];
      });
      return next;
    });
    setShowOcr(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {};
    for (const fld of fields) {
      let v = form[fld.name];
      if (fld.type === 'number') v = v === '' || v === null ? undefined : Number(v);
      if (v === '' ) v = undefined;
      if (v !== undefined) payload[fld.name] = v;
    }
    onSubmit(payload);
  };

  return (
    <Modal open onClose={onClose} title={title} wide>
      {photoOcr && (
        <div className="mb-4">
          <Button type="button" variant="outline" className="w-full" onClick={() => setShowOcr(true)}>
            📷 Fill from strip photo
          </Button>
          <p className="mt-1 text-center text-xs text-slate-400">Reads the strip on your device — check the values before saving.</p>
        </div>
      )}
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((fld) => (
          <div key={fld.name} className={fld.type === 'textarea' ? 'sm:col-span-2' : ''}>
            {fld.type === 'checkbox' ? (
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-slate-300 text-accent-600"
                  checked={Boolean(form[fld.name])}
                  onChange={(e) => setForm({ ...form, [fld.name]: e.target.checked })}
                />
                {fld.label}
              </label>
            ) : (
              <Field label={fld.label} hint={fld.hint}>
                {fld.type === 'select' ? (
                  <Select
                    value={String(form[fld.name] ?? '')}
                    required={fld.required}
                    onChange={(e) => setForm({ ...form, [fld.name]: e.target.value })}
                  >
                    <option value="">Select…</option>
                    {fld.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                ) : fld.type === 'textarea' ? (
                  <Textarea
                    rows={2}
                    value={String(form[fld.name] ?? '')}
                    required={fld.required}
                    onChange={(e) => setForm({ ...form, [fld.name]: e.target.value })}
                  />
                ) : fld.scan ? (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={String(form[fld.name] ?? '')}
                        required={fld.required}
                        onChange={(e) => setForm({ ...form, [fld.name]: e.target.value })}
                      />
                    </div>
                    <Button type="button" variant="outline" className="shrink-0" title="Scan barcode / QR" onClick={() => setScanField(fld.name)}>
                      <ScanLine className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Input
                    type={fld.type === 'number' ? 'number' : 'text'}
                    step={fld.step}
                    value={String(form[fld.name] ?? '')}
                    required={fld.required}
                    onChange={(e) => setForm({ ...form, [fld.name]: e.target.value })}
                  />
                )}
              </Field>
            )}
          </div>
        ))}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Save</Button>
        </div>
      </form>
      {scanField && (
        <Scanner
          title="Scan barcode / QR"
          onDetected={(raw) => { setForm((f) => ({ ...f, [scanField]: parseGs1(raw).code })); setScanField(null); }}
          onClose={() => setScanField(null)}
        />
      )}
      {showOcr && <StripOcr onExtracted={applyOcr} onClose={() => setShowOcr(false)} />}
    </Modal>
  );
}
