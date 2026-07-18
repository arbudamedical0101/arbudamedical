import { CrudResource } from '@/components/CrudResource';
import { useAuth } from '@/lib/auth';

interface Supplier {
  _id: string;
  name: string;
  gstin?: string;
  contact?: string;
  email?: string;
  address?: string;
}

export default function Suppliers() {
  const { can } = useAuth();
  return (
    <CrudResource<Supplier>
      title="Suppliers"
      subtitle="Distributors you purchase stock from"
      endpoint="/suppliers"
      canManage={can('pharmacist')}
      canDelete={can('admin')}
      searchPlaceholder="Search suppliers…"
      columns={[
        { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
        { key: 'gstin', header: 'GSTIN' },
        { key: 'contact', header: 'Contact' },
        { key: 'email', header: 'Email', hideOnMobile: true },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'gstin', label: 'GSTIN' },
        { name: 'contact', label: 'Contact number' },
        { name: 'email', label: 'Email' },
        { name: 'address', label: 'Address', type: 'textarea' },
      ]}
    />
  );
}
