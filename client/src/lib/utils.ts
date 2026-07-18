import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import dayjs from 'dayjs';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(n: number | undefined | null): string {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(v);
}

export function formatDate(d?: string | Date | null, withTime = false): string {
  if (!d) return '—';
  return dayjs(d).format(withTime ? 'DD MMM YYYY, HH:mm' : 'DD MMM YYYY');
}

export function expiryStatus(expiry?: string | Date): 'expired' | 'near' | 'ok' {
  if (!expiry) return 'ok';
  const days = dayjs(expiry).diff(dayjs(), 'day');
  if (days < 0) return 'expired';
  if (days <= 90) return 'near';
  return 'ok';
}
