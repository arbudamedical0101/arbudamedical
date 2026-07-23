import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { apiError } from '@/lib/api';
import { Button, Input, Field } from '@/components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-accent-50 to-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-600 text-white shadow-lg">
            <Pill className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Arbuda Medical &amp; General Store</h1>
          <p className="text-sm text-slate-500">Ramseen · Sign in to manage your store</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Button type="submit" className="w-full" loading={loading}>Sign in</Button>

          {/*
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <p className="mb-1 font-medium text-slate-600">Demo accounts</p>
            <p>Admin: admin@pharmacy.local / Admin@123</p>
            <p>Pharmacist: pharmacist@pharmacy.local / Staff@123</p>
            <p>Cashier: cashier@pharmacy.local / Staff@123</p>
          </div>
          */}
        
        </form>
      </div>
    </div>
  );
}
