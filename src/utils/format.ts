import { format } from 'date-fns';

export function formatMoney(value: number | string | null | undefined, language: 'lo' | 'en' = 'lo') {
  const amount = typeof value === 'string' ? Number(value) : value ?? 0;
  return language === 'lo' ? `${new Intl.NumberFormat('lo-LA', { maximumFractionDigits: 0 }).format(amount)} ກີບ` : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LAK', maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'dd/MM/yyyy');
}

export function friendlyError(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'unexpected_error';
}
