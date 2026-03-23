'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { normalizePhone, phonesMatch, formatDate } from '@/lib/utils'
import type { WhatsAppMessage, Client, Lead, LeadStage, Conversation } from '@/types/database'
import { MessageSquare, Trash2, User } from 'lucide-react'
import { Suspense } from 'react'

function ConversasContent() {
  const searchParams = useSearchParams()
  const phoneFromUrl = searchParams.get('phone')
  const supabase = createClient()

  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [stages, setStages] = useState<LeadStage[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [filter, setFilter] = useState<'all'|'unread'|'handoff'>('all')
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)

  const load = useCallback(async () => {
    const [m, c, l, s] = await Promise.all([
      supabase.from('whatsapp_messages').select('*').order('sent_date', { ascending: false }).limit(300),
      supabase.from('clients').select('id, display_name, phone'),
      supabase.from('leads').select('id, name, phone, status'),
      supabase.from('lead_stages').select('*').order('order'),
    ])
    setMessages(m.data || []); setClients(c.data || []); setLeads(l.data || []); setStages(s.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Supabase Realtime — só inserts novos
  useEffect(() => {
    const ch = supabase.channel('conversas-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, p => {
        setMessages(prev => [p.new as WhatsAppMessage, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const conversations = useMemo<Conversation[]>(() => {
    const map = new Map<string, Conversation>()
    messages.forEach(msg => {
      const phone = normalizePhone(msg.client_phone)
      if (!phone) return
      const existing = map.get(phone)
      if (!existing) {
        map.set(phone, {
          phone, display_name: msg.client_name || phone,
          last_message_at: msg.sent_date,
          last_message: msg.message || msg.content || '',
          messages: [msg], unread_count: msg.is_read ? 0 : 1,
          is_client: msg.is_client, handoff: msg.handoff,
        })
      } else {
        if (!existing.messages.some(m => m.id === msg.id)) {
          existing.messages.push(msg)
          if (new Date(msg.sent_date) > new Date(existing.last_message_at)) {
            existing.last_message_at = msg.sent_date
            existing.last_message = msg.message || msg.content || ''
          }
        }
        if (!msg.is_read) existing.unread_count++
        if (msg.handoff) existing.handoff = true
      }
    })

    const sorted = Array.from(map.values()).sort((a, b) =>
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    )

    sorted.forEach(conv => {
      const clientMatch = clients.find(c => phonesMatch(c.phone, conv.phone))
      if (clientMatch) { conv.display_name = clientMatch.display_name; conv.client_id = clientMatch.id }

      const leadMatch = leads.find(l => phonesMatch(l.phone, conv.phone))
      if (leadMatch) {
        const stage = stages.find(s => s.name === leadMatch.status)
        if (stage) conv.stage_color = stage.color
      }
    })

    return sorted
  }, [messages, clients, leads, stages])

  const filtered = useMemo(() => {
    if (filter === 'unread') return conversations.filter(c => c.unread_count > 0)
    if (filter === 'handoff') return conversations.filter(c => c.handoff)
    return conversations
  }, [conversations, filter])

  useEffect(() => {
    if (phoneFromUrl && conversations.length > 0) {
      const conv = conversations.find(c => c.phone === phoneFromUrl)
      if (conv) selectConv(conv)
    }
  }, [phoneFromUrl, conversations])

  async function selectConv(conv: Conversation) {
    setSelected(conv)
    const unreadIds = conv.messages.filter(m => !m.is_read).map(m => m.id)
    if (unreadIds.length > 0) {
      await supabase.from('whatsapp_messages').update({ is_read: true }).in('id', unreadIds)
      setMessages(p => p.map(m => unreadIds.includes(m.id) ? { ...m, is_read: true } : m))
    }
  }

  async function deleteConv() {
    if (!deleteTarget) return
    const ids = deleteTarget.messages.map(m => m.id)
    await supabase.from('whatsapp_messages').delete().in('id', ids)
    setMessages(p => p.filter(m => !ids.includes(m.id)))
    if (selected?.phone === deleteTarget.phone) setSelected(null)
    setDeleteTarget(null)
  }

  const fmt = (dt: string) => { try { return new Date(dt).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) } catch { return '' } }

  if (loading) return <div style={{ padding:'2rem', color:'var(--text-muted)' }}>Carregando conversas...</div>

  return (
    <div style={{ display:'flex', height:'100%' }}>
      {/* Lista */}
      <div style={{ width:'300px', minWidth:'300px', borderRight:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column', height:'100%' }}>
        <div style={{ padding:'1.25rem', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:300, color:'#f5f0e8', marginBottom:'0.75rem' }}>Conversas</h2>
          <div style={{ display:'flex', gap:'4px' }}>
            {(['all','unread','handoff'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding:'4px 10px', borderRadius:'4px', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:500, background: filter===f ? 'rgba(201,147,24,0.15)' : 'transparent', color: filter===f ? 'var(--gold-light)' : 'var(--text-muted)', transition:'all 0.15s' }}>
                {f==='all'?'Todas':f==='unread'?'Não lidas':'Handoff'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding:'2rem', textAlign:'center', color:'var(--text-muted)', fontSize:'13px' }}>
              <MessageSquare size={24} style={{ margin:'0 auto 0.5rem', opacity:0.3 }} />
              Nenhuma conversa
            </div>
          ) : filtered.map(conv => (
            <div key={conv.phone} onClick={() => selectConv(conv)}
              style={{ display:'flex', alignItems:'center', gap:'10px', padding:'0.875rem 1rem', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.03)', borderLeft:`3px solid ${conv.stage_color || 'transparent'}`, background: selected?.phone===conv.phone ? 'rgba(201,147,24,0.06)' : 'transparent', transition:'background 0.15s', position:'relative' }}
              onMouseEnter={e => { if (selected?.phone!==conv.phone) e.currentTarget.style.background='rgba(255,255,255,0.02)' }}
              onMouseLeave={e => { if (selected?.phone!==conv.phone) e.currentTarget.style.background='transparent' }}
            >
              <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'rgba(201,147,24,0.1)', border:'1px solid rgba(201,147,24,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:600, color:'var(--gold-light)', flexShrink:0 }}>
                {conv.display_name[0]?.toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:'13px', fontWeight:500, color: conv.unread_count>0?'var(--text-primary)':'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {conv.display_name}
                  </span>
                  <span style={{ fontSize:'10px', color:'var(--text-muted)', flexShrink:0, marginLeft:'4px' }}>{fmt(conv.last_message_at)}</span>
                </div>
                <div style={{ fontSize:'11px', color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:'2px' }}>
                  {conv.last_message || '...'}
                </div>
              </div>
              {conv.unread_count > 0 && (
                <div style={{ width:'18px', height:'18px', borderRadius:'50%', background:'var(--gold)', color:'var(--obsidian)', fontSize:'10px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {conv.unread_count}
                </div>
              )}
              {conv.handoff && <span className="badge badge-gold" style={{ position:'absolute', top:'4px', right:'4px', fontSize:'9px' }}>Handoff</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Mensagens */}
      {selected ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', height:'100%' }}>
          {/* Header */}
          <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'rgba(201,147,24,0.1)', border:'1px solid rgba(201,147,24,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:600, color:'var(--gold-light)' }}>
                {selected.display_name[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:'14px', fontWeight:500, color:'var(--text-primary)' }}>{selected.display_name}</div>
                <div style={{ fontSize:'11px', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{selected.phone}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              {selected.client_id && (
                <a href={`/clientes/${selected.client_id}`} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', borderRadius:'6px', border:'1px solid rgba(201,147,24,0.2)', background:'rgba(201,147,24,0.06)', color:'var(--gold)', fontSize:'12px', textDecoration:'none' }}>
                  <User size={12} />Ver perfil
                </a>
              )}
              <button onClick={() => setDeleteTarget(selected)} style={{ background:'none', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'6px', color:'#f87171', cursor:'pointer', padding:'6px 10px', fontSize:'12px', display:'flex', alignItems:'center', gap:'4px' }}>
                <Trash2 size={12} />Excluir
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <div style={{ flex:1, overflowY:'auto', padding:'1.25rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
            {[...selected.messages].reverse().map(msg => (
              <div key={msg.id} style={{ maxWidth:'75%', alignSelf:'flex-start' }}>
                {msg.content && (
                  <div style={{ padding:'0.625rem 0.875rem', background:'rgba(255,255,255,0.06)', borderRadius:'0 0.75rem 0.75rem 0.75rem', fontSize:'13px', color:'var(--text-primary)', lineHeight:1.5 }}>
                    <div style={{ fontSize:'10px', color:'var(--text-muted)', marginBottom:'3px' }}>Cliente</div>
                    {msg.content}
                  </div>
                )}
                {msg.message && (
                  <div style={{ padding:'0.625rem 0.875rem', background:'rgba(201,147,24,0.08)', border:'1px solid rgba(201,147,24,0.12)', borderRadius:'0.75rem 0 0.75rem 0.75rem', fontSize:'13px', color:'var(--text-primary)', lineHeight:1.5, alignSelf:'flex-end', marginLeft:'auto', maxWidth:'75%', marginTop: msg.content ? '0.5rem' : 0 }}>
                    <div style={{ fontSize:'10px', color:'var(--gold-dim)', marginBottom:'3px' }}>Bella</div>
                    {msg.message}
                  </div>
                )}
                <div style={{ fontSize:'10px', color:'var(--text-muted)', marginTop:'3px', paddingLeft:'2px' }}>{fmt(msg.sent_date)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', flexDirection:'column', gap:'0.75rem' }}>
          <MessageSquare size={32} style={{ opacity:0.2 }} />
          <span style={{ fontSize:'14px' }}>Selecione uma conversa</span>
        </div>
      )}

      {/* Confirm delete */}
      {deleteTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="card" style={{ padding:'1.75rem', maxWidth:'360px', width:'100%' }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.3rem', fontWeight:300, color:'#f5f0e8', marginBottom:'0.75rem' }}>Excluir conversa?</h3>
            <p style={{ fontSize:'13px', color:'var(--text-secondary)', marginBottom:'1.25rem' }}>
              Todas as mensagens com <strong>{deleteTarget.display_name}</strong> serão excluídas permanentemente.
            </p>
            <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
              <button onClick={() => setDeleteTarget(null)} className="btn-ghost">Cancelar</button>
              <button onClick={deleteConv} style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171', padding:'0.5rem 1rem', borderRadius:'0.5rem', cursor:'pointer', fontSize:'13px' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConversasPage() {
  return <Suspense fallback={<div style={{ padding:'2rem', color:'var(--text-muted)' }}>Carregando...</div>}><ConversasContent /></Suspense>
}
