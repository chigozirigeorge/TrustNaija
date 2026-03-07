import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (iso: string | null): string => {
  if (!iso) return 'N/A';
  try { return format(parseISO(iso), 'MMM d, yyyy'); }
  catch { return 'N/A'; }
};

export const formatRelativeDate = (iso: string | null): string => {
  if (!iso) return 'N/A';
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }); }
  catch { return 'N/A'; }
};

export const formatNaira = (kobo: number): string => {
  const naira = kobo / 100;
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(naira);
};

export const maskPhone = (phone: string): string => {
  if (phone.length < 8) return '****';
  return `****${phone.slice(-4)}`;
};

export const truncate = (str: string, n: number): string =>
  str.length > n ? str.slice(0, n) + '…' : str;
