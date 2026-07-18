import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FileImage } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiError } from '@/lib/api';
import { Button, Card, Input, Field, Modal, Select } from '@/components/ui';
import { PageHeader } from '@/components/Page';
import { formatDate } from '@/lib/utils';

interface Rx { _id: string; patientName: string; patientPhone?: string; doctorName?: string; doctorId?: { name: string }; imagePath: string; saleId?: string; createdAt: string }

export default function Prescriptions() {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['/prescriptions'], queryFn: async () => (await api.get('/prescriptions', { params: { limit: 50 } })).data });

  return (
    <div>
      <PageHeader title="Prescriptions" subtitle="Uploaded prescriptions for scheduled-drug sales" actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Upload</Button>} />
      {isLoading ? (
        <Card>Loading…</Card>
      ) : (data?.data?.length ?? 0) === 0 ? (
        <Card><div className="py-10 text-center text-sm text-slate-400"><FileImage className="mx-auto mb-2 h-8 w-8" />No prescriptions uploaded yet</div></Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.data.map((rx: Rx) => (
            <a key={rx._id} href={rx.imagePath} target="_blank" rel="noreferrer" className="card overflow-hidden transition-shadow hover:shadow-md">
              {/\.pdf$/i.test(rx.imagePath) ? (
                <div className="flex h-32 items-center justify-center bg-slate-100 text-slate-400"><FileImage className="h-8 w-8" /></div>
              ) : (
                <img src={rx.imagePath} alt={rx.patientName} className="h-32 w-full object-cover" />
              )}
              <div className="p-3">
                <p className="truncate text-sm font-medium text-slate-800">{rx.patientName}</p>
                <p className="text-xs text-slate-400">{rx.doctorId?.name || rx.doctorName || 'No doctor'}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(rx.createdAt)}</p>
              </div>
            </a>
          ))}
        </div>
      )}
      {open && <UploadModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function UploadModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const { data: doctors } = useQuery({ queryKey: ['/doctors', 'all'], queryFn: async () => (await api.get('/doctors', { params: { limit: 200 } })).data });

  const submit = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Select an image or PDF');
      const fd = new FormData();
      fd.append('image', file);
      fd.append('patientName', patientName);
      if (patientPhone) fd.append('patientPhone', patientPhone);
      if (doctorId) fd.append('doctorId', doctorId);
      return (await api.post('/prescriptions', fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
    },
    onSuccess: () => { toast.success('Prescription uploaded'); qc.invalidateQueries({ queryKey: ['/prescriptions'] }); onClose(); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <Modal open onClose={onClose} title="Upload Prescription">
      <div className="space-y-4">
        <Field label="Patient name"><Input value={patientName} onChange={(e) => setPatientName(e.target.value)} required /></Field>
        <Field label="Patient phone"><Input value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} /></Field>
        <Field label="Doctor">
          <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">Select…</option>
            {doctors?.data?.map((d: { _id: string; name: string }) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Image / PDF" hint="JPG, PNG, WEBP or PDF up to 8 MB">
          <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-accent-50 file:px-3 file:py-2 file:text-accent-700" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={submit.isPending} onClick={() => submit.mutate()} disabled={!patientName || !file}>Upload</Button>
        </div>
      </div>
    </Modal>
  );
}
