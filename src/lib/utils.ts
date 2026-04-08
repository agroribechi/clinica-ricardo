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
  let digits = phone.split('@')[0].replace(/\D/g, '')
  // Remove DDI 55 se o número resultar em 10 ou 11 dígitos (padrão BR)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2)
  }
  return digits
}

export function formatWhatsAppLink(phone?: string | null): string {
  const digits = normalizePhone(phone)
  if (!digits) return ''
  // Garante DDI 55 (Brasil) para os links wa.me
  const withDDI = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${withDDI}`
}

export function formatPhone(phone?: string | null): string {
  const digits = normalizePhone(phone)
  if (!digits) return ''
  
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return digits
}

export function phonesMatch(a?: string | null, b?: string | null): boolean {
  const na = normalizePhone(a)
  const nb = normalizePhone(b)
  if (!na || !nb) return false
  return na === nb
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
