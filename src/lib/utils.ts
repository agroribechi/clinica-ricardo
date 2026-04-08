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

export function formatWhatsAppLink(phone?: string | null): string {
  const digits = normalizePhone(phone)
  if (!digits) return ''
  // Garante DDI 55 (Brasil) se o número tiver ≤ 11 dígitos
  const withDDI = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`
  return `https://wa.me/${withDDI}`
}

export function formatPhone(phone?: string | null): string {
  const digits = normalizePhone(phone)
  if (!digits) return ''
  // Remove DDI 55 se presente e resultar em 10 ou 11 dígitos
  const local = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  }
  return digits
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
  return name.split(' ')
    .slice(0, 2)
    .map(w => [...w][0]) // Safe emoji extraction
    .join('')
    .toUpperCase()
}

export function safeFirstChar(name?: string | null): string {
  if (!name) return '?'
  const char = [...name][0]
  return char ? char.toUpperCase() : '?'
}
