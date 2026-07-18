import { CrudResource } from '@/components/CrudResource';
import { Badge } from '@/components/ui';
import { useAuth } from '@/lib/auth';

interface Medicine {
  _id: string;
  name: string;
  composition?: string;
  manufacturer?: string;
  schedule: string;
  gstRate: number;
  hsnCode?: string;
  packSize?: string;
  unit: string;
  barcode?: string;
  reorderLevel: number;
  rackLocation?: string;
}

const scheduleTone = (s: string) =>
  s === 'X' ? 'red' : s === 'H1' ? 'amber' : s === 'H' ? 'blue' : 'green';

export default function Medicines() {
  const { can } = useAuth();
  return (
    <CrudResource<Medicine>
      title="Medicines"
      subtitle="Medicine master — schedule, GST, HSN, pack and reorder details"
      endpoint="/medicines"
      canManage={can('pharmacist')}
      canDelete={can('admin')}
      searchPlaceholder="Search by name, composition or barcode…"
      columns={[
        {
          key: 'name',
          header: 'Medicine',
          render: (r) => (
            <div>
              <p className="font-medium text-slate-800">{r.name}</p>
              <p className="text-xs text-slate-400">{r.composition}</p>
            </div>
          ),
        },
        { key: 'manufacturer', header: 'Manufacturer', hideOnMobile: true },
        { key: 'schedule', header: 'Schedule', render: (r) => <Badge tone={scheduleTone(r.schedule)}>{r.schedule}</Badge> },
        { key: 'gstRate', header: 'GST %', render: (r) => `${r.gstRate}%` },
        { key: 'packSize', header: 'Pack', hideOnMobile: true },
        { key: 'rackLocation', header: 'Rack', hideOnMobile: true },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'composition', label: 'Composition / Generic' },
        { name: 'manufacturer', label: 'Manufacturer' },
        { name: 'category', label: 'Category' },
        {
          name: 'schedule',
          label: 'Drug Schedule',
          type: 'select',
          required: true,
          defaultValue: 'OTC',
          options: [
            { value: 'OTC', label: 'OTC (over the counter)' },
            { value: 'H', label: 'Schedule H' },
            { value: 'H1', label: 'Schedule H1' },
            { value: 'X', label: 'Schedule X' },
          ],
        },
        { name: 'hsnCode', label: 'HSN Code' },
        { name: 'gstRate', label: 'GST %', type: 'number', required: true, defaultValue: 12, step: '0.01' },
        { name: 'packSize', label: 'Pack size', hint: 'e.g. 10 tablets' },
        { name: 'unit', label: 'Unit', defaultValue: 'strip' },
        { name: 'barcode', label: 'Barcode' },
        { name: 'reorderLevel', label: 'Reorder level', type: 'number', defaultValue: 10 },
        { name: 'rackLocation', label: 'Rack location' },
      ]}
    />
  );
}
