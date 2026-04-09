import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/utils'

const isValidPhone = (phone: string): boolean => normalizePhone(phone).length >= 8

export async function POST(request: Request) {
  let payload: any
  try { payload = await request.json() }
  catch { return NextResponse.json({ success: false, error: 'JSON inválido.' }, { status: 400 }) }

  const supabase = createServerClient()

  // Sempre loga
  await supabase.from('n8n_logs').insert({ data: payload, is_read: false })

  // n8n envia payload como ARRAY [ {...} ] — normalizamos para objeto
  const item = Array.isArray(payload) ? payload[0] : payload

  // Log completo para debug — REMOVER após confirmar funcionamento
  console.log('[WEBHOOK] payload keys:', Object.keys(item || {}))
  console.log('[WEBHOOK] sender_phone raw:', item?.sender_phone, '| senderPhone:', item?.senderPhone)
  console.log('[WEBHOOK] clientPhone raw:', item?.clientPhone, '| client_phone:', item?.client_phone)

  // Suporta snake_case (n8n padrão) e camelCase
  const clientName = item?.clientName || item?.client_name
  const message    = item?.message
  const content    = item?.content
  const clientPhone  = item?.clientPhone  || item?.client_phone
  const senderPhone  = item?.senderPhone  || item?.sender_phone
  const handoff      = item?.handoff ?? false

  if (!clientPhone || (!content && !message)) {
    return NextResponse.json({ success: true, message: 'Log saved.' })
  }

  const normalizedPhone = normalizePhone(clientPhone)
  const normalizedSender = senderPhone ? normalizePhone(senderPhone) : null
  const isNumericId = normalizedPhone.length > 13

  // 1. Encontrar o dono do número (se houver)
  let ownerId: string | null = null
  if (normalizedSender) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('whatsapp_number', normalizedSender)
      .maybeSingle()
    if (profile) ownerId = profile.id
  }

  // 2. Tenta resolver o telefone real se for um ID numérico longo
  let finalPhone = normalizedPhone
  if (isNumericId) {
    const { data: leadMatch } = await supabase
      .from('leads')
      .select('phone, name')
      .eq('phone', normalizedPhone)
      .limit(1)
      .maybeSingle()
    if (leadMatch) {
      console.log(`Resolved ID ${normalizedPhone} for lead ${leadMatch.name}`)
    }
  }

  // 3. Verifica se é cliente
  const { data: clientMatch } = await supabase
    .from('clients')
    .select('id')
    .or(`phone.eq.${finalPhone},phone.ilike.%${finalPhone.slice(-8)}`)
    .limit(1)
    .maybeSingle()

  // 4. Upsert Lead (Isso garante que o lead seja criado/atualizado com o dono correto)
  if (ownerId) {
    await supabase.from('leads').upsert({
      name: clientName || 'Novo Lead via WhatsApp',
      phone: finalPhone,
      source: 'WhatsApp',
      owner_id: ownerId,
      status: 'Novo Lead',
      updated_at: new Date().toISOString()
    }, { onConflict: 'phone' })
  }

  const { error } = await supabase.from('whatsapp_messages').insert({
    client_name: clientName || 'Desconhecido',
    client_phone: finalPhone,
    sender_phone: normalizedSender,
    content: content || '',
    message: message || '',
    is_read: false,
    is_client: !!clientMatch,
    handoff: handoff || false,
    owner_id: ownerId, 
  })

  if (error) {
    console.error('Webhook error:', error.message)
    return NextResponse.json({ success: false, error: 'Erro ao salvar.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
