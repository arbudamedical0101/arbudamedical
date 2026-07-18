import { CrudResource } from '@/components/CrudResource';
import { useAuth } from '@/lib/auth';

interface Doctor {
  _id: string;
  name: string;
  registrationNo?: string;
  contact?: string;
  qualification?: string;
}

export default function Doctors() {
  const { can } = useAuth();
  return (
    <CrudResource<Doctor>
      title="Doctors"
      subtitle="Prescribers referenced on prescriptions and the H1 register"
      endpoint="/doctors"
      canManage={can('pharmacist')}
      canDelete={can('admin')}
      searchPlaceholder="Search doctors…"
      columns={[
        { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
        { key: 'registrationNo', header: 'Reg. No' },
        { key: 'qualification', header: 'Qualification' },
        { key: 'contact', header: 'Contact', hideOnMobile: true },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'registrationNo', label: 'Registration No' },
        { name: 'qualification', label: 'Qualification' },
        { name: 'contact', label: 'Contact number' },
      ]}
    />
  );
}
