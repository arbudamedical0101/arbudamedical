import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, apiError } from '@/lib/api';
import { Button, Card, Input, Field } from '@/components/ui';
import { PageHeader } from '@/components/Page';

export default function Settings() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const { data } = useQuery({ queryKey: ['/settings'], queryFn: async () => (await api.get('/settings')).data.data });

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        storeName: form.storeName, address: form.address, phone: form.phone, email: form.email,
        mapEmbedUrl: form.mapEmbedUrl,
        drugLicenseNo: form.drugLicenseNo, gstin: form.gstin, invoicePrefix: form.invoicePrefix,
        nearExpiryDays: Number(form.nearExpiryDays), defaultGstRate: Number(form.defaultGstRate), footerNote: form.footerNote,
      };
      return (await api.patch('/settings', payload)).data;
    },
    onSuccess: () => { toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['/settings'] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const set = (k: string, v: unknown) => setForm({ ...form, [k]: v });
  const f = (k: string) => String(form[k] ?? '');

  return (
    <div>
      <PageHeader title="Store Settings" subtitle="Appears on invoices and drives numbering & alerts" />
      <Card className="max-w-3xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Store name"><Input value={f('storeName')} onChange={(e) => set('storeName', e.target.value)} /></Field>
          <Field label="Phone"><Input value={f('phone')} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Address"><Input value={f('address')} onChange={(e) => set('address', e.target.value)} /></Field>
          <Field label="Email"><Input value={f('email')} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Drug License No"><Input value={f('drugLicenseNo')} onChange={(e) => set('drugLicenseNo', e.target.value)} /></Field>
          <Field label="GSTIN"><Input value={f('gstin')} onChange={(e) => set('gstin', e.target.value)} /></Field>
          <Field label="Invoice prefix"><Input value={f('invoicePrefix')} onChange={(e) => set('invoicePrefix', e.target.value)} /></Field>
          <Field label="Near-expiry window (days)"><Input type="number" value={f('nearExpiryDays')} onChange={(e) => set('nearExpiryDays', e.target.value)} /></Field>
          <Field label="Default GST %"><Input type="number" value={f('defaultGstRate')} onChange={(e) => set('defaultGstRate', e.target.value)} /></Field>
          <Field label="Invoice footer note"><Input value={f('footerNote')} onChange={(e) => set('footerNote', e.target.value)} /></Field>
          <div className="sm:col-span-2">
            <Field label="Google Maps embed URL (storefront location on landing page)">
              <Input value={f('mapEmbedUrl')} onChange={(e) => set('mapEmbedUrl', e.target.value)} placeholder="https://www.google.com/maps/embed?pb=..." />
            </Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button loading={save.isPending} onClick={() => save.mutate()}>Save Settings</Button>
        </div>
      </Card>
    </div>
  );
}
