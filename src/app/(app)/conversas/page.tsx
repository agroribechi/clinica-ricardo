'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { normalizePhone, phonesMatch, formatDate, formatCurrency, formatWhatsAppLink } from '@/lib/utils'
import type { WhatsAppMessage, Client, Lead, LeadStage, Conversation, Profile } from '@/types/database'
import { MessageSquare, Trash2, UserPlus, Users, Filter, ExternalLink, Loader2, X, Phone } from 'lucide-react'
import { Suspense } from 'react'

// ─── Painel de ações do contato ───────────────────────────────────────────────
function ContactPanel({
  conv, clients, leads, stages, currentUser, onClose, onRefresh
}: {
  conv: Conversation
  clients: Client[]
  leads: Lead[]
  stages: LeadStage[]
  currentUser: Profile | null
  onClose: () => void
  onRefresh: () => void
}) {
  const supabase = createClient()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'info' | 'add-cliente' | 'add-lead'>('info')
  const [form, setForm] = useState({ name: conv.display_name, email: '', notes: '' })

  // Dados do contato — prioriza client_id já resolvido na conversa
  const client = conv.client_id
    ? clients.find(c => c.id === conv.client_id)
    : clients.find(c => phonesMatch(c.phone, conv.phone))
  const lead = leads.find(l => phonesMatch(l.phone, conv.phone))
  const leadStage = lead ? stages.find(s => s.name === lead.status) : null

  // Status visual do contato
  const status: 'cliente' | 'lead' | 'desconhecido' = client ? 'cliente' : lead ? 'lead' : 'desconhecido'

  async function handleAddCliente(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('clients').insert({
      display_name: form.name,
      phone: conv.phone,
      email: form.email || null,
      notes: form.notes || null,
      photo_url: `https://picsum.photos/seed/${encodeURIComponent(form.name)}/200/200`,
    })
    // Atualiza flag is_client nas mensagens desse número
    await supabase.from('whatsapp_messages')
      .update({ is_client: true })
      .eq('client_phone', conv.phone)
    setSaving(false)
    onRefresh()
    setTab('info')
  }

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const firstStage = stages[0]?.name || 'Novo Lead'
    await supabase.from('leads').insert({
      name: form.name,
      phone: conv.phone,
      email: form.email || null,
      notes: form.notes || null,
      source: 'WhatsApp',
      status: firstStage,
      owner_id: currentUser?.id || null,
      potential_value: 0,
    })
    setSaving(false)
    onRefresh()
    setTab('info')
  }

  const statusColors = {
    cliente: { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', color: '#34d399', label: 'Cliente' },
    lead:    { bg: `${leadStage?.color}18` || 'rgba(96,165,250,0.1)', border: `${leadStage?.color}40` || 'rgba(96,165,250,0.2)', color: leadStage?.color || '#60a5fa', label: `Lead — ${lead?.status}` },
    desconhecido: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', color: '#7a7060', label: 'Desconhecido' },
  }[status]

  const FieldRow = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:'12px' }}>
        <span style={{ color:'#7a7060' }}>{label}</span>
        <span style={{ color:'#c8c0b0' }}>{value}</span>
      </div>
    ) : null

  return (
    <div style={{ width:'290px', minWidth:'290px', borderLeft:'1px solid rgba(201,147,24,0.12)', background:'#0f0f0f', display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header do painel */}
      <div style={{ padding:'1rem', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'9px' }}>
          <div style={{ width:'34px', height:'34px', borderRadius:'50%', background: statusColors.bg, border:`1px solid ${statusColors.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:600, color: statusColors.color, flexShrink:0 }}>
            {conv.display_name[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize:'13px', fontWeight:500, color:'#f0ebe0', lineHeight:1.2 }}>{conv.display_name}</div>
            <div style={{ fontSize:'10px', color:'#7a7060', fontFamily:'DM Mono, monospace', marginTop:'1px' }}>{conv.phone}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#555', cursor:'pointer', padding:'4px' }}><X size={14} /></button>
      </div>

      {/* Badge de status */}
      <div style={{ padding:'10px 1rem', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', padding:'4px 10px', borderRadius:'6px', background: statusColors.bg, border:`1px solid ${statusColors.border}` }}>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background: statusColors.color }} />
          <span style={{ fontSize:'11px', fontWeight:500, color: statusColors.color }}>{statusColors.label}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        {([
          { id:'info', label:'Contato' },
          { id:'add-cliente', label:'+ Cliente' },
          { id:'add-lead', label:'+ Lead' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, padding:'8px 4px', border:'none', background:'transparent', fontSize:'11px', fontWeight:500, color: tab===t.id ? 'var(--gold-light)' : '#7a7060', borderBottom: tab===t.id ? '2px solid var(--gold)' : '2px solid transparent', cursor:'pointer', transition:'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo tabs */}
      <div style={{ flex:1, overflowY:'auto', padding:'1rem' }}>

        {/* Tab: Info */}
        {tab === 'info' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>

            {/* Dados do cliente */}
            {client && (
              <div>
                <div style={{ fontSize:'10px', fontWeight:500, textTransform:'uppercase', letterSpacing:'.07em', color:'#a09080', marginBottom:'6px' }}>Cliente cadastrado</div>
                <div style={{ background:'rgba(52,211,153,0.04)', border:'1px solid rgba(52,211,153,0.12)', borderRadius:'8px', padding:'10px 12px' }}>
                  <FieldRow label="Nome" value={client.display_name} />
                  <FieldRow label="Email" value={client.email} />
                  <FieldRow label="CPF" value={client.cpf} />
                </div>
                <button onClick={() => router.push(`/clientes/${client.id}`)}
                  style={{ marginTop:'8px', width:'100%', padding:'7px', borderRadius:'7px', background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.15)', color:'#34d399', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                  <ExternalLink size={12} />Abrir cadastro completo
                </button>
              </div>
            )}

            {/* Dados do lead */}
            {lead && (
              <div>
                <div style={{ fontSize:'10px', fontWeight:500, textTransform:'uppercase', letterSpacing:'.07em', color:'#a09080', marginBottom:'6px' }}>Lead no funil</div>
                <div style={{ background:`${leadStage?.color}0d`, border:`1px solid ${leadStage?.color}30`, borderRadius:'8px', padding:'10px 12px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'6px' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: leadStage?.color || '#888' }} />
                    <span style={{ fontSize:'12px', fontWeight:500, color: leadStage?.color || '#aaa' }}>{lead.status}</span>
                  </div>
                  <FieldRow label="Valor potencial" value={lead.potential_value ? formatCurrency(lead.potential_value) : null} />
                  <FieldRow label="Origem" value={lead.source} />
                  <FieldRow label="Responsável" value={lead.owner_id ? 'Atribuído' : 'Não atribuído'} />
                </div>
                <button onClick={() => router.push('/leads')}
                  style={{ marginTop:'8px', width:'100%', padding:'7px', borderRadius:'7px', background:`${leadStage?.color}10`, border:`1px solid ${leadStage?.color}30`, color: leadStage?.color || '#888', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
                  <Filter size={12} />Ver no funil — {lead.status}
                </button>
              </div>
            )}

            {/* Nenhum vínculo */}
            {!client && !lead && (
              <div style={{ padding:'1.5rem 0', textAlign:'center' }}>
                <div style={{ fontSize:'28px', marginBottom:'0.75rem', opacity:.15 }}>◈</div>
                <div style={{ fontSize:'13px', color:'#7a7060', marginBottom:'0.5rem' }}>Contato desconhecido</div>
                <div style={{ fontSize:'12px', color:'#555', marginBottom:'1.25rem' }}>Adicione como cliente ou lead para acompanhar no sistema</div>
                <div style={{ display:'flex', gap:'6px', justifyContent:'center' }}>
                  <button onClick={() => setTab('add-cliente')}
                    style={{ padding:'6px 14px', borderRadius:'6px', background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', color:'#34d399', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px' }}>
                    <Users size={12} />Cadastrar
                  </button>
                  <button onClick={() => setTab('add-lead')}
                    style={{ padding:'6px 14px', borderRadius:'6px', background:'rgba(201,147,24,0.08)', border:'1px solid rgba(201,147,24,0.2)', color:'var(--gold)', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px' }}>
                    <Filter size={12} />Funil
                  </button>
                </div>
              </div>
            )}

            {/* Ações extras */}
            <div style={{ marginTop:'0.5rem', display:'flex', flexDirection:'column', gap:'4px' }}>
              {/* Botão WhatsApp — abre app ou WhatsApp Web direto na conversa */}
              {conv.phone && (
                <a
                  href={formatWhatsAppLink(conv.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ padding:'7px 12px', borderRadius:'7px', background:'rgba(37,211,102,0.08)', border:'1px solid rgba(37,211,102,0.2)', color:'#25d366', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'7px', textDecoration:'none' }}
                >
                  <Phone size={13} />Abrir no WhatsApp
                </a>
              )}
              {!client && (
                <button onClick={() => setTab('add-cliente')} style={{ padding:'7px 12px', borderRadius:'7px', background:'rgba(52,211,153,0.05)', border:'1px solid rgba(52,211,153,0.12)', color:'#34d399', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'7px', textAlign:'left' }}>
                  <Users size={13} />Adicionar como cliente
                </button>
              )}
              {!lead && (
                <button onClick={() => setTab('add-lead')} style={{ padding:'7px 12px', borderRadius:'7px', background:'rgba(201,147,24,0.05)', border:'1px solid rgba(201,147,24,0.12)', color:'var(--gold)', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'7px', textAlign:'left' }}>
                  <Filter size={13} />Adicionar ao funil de vendas
                </button>
              )}
            </div>

            {/* Histórico resumido */}
            <div style={{ marginTop:'0.5rem' }}>
              <div style={{ fontSize:'10px', fontWeight:500, textTransform:'uppercase', letterSpacing:'.07em', color:'#a09080', marginBottom:'6px' }}>Histórico</div>
              <FieldRow label="Mensagens" value={String(conv.messages.length)} />
              <FieldRow label="Primeira msg" value={formatDate(conv.messages[conv.messages.length - 1]?.sent_date)} />
              <FieldRow label="Última msg" value={formatDate(conv.last_message_at)} />
              {conv.handoff && <div style={{ marginTop:'6px' }}><span className="badge badge-gold">Aguardando atendimento</span></div>}
            </div>
          </div>
        )}

        {/* Tab: Adicionar Cliente */}
        {tab === 'add-cliente' && (
          <form onSubmit={handleAddCliente} style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
            <div style={{ fontSize:'12px', color:'#9a9080', marginBottom:'4px' }}>
              Cadastra esse contato como cliente na clínica.
            </div>
            {[
              { label:'Nome completo *', id:'name', type:'text' },
              { label:'Email', id:'email', type:'email' },
              { label:'Observações', id:'notes', type:'text' },
            ].map(({ label, id, type }) => (
              <div key={id}>
                <label style={{ display:'block', fontSize:'10px', letterSpacing:'.05em', textTransform:'uppercase', color:'#7a7060', marginBottom:'4px' }}>{label}</label>
                <input type={type} value={(form as any)[id]} onChange={e => setForm(p => ({ ...p, [id]: e.target.value }))} className="input-base" style={{ fontSize:'13px' }} />
              </div>
            ))}
            <div style={{ fontSize:'11px', color:'#555', padding:'8px', background:'rgba(52,211,153,0.04)', border:'1px solid rgba(52,211,153,0.1)', borderRadius:'6px' }}>
              Telefone <strong style={{ color:'#34d399', fontFamily:'DM Mono, monospace' }}>{conv.phone}</strong> será vinculado automaticamente.
            </div>
            <div style={{ display:'flex', gap:'6px', marginTop:'4px' }}>
              <button type="button" onClick={() => setTab('info')} className="btn-ghost" style={{ flex:1, fontSize:'12px', padding:'7px', justifyContent:'center' }}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary" style={{ flex:1, fontSize:'12px', padding:'7px', justifyContent:'center' }}>
                {saving ? <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }} /> : <Users size={13} />}
                {saving ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </form>
        )}

        {/* Tab: Adicionar Lead */}
        {tab === 'add-lead' && (
          <form onSubmit={handleAddLead} style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
            <div style={{ fontSize:'12px', color:'#9a9080', marginBottom:'4px' }}>
              Adiciona ao funil de vendas na primeira etapa.
            </div>
            {[
              { label:'Nome *', id:'name', type:'text' },
              { label:'Email', id:'email', type:'email' },
              { label:'Observações', id:'notes', type:'text' },
            ].map(({ label, id, type }) => (
              <div key={id}>
                <label style={{ display:'block', fontSize:'10px', letterSpacing:'.05em', textTransform:'uppercase', color:'#7a7060', marginBottom:'4px' }}>{label}</label>
                <input type={type} value={(form as any)[id]} onChange={e => setForm(p => ({ ...p, [id]: e.target.value }))} className="input-base" style={{ fontSize:'13px' }} />
              </div>
            ))}
            {stages.length > 0 && (
              <div style={{ fontSize:'11px', color:'#555', padding:'8px', background:`${stages[0].color}0d`, border:`1px solid ${stages[0].color}25`, borderRadius:'6px', display:'flex', alignItems:'center', gap:'6px' }}>
                <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:stages[0].color, flexShrink:0 }} />
                Entrará em <strong style={{ color:stages[0].color }}>{stages[0].name}</strong>
              </div>
            )}
            <div style={{ display:'flex', gap:'6px', marginTop:'4px' }}>
              <button type="button" onClick={() => setTab('info')} className="btn-ghost" style={{ flex:1, fontSize:'12px', padding:'7px', justifyContent:'center' }}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary" style={{ flex:1, fontSize:'12px', padding:'7px', justifyContent:'center' }}>
                {saving ? <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }} /> : <Filter size={13} />}
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
const supabaseClient = createClient()

function ConversasContent() {
  const searchParams = useSearchParams()
  const phoneFromUrl = searchParams.get('phone')
  const supabase = supabaseClient

  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [stages, setStages] = useState<LeadStage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [filter, setFilter] = useState<'all'|'unread'|'handoff'|'clientes'|'leads'|'novos'>('all')
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | 'all'>('all')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Função para scroll instantâneo para o final
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    // 1. Busca perfis primeiro para identificar o usuário
    const { data: profiles } = await supabase.from('profiles').select('*')
    const myProfile = profiles?.find(p => p.id === user.id)
    
    setCurrentUser(myProfile || null)
    setAllProfiles(profiles || [])

    // 2. Prepara a query de mensagens
    let msgQuery = supabase.from('whatsapp_messages').select('*').order('sent_date', { ascending: false }).limit(500)
    
    if (myProfile?.role !== 'admin' && myProfile?.id) {
      // Agente: filtra pelas suas próprias mensagens via owner_id (principal) ou sender_phone (fallback)
      const myPhone = normalizePhone(myProfile.whatsapp_number)
      const orFilter = myPhone
        ? `owner_id.eq.${myProfile.id},sender_phone.eq.${myPhone}`
        : `owner_id.eq.${myProfile.id}`
      msgQuery = msgQuery.or(orFilter)
    } else if (myProfile?.role === 'admin' && selectedAgentId !== 'all') {
      // Admin filtrando por agente específico — busca por owner_id E sender_phone (union)
      const agentProfile = profiles?.find(p => p.id === selectedAgentId)
      if (agentProfile) {
        const agentPhone = normalizePhone(agentProfile.whatsapp_number)
        const orFilter = agentPhone
          ? `owner_id.eq.${agentProfile.id},sender_phone.eq.${agentPhone}`
          : `owner_id.eq.${agentProfile.id}`
        msgQuery = msgQuery.or(orFilter)
      }
    }

    const [m, c, l, s] = await Promise.all([
      msgQuery,
      supabase.from('clients').select('id, display_name, phone, email, cpf'),
      supabase.from('leads').select('id, name, phone, status, source, owner_id, potential_value'),
      supabase.from('lead_stages').select('*').order('order')
    ])

    setMessages(m.data || [])
    setClients(c.data || [])
    setLeads(l.data || [])
    setStages(s.data || [])
    setLoading(false)
  }, [selectedAgentId])

  const currentUserRef = useRef(currentUser)
  const selectedAgentIdRef = useRef(selectedAgentId)
  const allProfilesRef = useRef(allProfiles)

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    currentUserRef.current = currentUser
    selectedAgentIdRef.current = selectedAgentId
    allProfilesRef.current = allProfiles
  }, [currentUser, selectedAgentId, allProfiles])

  useEffect(() => {
    const ch = supabase.channel('conversas-v4', {
      config: {
        broadcast: { self: true }
      }
    })
    console.log('[RT-DEBUG] Canal criado com self-broadcast:', ch)

    if (ch && typeof ch.subscribe === 'function') {
      // 1. Mensagens
      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages' }, p => {
        console.log('[RT-VERBOSE] Chegou no PostgresChanges:', p.eventType)
        const msg = p.new as WhatsAppMessage
        
        const currUser = currentUserRef.current
        const selAgentId = selectedAgentIdRef.current
        const profiles = allProfilesRef.current

        // Se for Admin e estiver em "Todos", não filtra nada
        if (currUser?.role === 'admin' && selAgentId === 'all') {
          console.log('[RT] Admin All - Aceitando mensagem')
        } else {
          if (currUser?.role !== 'admin') {
            const isOwner = msg.owner_id === currUser?.id
            const isSender = currUser?.whatsapp_number && phonesMatch(msg.sender_phone || '', currUser.whatsapp_number)
            if (!isOwner && !isSender) {
              console.log('[RT] Bloqueado por filtro de Agente')
              return
            }
          } else if (selAgentId !== 'all') {
            const agent = profiles.find(ap => ap.id === selAgentId)
            const isOwner = msg.owner_id === selAgentId
            const isAgentNumber = agent?.whatsapp_number && phonesMatch(msg.sender_phone || '', agent.whatsapp_number)
            if (!isOwner && !isAgentNumber) {
              console.log('[RT] Bloqueado por filtro de seleção de Admin')
              return
            }
          }
        }

        if (p.eventType === 'INSERT') {
          setMessages(prev => [msg, ...prev])
        } else if (p.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === msg.id ? msg : m))
        } else if (p.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== (p.old as any).id))
        }
      })

      // 2. Leads (Simplificado logs)
      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, p => {
        console.log('[RT-VERBOSE] Lead alterado:', p.eventType)
        if (p.eventType === 'INSERT') {
          setLeads(prev => [p.new as Lead, ...prev])
        } else if (p.eventType === 'UPDATE') {
          setLeads(prev => prev.map(l => l.id === (p.new as Lead).id ? (p.new as Lead) : l) as Lead[])
        } else if (p.eventType === 'DELETE') {
          setLeads(prev => prev.filter(l => l.id !== (p.old as any).id))
        }
      })

      // 3. Clientes
      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, p => {
        console.log('[RT-VERBOSE] Cliente alterado:', p.eventType)
        if (p.eventType === 'INSERT') {
          setClients(prev => [p.new as Client, ...prev])
        } else if (p.eventType === 'UPDATE') {
          setClients(prev => prev.map(c => c.id === (p.new as Client).id ? (p.new as Client) : c) as Client[])
        } else if (p.eventType === 'DELETE') {
          setClients(prev => prev.filter(c => c.id !== (p.old as any).id))
        }
      })

      // 4. Broadcast
      ch.on('broadcast', { event: 'message_inserted' }, (payload: any) => {
        const msg = (payload && payload.payload) ? payload.payload : payload
        console.log('[RT-VERBOSE] Chegou no Broadcast:', msg.id)
        
        if (!msg || !msg.id) return

        const currUser = currentUserRef.current
        const selAgentId = selectedAgentIdRef.current
        const profiles = allProfilesRef.current

        // Lógica de filtro idêntica para consistência
        if (currUser?.role === 'admin' && selAgentId === 'all') {
             // Passa
        } else if (currUser?.role !== 'admin') {
          const isOwner = msg.owner_id === currUser?.id
          const isSender = currUser?.whatsapp_number && phonesMatch(msg.sender_phone || '', currUser.whatsapp_number)
          if (!isOwner && !isSender) return
        } else if (selAgentId !== 'all') {
          const agent = profiles.find(ap => ap.id === selAgentId)
          const isOwner = msg.owner_id === selAgentId
          const isAgentNumber = agent?.whatsapp_number && phonesMatch(msg.sender_phone || '', agent.whatsapp_number)
          if (!isOwner && !isAgentNumber) return
        }

        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          console.log('[RT] Adicionando nova mensagem via Broadcast na tela')
          return [msg, ...prev]
        })
      })

      ch.subscribe((status) => {
        console.log('[RT] Status da inscrição:', status)
      })
    } else {
      console.error('[RT-ERROR] ch.subscribe não é uma função! Objeto retornado:', ch)
    }
    
    // Injeta ferramenta de autoteste no console
    (window as any).testRT = () => {
      const selId = selectedAgentIdRef.current
      console.log('[RT-TEST] Enviando sinal de teste para Agente:', selId)
      if (!ch) return
      ch.send({
        type: 'broadcast',
        event: 'message_inserted',
        payload: { 
          id: 'test-' + Date.now(), 
          content: 'Teste de conexão Realtime ✅', 
          message: 'Teste de conexão Realtime ✅', 
          is_client: true, 
          client_phone: '12345', 
          sender_phone: '12345',
          owner_id: selId === 'all' ? null : selId,
          sent_date: new Date().toISOString() 
        }
      }).then(() => console.log('[RT-TEST] Sinal enviado.'))
    }

    return () => { 
      (window as any).testRT = undefined
      if (ch) supabase.removeChannel(ch) 
    }
  }, []) // Dependência vazia para nunca fechar a conexão

  // DB already filters when selectedAgentId !== 'all' — no double-filter needed.
  // For 'all', return everything. The DB query is the source of truth.
  const filteredMessages = useMemo(() => messages, [messages])

  const conversations = useMemo<Conversation[]>(() => {
    console.log('[UI-DEBUG] Processando mensagens para a lista:', filteredMessages.length)
    const map = new Map<string, Conversation>()
    
    filteredMessages.forEach(msg => {
      const phone = normalizePhone(msg.client_phone)
      if (!phone) return
      
      const existing = map.get(phone)
      if (!existing) {
        map.set(phone, {
          phone, 
          display_name: msg.client_name || phone,
          last_message_at: msg.sent_date,
          last_message: msg.content || msg.message || '',
          messages: [msg], 
          unread_count: msg.is_read ? 0 : 1,
          is_client: msg.is_client, 
          handoff: msg.handoff,
          sender_phone: msg.sender_phone,
        })
      } else {
        // Evita duplicatas ID ou conteúdo/tempo
        const isDuplicate = existing.messages.some(m => 
          m.id === msg.id || (m.message === msg.message && Math.abs(new Date(m.sent_date).getTime() - new Date(msg.sent_date).getTime()) < 5000)
        )
        
        if (!isDuplicate) {
          // Criamos uma nova versão da conversa para garantir que o React perceba a mudança
          map.set(phone, {
            ...existing,
            messages: [...existing.messages, msg],
            last_message_at: new Date(msg.sent_date) > new Date(existing.last_message_at) ? msg.sent_date : existing.last_message_at,
            last_message: new Date(msg.sent_date) > new Date(existing.last_message_at) ? (msg.content || msg.message || '') : existing.last_message,
            sender_phone: new Date(msg.sent_date) > new Date(existing.last_message_at) ? msg.sender_phone : existing.sender_phone,
            unread_count: !msg.is_read ? existing.unread_count + 1 : existing.unread_count,
            handoff: existing.handoff || msg.handoff
          })
        }
      }
    })

    const sorted = Array.from(map.values()).sort((a, b) =>
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    )

    const enriched = sorted.map(conv => {
      const clientMatch = clients.find(c => phonesMatch(c.phone, conv.phone))
      const leadMatch = leads.find(l => phonesMatch(l.phone, conv.phone))
      const stage = leadMatch ? stages.find(s => s.name === leadMatch.status) : null
      const agentMatch = allProfiles.find(p => p.whatsapp_number && phonesMatch(p.whatsapp_number, conv.sender_phone))
      
      return {
        ...conv,
        display_name: clientMatch?.display_name || conv.display_name,
        client_id: clientMatch?.id,
        stage_color: stage?.color,
        agent_name: agentMatch?.display_name || agentMatch?.full_name || conv.sender_phone,
      }
    })

    console.log('[UI-DEBUG] Total de conversas processadas:', enriched.length)
    return enriched
  }, [filteredMessages, clients, leads, stages, allProfiles, filter])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'unread':   return conversations.filter(c => c.unread_count > 0)
      case 'handoff':  return conversations.filter(c => c.handoff)
      case 'clientes': return conversations.filter(c => clients.some(cl => phonesMatch(cl.phone, c.phone)))
      case 'leads':    return conversations.filter(c => leads.some(l => phonesMatch(l.phone, c.phone)) && !clients.some(cl => phonesMatch(cl.phone, c.phone)))
      case 'novos':    return conversations.filter(c => !clients.some(cl => phonesMatch(cl.phone, c.phone)) && !leads.some(l => phonesMatch(l.phone, c.phone)))
      default:         return conversations
    }
  }, [conversations, filter, clients, leads])

  const selected = useMemo(() => conversations.find(c => c.phone === selectedPhone) || null, [conversations, selectedPhone])

  useEffect(() => {
    if (phoneFromUrl && conversations.length > 0) {
      const conv = conversations.find(c => c.phone === phoneFromUrl)
      if (conv) { selectConv(conv); setShowPanel(true) }
    }
  }, [phoneFromUrl, conversations])

  async function selectConv(conv: Conversation) {
    setSelectedPhone(conv.phone)
    const unreadIds = conv.messages.filter(m => !m.is_read).map(m => m.id)
    if (unreadIds.length > 0) {
      await supabase.from('whatsapp_messages').update({ is_read: true }).in('id', unreadIds)
      setMessages(p => p.map(m => unreadIds.includes(m.id) ? { ...m, is_read: true } : m))
    }
    // Scroll ao selecionar conversa
    setTimeout(scrollToBottom, 50)
  }

  // Auto-scroll quando novas mensagens chegam na conversa selecionada
  useEffect(() => {
    if (selected) {
      scrollToBottom()
    }
  }, [selected?.messages.length, scrollToBottom])

  async function deleteConv() {
    if (!deleteTarget) return
    const ids = deleteTarget.messages.map(m => m.id)
    await supabase.from('whatsapp_messages').delete().in('id', ids)
    setMessages(p => p.filter(m => !ids.includes(m.id)))
    if (selectedPhone === deleteTarget.phone) { setSelectedPhone(null); setShowPanel(false) }
    setDeleteTarget(null)
  }

  // Determina cor do avatar pelo status do contato
  function getAvatarStyle(conv: Conversation) {
    const isClient = clients.some(c => phonesMatch(c.phone, conv.phone))
    const leadMatch = leads.find(l => phonesMatch(l.phone, conv.phone))
    if (isClient) return { bg:'rgba(52,211,153,0.12)', border:'1px solid rgba(52,211,153,0.3)', color:'#34d399' }
    if (leadMatch) {
      const stage = stages.find(s => s.name === leadMatch.status)
      const c = stage?.color || '#60a5fa'
      return { bg:`${c}20`, border:`1px solid ${c}40`, color: c }
    }
    return { bg:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#7a7060' }
  }

  const fmt = (dt: string) => { try { return new Date(dt).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) } catch { return '' } }

  // Contadores para os filtros
  const counts = useMemo(() => ({
    unread:   conversations.filter(c => c.unread_count > 0).length,
    handoff:  conversations.filter(c => c.handoff).length,
    clientes: conversations.filter(c => clients.some(cl => phonesMatch(cl.phone, c.phone))).length,
    leads:    conversations.filter(c => leads.some(l => phonesMatch(l.phone, c.phone)) && !clients.some(cl => phonesMatch(cl.phone, c.phone))).length,
    novos:    conversations.filter(c => !clients.some(cl => phonesMatch(cl.phone, c.phone)) && !leads.some(l => phonesMatch(l.phone, c.phone))).length,
  }), [conversations, clients, leads])

  if (loading) return <div style={{ padding:'2rem', color:'var(--text-muted)' }}>Carregando conversas...</div>

  const FILTERS = [
    { id:'all',      label:'Todas',      count: null },
    { id:'unread',   label:'Não lidas',  count: counts.unread },
    { id:'clientes', label:'Clientes',   count: counts.clientes },
    { id:'leads',    label:'Leads',      count: counts.leads },
    { id:'novos',    label:'Novos',      count: counts.novos },
    { id:'handoff',  label:'Handoff',    count: counts.handoff },
  ] as const

  return (
    <div style={{ display:'flex', height:'100%' }}>

      {/* ── Lista de conversas ── */}
      <div style={{ width:'280px', minWidth:'280px', borderRight:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column', height:'100%' }}>
        <div style={{ padding:'1rem 1rem 0.75rem', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.625rem' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', fontWeight:300, color:'#f0ebe0' }}>Conversas</h2>
            
            {/* Filtro de Agente (Admin Only) */}
            {currentUser?.role === 'admin' && (
              <select 
                value={selectedAgentId}
                onChange={e => setSelectedAgentId(e.target.value)}
                style={{ padding:'4px 8px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', color:'#7a7060', fontSize:'10px', outline:'none', cursor:'pointer', maxWidth:'120px' }}
              >
                <option value="all">Filtro Agente</option>
                {allProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.display_name || p.full_name || 'Sem nome'}</option>
                ))}
              </select>
            )}
          </div>
          {/* Filtros em duas linhas */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:'3px' }}>
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id as any)}
                style={{ padding:'3px 9px', borderRadius:'4px', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:500, display:'flex', alignItems:'center', gap:'4px', background: filter===f.id ? 'rgba(201,147,24,0.15)' : 'transparent', color: filter===f.id ? 'var(--gold-light)' : '#7a7060', transition:'all 0.15s' }}>
                {f.label}
                {f.count != null && f.count > 0 && (
                  <span style={{ background: filter===f.id ? 'var(--gold)' : 'rgba(255,255,255,0.08)', color: filter===f.id ? '#0d0d0d' : '#9a9080', borderRadius:'10px', padding:'0 5px', fontSize:'10px', fontWeight:700 }}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding:'2rem', textAlign:'center', color:'#7a7060', fontSize:'13px' }}>
              <MessageSquare size={24} style={{ margin:'0 auto 0.5rem', opacity:0.2 }} />
              Nenhuma conversa
            </div>
          ) : filtered.map(conv => {
            const av = getAvatarStyle(conv)
            const isSelected = selectedPhone === conv.phone
            return (
              <div key={conv.phone}
                onClick={() => { selectConv(conv); setShowPanel(true) }}
                style={{ display:'flex', alignItems:'center', gap:'9px', padding:'0.75rem 1rem', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.03)', borderLeft:`3px solid ${conv.stage_color || (clients.some(c => phonesMatch(c.phone, conv.phone)) ? '#34d399' : 'transparent')}`, background: isSelected ? 'rgba(201,147,24,0.06)' : 'transparent', transition:'background 0.15s', position:'relative' }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background='rgba(255,255,255,0.02)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background='transparent' }}
              >
                <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:av.bg, border:av.border, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:600, color:av.color, flexShrink:0 }}>
                  {conv.display_name[0]?.toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'4px' }}>
                    <span style={{ fontSize:'13px', fontWeight: conv.unread_count>0 ? 600 : 400, color: conv.unread_count>0 ? '#f0ebe0' : '#c8c0b0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {conv.display_name}
                    </span>
                    <span style={{ fontSize:'10px', color:'#7a7060', flexShrink:0 }}>{fmt(conv.last_message_at)}</span>
                  </div>
                  <div style={{ fontSize:'11px', color:'#7a7060', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:'1px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span>{conv.last_message || '...'}</span>
                    {conv.agent_name && (
                      <span style={{ fontSize:'9px', background:'rgba(255,255,255,0.05)', padding:'1px 5px', borderRadius:'4px', color:'#7a7060', marginLeft:'6px' }}>
                        Para: {conv.agent_name}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'3px', flexShrink:0 }}>
                  {conv.unread_count > 0 && (
                    <div style={{ width:'17px', height:'17px', borderRadius:'50%', background:'var(--gold)', color:'#0d0d0d', fontSize:'10px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {conv.unread_count}
                    </div>
                  )}
                  {conv.handoff && <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#f59e0b' }} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Área de mensagens ── */}
      {selected ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', height:'100%', minWidth:0 }}>
          {/* Header */}
          <div style={{ padding:'0.875rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              {(() => { const av = getAvatarStyle(selected); return (
                <div style={{ width:'34px', height:'34px', borderRadius:'50%', background:av.bg, border:av.border, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:600, color:av.color, flexShrink:0 }}>
                  {selected.display_name[0]?.toUpperCase()}
                </div>
              )})()}
              <div>
                <div style={{ fontSize:'14px', fontWeight:500, color:'#f0ebe0' }}>{selected.display_name}</div>
                <div style={{ fontSize:'10px', color:'#7a7060', fontFamily:'DM Mono, monospace' }}>{selected.phone}</div>
              </div>
              {/* Badge inline do status */}
              {(() => {
                const isClient = clients.some(c => phonesMatch(c.phone, selected.phone))
                const lead = leads.find(l => phonesMatch(l.phone, selected.phone))
                const stage = lead ? stages.find(s => s.name === lead.status) : null
                if (isClient) return <span className="badge badge-green" style={{ fontSize:'10px' }}>Cliente</span>
                if (lead) return <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 8px', borderRadius:'999px', fontSize:'10px', fontWeight:500, background:`${stage?.color}15`, color:stage?.color||'#888', border:`1px solid ${stage?.color}30` }}>{lead.status}</span>
                return <span className="badge badge-gray" style={{ fontSize:'10px' }}>Desconhecido</span>
              })()}
            </div>
            <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
              {/* Botão WhatsApp no header — abre app ou WhatsApp Web direto na conversa */}
              {selected.phone && (
                <a
                  href={formatWhatsAppLink(selected.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir no WhatsApp"
                  style={{ padding:'6px 12px', borderRadius:'6px', border:'1px solid rgba(37,211,102,0.25)', background:'rgba(37,211,102,0.08)', color:'#25d366', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', textDecoration:'none' }}
                >
                  <Phone size={12} />WhatsApp
                </a>
              )}
              <button onClick={() => setShowPanel(p => !p)}
                style={{ padding:'6px 12px', borderRadius:'6px', border:'1px solid rgba(201,147,24,0.2)', background: showPanel ? 'rgba(201,147,24,0.12)' : 'transparent', color:'var(--gold)', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px' }}>
                <UserPlus size={12} />{showPanel ? 'Fechar' : 'Ações'}
              </button>
              <button onClick={() => setDeleteTarget(selected)}
                style={{ background:'none', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'6px', color:'#f87171', cursor:'pointer', padding:'6px 10px', fontSize:'12px', display:'flex', alignItems:'center', gap:'4px' }}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <div 
            ref={scrollRef}
            style={{ flex:1, overflowY:'auto', padding:'1.25rem', display:'flex', flexDirection:'column', gap:'0.875rem' }}
          >
            {[...selected.messages].reverse().map(msg => (
              <div key={msg.id} style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                {/* Mensagem do Cliente (agora em msg.message) */}
                {msg.message && (
                  <div style={{ maxWidth:'72%', alignSelf:'flex-start' }}>
                    <div style={{ fontSize:'10px', color:'#7a7060', marginBottom:'3px', paddingLeft:'2px' }}>Cliente · {fmt(msg.sent_date)}</div>
                    <div style={{ padding:'0.625rem 0.875rem', background:'rgba(255,255,255,0.06)', borderRadius:'0 10px 10px 10px', fontSize:'13px', color:'#f0ebe0', lineHeight:1.5 }}>
                      {msg.message}
                    </div>
                  </div>
                )}
                {/* Resposta da Bella (agora em msg.content) */}
                {msg.content && (
                  <div style={{ maxWidth:'72%', alignSelf:'flex-end' }}>
                    <div style={{ fontSize:'10px', color:'#7d5213', marginBottom:'3px', paddingRight:'2px', textAlign:'right' }}>Bella · {fmt(msg.sent_date)}</div>
                    <div style={{ padding:'0.625rem 0.875rem', background:'rgba(201,147,24,0.08)', border:'1px solid rgba(201,147,24,0.12)', borderRadius:'10px 0 10px 10px', fontSize:'13px', color:'#f0ebe0', lineHeight:1.5 }}>
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#7a7060', flexDirection:'column', gap:'0.75rem' }}>
          <MessageSquare size={32} style={{ opacity:0.15 }} />
          <span style={{ fontSize:'13px' }}>Selecione uma conversa</span>
        </div>
      )}

      {/* ── Painel de ações do contato ── */}
      {selected && showPanel && (
        <ContactPanel
          conv={selected}
          clients={clients}
          leads={leads}
          stages={stages}
          currentUser={currentUser}
          onClose={() => setShowPanel(false)}
          onRefresh={load}
        />
      )}

      {/* Confirm delete */}
      {deleteTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="card" style={{ padding:'1.75rem', maxWidth:'360px', width:'100%' }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.3rem', fontWeight:300, color:'#f0ebe0', marginBottom:'0.75rem' }}>Excluir conversa?</h3>
            <p style={{ fontSize:'13px', color:'#c8c0b0', marginBottom:'1.25rem' }}>
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
  return (
    <Suspense fallback={<div style={{ padding:'2rem', color:'var(--text-muted)' }}>Carregando...</div>}>
      <ConversasContent />
    </Suspense>
  )
}
