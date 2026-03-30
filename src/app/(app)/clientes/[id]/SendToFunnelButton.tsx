'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap, X, Loader2, Check, AlertCircle, TrendingUp, StickyNote } from 'lucide-react'
import type { Client, LeadStage } from '@/types/database'
import { useRouter } from 'next/navigation'

interface SendToFunnelButtonProps {
  client: Client
}

export function SendToFunnelButton({ client }: SendToFunnelButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [stages, setStages] = useState<LeadStage[]>([])
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [existingLead, setExistingLead] = useState<any>(null)
  
  // Novos campos
  const [potentialValue, setPotentialValue] = useState('')
  const [leadNotes, setLeadNotes] = useState('')
  
  const supabase = createClient()
  const router = useRouter()

  async function handleOpen() {
    setShowModal(true)
    setLoading(true)
    
    // 1. Carregar Etapas
    const { data: stagesData } = await supabase
      .from('lead_stages')
      .select('*')
      .order('order')
    
    setStages(stagesData || [])
    if (stagesData && stagesData.length > 0) {
      setSelectedStage(stagesData[0].name)
    }

    // 2. Verificar se já é Lead (por nome ou telefone)
    const query = supabase.from('leads').select('*').or(`name.eq."${client.display_name}"${client.phone ? `,phone.eq."${client.phone}"` : ''}`)
    const { data: leadData } = await query.limit(1)
    
    if (leadData && leadData.length > 0) {
      setExistingLead(leadData[0])
    } else {
      setExistingLead(null)
    }

    setLoading(false)
  }

  async function handleSend() {
    if (!selectedStage || saving) return
    setSaving(true)
    
    const { error } = await supabase.from('leads').insert({
      name: client.display_name,
      phone: client.phone || null,
      email: client.email || null,
      status: selectedStage,
      source: 'CRM - Cliente',
      owner: 'Não atribuído',
      potential_value: parseFloat(potentialValue) || 0,
      notes: leadNotes ? `${leadNotes}\n\nLead criado a partir da ficha do cliente. ID: ${client.id}` : `Lead criado a partir da ficha do cliente. ID: ${client.id}`
    })

    if (!error) {
      setSuccess(true)
      setTimeout(() => {
        setShowModal(false)
        setSuccess(false)
        router.refresh()
      }, 1500)
    } else {
      alert('Erro ao enviar para o funil: ' + error.message)
    }
    setSaving(false)
  }

  return (
    <>
      <button 
        onClick={handleOpen} 
        className="btn-primary" 
        style={{ fontSize:'13px', padding:'0.4rem 0.875rem', gap:'6px', background:'rgba(201,147,24,0.1)', border:'1px solid rgba(201,147,24,0.3)', color:'var(--gold-light)' }}
      >
        <TrendingUp size={13} /> Adicionar como Lead
      </button>

      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)', animation:'fadeIn 0.2s ease-out' }}>
          <div style={{ background:'linear-gradient(145deg, #0f0f0f, #050505)', border:'1px solid rgba(201,147,24,0.15)', borderRadius:'20px', width:'100%', maxWidth:'450px', padding:'2rem', boxShadow:'0 32px 64px rgba(0,0,0,0.6)', position:'relative' }}>
            
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
              <div>
                <div style={{ fontSize:'10px', color:'var(--gold-light)', textTransform:'uppercase', letterSpacing:'.2em', marginBottom:'4px' }}>CRM Integration</div>
                <h2 style={{ fontSize:'22px', color:'#f5f0e8', fontWeight:300, fontFamily:'var(--font-display)', margin:0 }}>Converter em Lead</h2>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                style={{ background:'rgba(255,255,255,0.03)', border:'none', color:'#888', cursor:'pointer', padding:'8px', borderRadius:'50%', display:'flex', alignItems:'center', transition:'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                <X size={20} />
              </button>
            </div>

            {loading ? (
              <div style={{ padding:'3rem', textAlign:'center' }}>
                <Loader2 size={28} className="animate-spin" style={{ color:'var(--gold-light)' }} />
                <p style={{ marginTop:'1rem', fontSize:'13px', color:'var(--text-muted)' }}>Analisando dados do cliente...</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
                
                {existingLead && (
                  <div style={{ background:'rgba(201,147,24,0.05)', border:'1px solid rgba(201,147,24,0.2)', borderRadius:'12px', padding:'1rem', display:'flex', gap:'12px', alignItems:'flex-start' }}>
                    <AlertCircle size={18} style={{ color:'var(--gold-light)', flexShrink:0, marginTop:'2px' }} />
                    <div>
                      <div style={{ fontSize:'13px', color:'#f5f0e8', fontWeight:500 }}>Já existe um lead para este cliente</div>
                      <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'2px' }}>
                        Etapa atual: <strong>{existingLead.status}</strong>. Criar um novo lead irá gerar uma duplicata no funil.
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ fontSize:'14px', color:'var(--text-secondary)', lineHeight:1.5 }}>
                  Defina os detalhes para <strong>{client.display_name}</strong>:
                </div>

                {/* Grid de Campos */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                    <label style={{ fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Valor Potencial</label>
                    <div style={{ position:'relative' }}>
                      <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', fontSize:'12px', color:'var(--text-muted)' }}>R$</span>
                      <input 
                        type="number"
                        value={potentialValue}
                        onChange={e => setPotentialValue(e.target.value)}
                        placeholder="0,00"
                        style={{ width:'100%', padding:'10px 10px 10px 30px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', color:'#f5f0e8', fontSize:'14px', outline:'none' }}
                      />
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                    <label style={{ fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Etapa Inicial</label>
                    <select 
                      value={selectedStage || ''} 
                      onChange={e => setSelectedStage(e.target.value)}
                      style={{ width:'100%', padding:'10px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', color:'#f5f0e8', fontSize:'13px', outline:'none', appearance:'none' }}
                    >
                      {stages.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  <label style={{ fontSize:'11px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Observações do Lead</label>
                  <textarea 
                    value={leadNotes}
                    onChange={e => setLeadNotes(e.target.value)}
                    placeholder="Adicione notas específicas sobre este interesse..."
                    style={{ width:'100%', height:'80px', padding:'12px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', color:'#f5f0e8', fontSize:'13px', outline:'none', resize:'none', fontFamily:'inherit' }}
                  />
                </div>

                <div style={{ display:'flex', gap:'1rem', marginTop:'0.5rem' }}>
                  <button 
                    onClick={() => setShowModal(false)} 
                    className="btn-ghost" 
                    style={{ flex:1, height:'44px' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSend} 
                    disabled={!selectedStage || saving || success} 
                    className="btn-primary" 
                    style={{ flex:1.5, height:'44px', gap:'8px', background: success ? '#10b981' : 'var(--gold-light)', border:'none' }}
                  >
                    {saving ? (
                      <><Loader2 size={16} className="animate-spin" /> Processando...</>
                    ) : success ? (
                      <><Check size={16} /> Lead Criado!</>
                    ) : (
                      <><Zap size={16} /> Confirmar Lead</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
