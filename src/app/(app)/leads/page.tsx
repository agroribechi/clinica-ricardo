'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Lead, LeadStage } from '@/types/database'
import { Plus, ChevronLeft, ChevronRight, Settings, X, Loader2, Trash2, Search } from 'lucide-react'

const STAGE_COLORS = ['#888','#3b82f6','#f59e0b','#8b5cf6','#10b981','#ef4444','#ec4899','#06b6d4']

export default function LeadsPage() {
  const supabase = createClient()
  const [leads, setLeads] = useState<Lead[]>([])
  const [stages, setStages] = useState<LeadStage[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [showStageForm, setShowStageForm] = useState(false)
  const [newLead, setNewLead] = useState({ name:'', phone:'', email:'', source:'WhatsApp', potential_value:'', notes:'' })
  const [newStage, setNewStage] = useState({ name:'', color: STAGE_COLORS[0] })
  const [saving, setSaving] = useState(false)
  const [moving, setMoving] = useState<string | null>(null)
  const [editingStage, setEditingStage] = useState<{ id: string; name: string } | null>(null)
  const [search, setSearch] = useState('')

  // Filtra leads pelo termo de busca (nome ou telefone)
  const searchTerm = search.trim().toLowerCase()
  const filteredLeads = searchTerm
    ? leads.filter(l =>
        l.name.toLowerCase().includes(searchTerm) ||
        (l.phone || '').replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))
      )
    : leads

  async function handleRenameStage(stage: { id: string; name: string }) {
    const trimmed = stage.name.trim()
    if (!trimmed) { setEditingStage(null); return }
    const original = stages.find(s => s.id === stage.id)
    if (!original || trimmed === original.name) { setEditingStage(null); return }
    // Atualiza etapa e status dos leads que estavam nela
    await Promise.all([
      supabase.from('lead_stages').update({ name: trimmed }).eq('id', stage.id),
      supabase.from('leads').update({ status: trimmed }).eq('status', original.name),
    ])
    setStages(p => p.map(s => s.id === stage.id ? { ...s, name: trimmed } : s))
    setLeads(p => p.map(l => l.status === original.name ? { ...l, status: trimmed } : l))
    if (selected?.status === original.name) setSelected(p => p ? { ...p, status: trimmed } : p)
    setEditingStage(null)
  }

  const load = useCallback(async () => {
    const [{ data: l }, { data: s }] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('lead_stages').select('*').order('order'),
    ])
    setLeads(l || [])
    setStages(s || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleMoveLead(lead: Lead, direction: 'prev' | 'next') {
    const currentIdx = stages.findIndex(s => s.name === lead.status)
    const targetIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1
    if (targetIdx < 0 || targetIdx >= stages.length) return
    const targetStatus = stages[targetIdx].name
    setMoving(lead.id)
    await supabase.from('leads').update({ status: targetStatus, updated_at: new Date().toISOString() }).eq('id', lead.id)
    setLeads(p => p.map(l => l.id === lead.id ? { ...l, status: targetStatus } : l))
    if (selected?.id === lead.id) setSelected(p => p ? { ...p, status: targetStatus } : p)
    setMoving(null)
  }

  async function handleDeleteLead(id: string) {
    if (!confirm('Excluir este lead?')) return
    await supabase.from('leads').delete().eq('id', id)
    setLeads(p => p.filter(l => l.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  async function handleDeleteStage(stage: LeadStage) {
    const hasLeads = leads.some(l => l.status === stage.name)
    if (hasLeads) { alert(`Mova ou exclua os leads da etapa "${stage.name}" antes de removê-la.`); return }
    if (!confirm(`Excluir a etapa "${stage.name}"?`)) return
    await supabase.from('lead_stages').delete().eq('id', stage.id)
    setStages(p => p.filter(s => s.id !== stage.id))
  }

  async function handleSaveLead(e: React.FormEvent) {
    e.preventDefault()
    if (!newLead.name.trim()) return
    if (stages.length === 0) { alert('Crie pelo menos uma etapa antes de adicionar leads.'); return }
    setSaving(true)
    await supabase.from('leads').insert({
      name: newLead.name,
      phone: newLead.phone || null,
      email: newLead.email || null,
      source: newLead.source,
      potential_value: parseFloat(newLead.potential_value) || 0,
      notes: newLead.notes || null,
      status: stages[0].name,
      owner: 'Não atribuído',
    })
    setNewLead({ name:'', phone:'', email:'', source:'WhatsApp', potential_value:'', notes:'' })
    setShowLeadForm(false)
    setSaving(false)
    load()
  }

  async function handleSaveStage(e: React.FormEvent) {
    e.preventDefault()
    if (!newStage.name.trim()) return
    setSaving(true)
    const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order)) + 1 : 0
    await supabase.from('lead_stages').insert({ name: newStage.name, color: newStage.color, order: maxOrder })
    setNewStage({ name:'', color: STAGE_COLORS[0] })
    setShowStageForm(false)
    setSaving(false)
    load()
  }

  const stageLeads = (stageName: string) => filteredLeads.filter(l => l.status === stageName)
  const stageIdx = (stageName: string) => stages.findIndex(s => s.name === stageName)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#888' }}>
      <Loader2 size={20} style={{ animation:'spin 1s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ padding:'1.5rem 2rem', height:'100%', display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'1.5rem', flexShrink:0 }}>
        <div>
          <h1 style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'2.2rem', fontWeight:300, color:'#f5f0e8' }}>Funil de Vendas</h1>
          <div style={{ height:'1px', marginTop:'0.5rem', width:'120px', background:'linear-gradient(90deg, rgba(201,147,24,0.4), transparent)' }} />
        </div>
        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
          {/* Campo de busca */}
          <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
            <Search size={13} style={{ position:'absolute', left:'9px', color:'#666', pointerEvents:'none' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              style={{ paddingLeft:'30px', paddingRight: search ? '28px' : '10px', paddingTop:'6px', paddingBottom:'6px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'7px', color:'#d0c8bc', fontSize:'12px', width:'220px', outline:'none', fontFamily:'var(--font-body)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,147,24,0.35)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position:'absolute', right:'7px', background:'none', border:'none', color:'#666', cursor:'pointer', padding:0, display:'flex', alignItems:'center' }}>
                <X size={11} />
              </button>
            )}
          </div>
          {searchTerm && (
            <span style={{ fontSize:'11px', color:'#888', whiteSpace:'nowrap' }}>
              {filteredLeads.length} resultado{filteredLeads.length !== 1 ? 's' : ''}
            </span>
          )}
          <button onClick={() => setShowStageForm(true)} className="btn-ghost" style={{ fontSize:'12px', gap:'5px' }}>
            <Settings size={13} />Nova Etapa
          </button>
          <button onClick={() => setShowLeadForm(true)} className="btn-primary" style={{ gap:'5px' }}>
            <Plus size={14} />Novo Lead
          </button>
        </div>
      </div>

      {/* Estado vazio */}
      {stages.length === 0 && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem' }}>
          <div style={{ textAlign:'center', color:'#888' }}>
            <div style={{ fontSize:'32px', marginBottom:'0.75rem', opacity:.3 }}>◈</div>
            <div style={{ fontSize:'14px', color:'#999', marginBottom:'0.5rem' }}>Nenhuma etapa criada ainda</div>
            <div style={{ fontSize:'12px', color:'#aaa', marginBottom:'1.5rem' }}>Crie etapas para organizar seus leads no funil</div>
            <button onClick={() => setShowStageForm(true)} className="btn-primary">
              <Plus size={14} />Criar primeira etapa
            </button>
          </div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center', marginTop:'1rem' }}>
            {['Novo Lead','Contato Feito','Interesse Confirmado','Proposta Enviada','Convertido'].map((sugestao, i) => (
              <button key={sugestao} onClick={async () => {
                await supabase.from('lead_stages').insert({ name: sugestao, color: STAGE_COLORS[i % STAGE_COLORS.length], order: i })
                load()
              }} style={{ padding:'5px 14px', borderRadius:'6px', background:'rgba(201,147,24,0.06)', border:'1px solid rgba(201,147,24,0.15)', color:'#888', fontSize:'12px', cursor:'pointer' }}>
                + {sugestao}
              </button>
            ))}
          </div>
          <div style={{ fontSize:'11px', color:'#aaa', marginTop:'0.5rem' }}>ou clique nas sugestões acima</div>
        </div>
      )}

      {/* Kanban */}
      {stages.length > 0 && (
        <div style={{ display:'flex', gap:'10px', overflowX:'auto', flex:1, paddingBottom:'0.5rem', alignItems:'flex-start' }}>
          {stages.map((stage, si) => {
            const sl = stageLeads(stage.name)
            return (
              <div key={stage.id} style={{ minWidth:'200px', maxWidth:'200px', display:'flex', flexDirection:'column', gap:'6px' }}>

                {/* Cabeçalho da etapa */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 4px', gap:'4px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'7px', flex:1, minWidth:0 }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:stage.color, flexShrink:0 }} />
                    {editingStage?.id === stage.id ? (
                      <input
                        value={editingStage.name}
                        onChange={e => setEditingStage({ ...editingStage, name: e.target.value })}
                        onBlur={() => handleRenameStage(editingStage)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameStage(editingStage)
                          if (e.key === 'Escape') setEditingStage(null)
                        }}
                        autoFocus
                        style={{ fontSize:'11px', fontWeight:500, background:'rgba(201,147,24,0.08)', border:'1px solid rgba(201,147,24,0.3)', borderRadius:'4px', color:'#f0ebe0', padding:'2px 6px', width:'100%', outline:'none', fontFamily:'var(--font-body)' }}
                      />
                    ) : (
                      <span
                        onClick={() => setEditingStage({ id: stage.id, name: stage.name })}
                        title="Clique para renomear"
                        style={{ fontSize:'12px', fontWeight:500, textTransform:'uppercase', letterSpacing:'.06em', color:'#aaa', cursor:'text', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {stage.name}
                      </span>
                    )}
                    <span style={{ fontSize:'10px', color:'#888', background:'rgba(255,255,255,0.04)', padding:'1px 6px', borderRadius:'10px', flexShrink:0 }}>{sl.length}</span>
                  </div>
                  <button onClick={() => handleDeleteStage(stage)} style={{ background:'none', border:'none', color:'#555', cursor:'pointer', padding:'2px', borderRadius:'4px', display:'flex', alignItems:'center', flexShrink:0 }}>
                    <X size={11} />
                  </button>
                </div>

                {/* Cards dos leads */}
                <div style={{ display:'flex', flexDirection:'column', gap:'6px', minHeight:'40px' }}>
                  {sl.map(lead => {
                    const idx = stageIdx(lead.status)
                    return (
                      <div key={lead.id}
                        style={{ background:'#141414', border:'1px solid rgba(255,255,255,0.06)', borderLeft:`2px solid ${stage.color}`, borderRadius:'8px', padding:'10px 10px 8px', cursor:'pointer', transition:'border-color .15s' }}
                        onClick={() => setSelected(lead)}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = `rgba(201,147,24,0.25)`)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)')}
                      >
                        <div style={{ fontSize:'12px', fontWeight:500, color:'#d0c8bc', marginBottom:'3px', lineHeight:1.3 }}>{lead.name}</div>
                        {lead.phone && <div style={{ fontSize:'10px', color:'#888', fontFamily:'DM Mono, monospace' }}>{lead.phone}</div>}
                        {lead.potential_value ? <div style={{ fontSize:'11px', color:'#c99318', marginTop:'5px' }}>{formatCurrency(lead.potential_value)}</div> : null}

                        {/* Setas de movimentação */}
                        <div style={{ display:'flex', gap:'4px', marginTop:'8px', justifyContent:'space-between', alignItems:'center' }}>
                          <div style={{ display:'flex', gap:'3px' }}>
                            <button
                              onClick={e => { e.stopPropagation(); handleMoveLead(lead, 'prev') }}
                              disabled={idx === 0 || moving === lead.id}
                              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'4px', color: idx === 0 ? '#2a2a2a' : '#666', cursor: idx === 0 ? 'not-allowed' : 'pointer', padding:'2px 5px', display:'flex', alignItems:'center', transition:'all .15s' }}
                              onMouseEnter={e => { if (idx > 0) (e.currentTarget as HTMLElement).style.background = 'rgba(201,147,24,0.1)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                              title={idx > 0 ? `Mover para: ${stages[idx-1]?.name}` : ''}
                            >
                              <ChevronLeft size={11} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleMoveLead(lead, 'next') }}
                              disabled={idx === stages.length - 1 || moving === lead.id}
                              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'4px', color: idx === stages.length - 1 ? '#2a2a2a' : '#666', cursor: idx === stages.length - 1 ? 'not-allowed' : 'pointer', padding:'2px 5px', display:'flex', alignItems:'center', transition:'all .15s' }}
                              onMouseEnter={e => { if (idx < stages.length - 1) (e.currentTarget as HTMLElement).style.background = 'rgba(201,147,24,0.1)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                              title={idx < stages.length - 1 ? `Mover para: ${stages[idx+1]?.name}` : ''}
                            >
                              <ChevronRight size={11} />
                            </button>
                          </div>
                          {moving === lead.id && <Loader2 size={10} style={{ color:'#c99318', animation:'spin 1s linear infinite' }} />}
                          <button
                            onClick={e => { e.stopPropagation(); handleDeleteLead(lead.id) }}
                            style={{ background:'none', border:'none', color:'#2a2a2a', cursor:'pointer', padding:'2px', display:'flex', alignItems:'center', borderRadius:'4px' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#2a2a2a' }}
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Botão adicionar etapa inline */}
          <div style={{ minWidth:'160px' }}>
            <button onClick={() => setShowStageForm(true)}
              style={{ width:'100%', padding:'8px 12px', borderRadius:'8px', border:'1px dashed rgba(201,147,24,0.2)', background:'transparent', color:'#888', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', transition:'all .15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,147,24,0.4)'; (e.currentTarget as HTMLElement).style.color = '#888' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,147,24,0.2)'; (e.currentTarget as HTMLElement).style.color = '#444' }}
            >
              <Plus size={12} />Nova etapa
            </button>
          </div>
        </div>
      )}

      {/* Painel lateral do lead selecionado */}
      {selected && (
        <div style={{ position:'fixed', right:0, top:0, bottom:0, width:'300px', background:'#141414', borderLeft:'1px solid rgba(201,147,24,0.15)', padding:'1.5rem', zIndex:40, overflowY:'auto' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
            <h2 style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'1.4rem', fontWeight:300, color:'#f5f0e8', lineHeight:1.2 }}>{selected.name}</h2>
            <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:'20px', lineHeight:1 }}>×</button>
          </div>

          {/* Etapa atual */}
          <div style={{ marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'12px', letterSpacing:'.06em', textTransform:'uppercase', color:'#888', marginBottom:'8px' }}>Etapa atual</div>
            <div style={{ display:'flex', alignItems:'center', gap:'7px', padding:'8px 12px', background:'rgba(201,147,24,0.06)', border:'1px solid rgba(201,147,24,0.15)', borderRadius:'7px' }}>
              <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: stages.find(s => s.name === selected.status)?.color || '#888' }} />
              <span style={{ fontSize:'13px', color:'#d0c8bc' }}>{selected.status}</span>
            </div>
          </div>

          {/* Mover etapa */}
          <div style={{ marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'12px', letterSpacing:'.06em', textTransform:'uppercase', color:'#888', marginBottom:'8px' }}>Mover para</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
              {stages.map((s, i) => (
                <button key={s.id}
                  disabled={s.name === selected.status}
                  style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 10px', borderRadius:'6px', border:'none', cursor: s.name === selected.status ? 'default' : 'pointer', background: s.name === selected.status ? 'rgba(201,147,24,0.08)' : 'transparent', color: s.name === selected.status ? '#e4b530' : '#666', fontSize:'12px', textAlign:'left', transition:'all .15s' }}
                  onMouseEnter={e => { if (s.name !== selected.status) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={e => { if (s.name !== selected.status) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  onClick={async e => {
                    e.stopPropagation()
                    if (s.name === selected.status) return
                    await supabase.from('leads').update({ status: s.name, updated_at: new Date().toISOString() }).eq('id', selected.id)
                    setLeads(p => p.map(l => l.id === selected.id ? { ...l, status: s.name } : l))
                    setSelected(p => p ? { ...p, status: s.name } : p)
                  }}
                >
                  <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:s.color, flexShrink:0 }} />
                  {s.name}
                  {s.name === selected.status && <span style={{ marginLeft:'auto', fontSize:'10px', opacity:.5 }}>atual</span>}
                </button>
              ))}
            </div>
          </div>

          <div style={{ height:'1px', background:'rgba(255,255,255,0.04)', marginBottom:'1rem' }} />

          {/* Detalhes */}
          <div style={{ fontSize:'12px', letterSpacing:'.06em', textTransform:'uppercase', color:'#888', marginBottom:'8px' }}>Detalhes</div>
          {[
            { label:'Telefone', value: selected.phone },
            { label:'E-mail', value: selected.email },
            { label:'Origem', value: selected.source },
            { label:'Valor potencial', value: selected.potential_value ? formatCurrency(selected.potential_value) : null },
            { label:'Criado em', value: formatDate(selected.created_at) },
          ].filter(d => d.value).map(({ label, value }) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.03)', fontSize:'12px' }}>
              <span style={{ color:'#888' }}>{label}</span>
              <span style={{ color:'#888' }}>{value}</span>
            </div>
          ))}

          {selected.notes && (
            <div style={{ marginTop:'1rem' }}>
              <div style={{ fontSize:'12px', letterSpacing:'.06em', textTransform:'uppercase', color:'#888', marginBottom:'6px' }}>Notas</div>
              <p style={{ fontSize:'12px', color:'#aaa', lineHeight:1.6 }}>{selected.notes}</p>
            </div>
          )}

          <button onClick={() => handleDeleteLead(selected.id)}
            style={{ marginTop:'1.5rem', width:'100%', padding:'8px', borderRadius:'7px', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)', color:'#f87171', fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px' }}>
            <Trash2 size={13} />Excluir Lead
          </button>
        </div>
      )}

      {/* Modal novo lead */}
      {showLeadForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#141414', border:'1px solid rgba(201,147,24,0.15)', borderRadius:'12px', width:'100%', maxWidth:'420px', padding:'1.75rem' }}>
            <h2 style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'1.5rem', fontWeight:300, color:'#f5f0e8', marginBottom:'1.25rem' }}>Novo Lead</h2>
            <form onSubmit={handleSaveLead} style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
              {[
                { label:'Nome *', id:'name', type:'text' },
                { label:'Telefone', id:'phone', type:'text' },
                { label:'E-mail', id:'email', type:'email' },
                { label:'Valor potencial (R$)', id:'potential_value', type:'number' },
                { label:'Notas', id:'notes', type:'text' },
              ].map(({ label, id, type }) => (
                <div key={id}>
                  <label style={{ display:'block', fontSize:'11px', letterSpacing:'.05em', textTransform:'uppercase', color:'#aaa', marginBottom:'0.3rem' }}>{label}</label>
                  <input type={type} value={(newLead as any)[id]} onChange={e => setNewLead(p => ({ ...p, [id]: e.target.value }))} className="input-base" />
                </div>
              ))}
              <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.5rem', justifyContent:'flex-end' }}>
                <button type="button" onClick={() => setShowLeadForm(false)} className="btn-ghost">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <><Loader2 size={13} />Salvando...</> : 'Criar Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal nova etapa */}
      {showStageForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#141414', border:'1px solid rgba(201,147,24,0.15)', borderRadius:'12px', width:'100%', maxWidth:'360px', padding:'1.75rem' }}>
            <h2 style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'1.5rem', fontWeight:300, color:'#f5f0e8', marginBottom:'1.25rem' }}>Nova Etapa</h2>
            <form onSubmit={handleSaveStage} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div>
                <label style={{ display:'block', fontSize:'11px', letterSpacing:'.05em', textTransform:'uppercase', color:'#aaa', marginBottom:'0.3rem' }}>Nome da etapa *</label>
                <input value={newStage.name} onChange={e => setNewStage(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Proposta Enviada" className="input-base" />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'11px', letterSpacing:'.05em', textTransform:'uppercase', color:'#aaa', marginBottom:'0.5rem' }}>Cor da etapa</label>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  {STAGE_COLORS.map(color => (
                    <div key={color} onClick={() => setNewStage(p => ({ ...p, color }))}
                      style={{ width:'28px', height:'28px', borderRadius:'50%', background:color, cursor:'pointer', border: newStage.color === color ? '2px solid #fff' : '2px solid transparent', transform: newStage.color === color ? 'scale(1.15)' : 'scale(1)', transition:'all .15s' }} />
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.25rem', justifyContent:'flex-end' }}>
                <button type="button" onClick={() => setShowStageForm(false)} className="btn-ghost">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <><Loader2 size={13} />Salvando...</> : 'Criar Etapa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
