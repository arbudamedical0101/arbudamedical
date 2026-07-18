import { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Receipt, Boxes, Pill, Truck, Users2,
  Stethoscope, ClipboardList, FileImage, BarChart3, Settings as SettingsIcon,
  ShieldCheck, UserCog, Menu, X, LogOut, Store,
} from 'lucide-react';
import { useAuth, Role } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[]; // omitted = all roles
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/billing', label: 'Billing (POS)', icon: ShoppingCart },
  { to: '/sales', label: 'Sales', icon: Receipt },
  { to: '/stock', label: 'Stock & Alerts', icon: Boxes, roles: ['pharmacist'] },
  { to: '/medicines', label: 'Medicines', icon: Pill, roles: ['pharmacist'] },
  { to: '/purchases', label: 'Purchases', icon: Truck, roles: ['pharmacist'] },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['pharmacist'] },
  { to: '/customers', label: 'Customers', icon: Users2 },
  { to: '/doctors', label: 'Doctors', icon: Stethoscope, roles: ['pharmacist'] },
  { to: '/h1-register', label: 'H1 Register', icon: ClipboardList, roles: ['pharmacist'] },
  { to: '/prescriptions', label: 'Prescriptions', icon: FileImage },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['pharmacist'] },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, roles: ['admin'] },
  { to: '/users', label: 'Users', icon: UserCog, roles: ['admin'] },
  { to: '/audit', label: 'Audit Trail', icon: ShieldCheck, roles: ['admin'] },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, can } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const items = NAV.filter((n) => !n.roles || can(...n.roles));

  return (
    <div className="min-h-screen lg:flex">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden no-print">
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <span className="truncate font-semibold text-accent-700">Arbuda Medical</span>
        <button onClick={logout} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Logout">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 no-print',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-lg font-bold text-accent-700">Arbuda Medical</p>
            <p className="text-xs text-slate-400">General Store · Ramseen</p>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-slate-100 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent-50 text-accent-700'
                    : 'text-slate-600 hover:bg-slate-100'
                )
              }
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="mb-2 flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            <Store className="h-[18px] w-[18px]" /> View storefront
          </Link>
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium text-slate-700">{user?.name}</p>
            <p className="text-xs capitalize text-slate-400">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-[18px] w-[18px]" /> Sign out
          </button>
        </div>
      </aside>

      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <main key={location.pathname} className="flex-1 animate-fade-in p-4 sm:p-6 lg:max-h-screen lg:overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
