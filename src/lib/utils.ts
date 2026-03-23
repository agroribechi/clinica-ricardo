import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date?: string | null, fmt = 'dd/MM/yyyy'): string {
  if (!date) return '—'
  try { return format(parseISO(date), fmt, { locale: ptBR }) }
  catch { return '—' }
}

export function formatRelative(date?: string | null): string {
  if (!date) return '—'
  try { return formatDistanceToNow(parseISO(date), { addSuffix: true, locale: ptBR }) }
  catch { return '—' }
}

export function formatCurrency(value?: number | null): string {
  if (value == null) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function normalizePhone(phone?: string | null): string {
  if (!phone) return ''
  return phone.split('@')[0].replace(/\D/g, '')
}

export function phonesMatch(a?: string | null, b?: string | null): boolean {
  const na = normalizePhone(a)
  const nb = normalizePhone(b)
  if (!na || !nb) return false
  // Compara pelos últimos 9 dígitos (DDD + 9 dígitos) para ignorar DDI
  const ta = na.slice(-9)
  const tb = nb.slice(-9)
  return ta === tb || na.endsWith(tb) || nb.endsWith(ta)
}

export function initials(name?: string | null): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
