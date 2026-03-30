'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Zap, X, Loader2, Check } from 'lucide-react'
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
  const supabase = createClient()
  const router = useRouter()

  async function handleOpen() {
    setShowModal(true)
    setLoading(true)
    const { data } = await supabase
      .from('lead_stages')
      .select('*')
      .order('order')
    setStages(data || [])
    if (data && data.length > 0) {
      setSelectedStage(data[0].name)
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
      notes: `Lead criado a partir da ficha do cliente. ID: ${client.id}`
    })

    if (!error) {
      setSuccess(true)
      setTimeout(() => {
        setShowModal(false)
        setSuccess(false)
        // Opcional: Redirecionar para o funil
        // router.push('/leads')
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
        className="btn-ghost" 
        style={{ fontSize:'13px', padding:'0.4rem 0.875rem', gap:'6px' }}
      >
        <Zap size={13} style={{ color: 'var(--gold-light)' }} /> Enviar para o Funil
      </button>

      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
          <div style={{ background:'#0d0d0d', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'16px', width:'100%', maxWidth:'400px', padding:'1.5rem', boxShadow:'0 24px 48px rgba(0,0,0,0.5)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
              <div>
                <div style={{ fontSize:'10px', color:'#666', textTransform:'uppercase', letterSpacing:'.1em' }}>Novo Lead</div>
                <div style={{ fontSize:'18px', color:'#f5f0e8', fontWeight:300, fontFamily:'var(--font-display)' }}>Enviar para o Funil</div>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                style={{ background:'rgba(255,255,255,0.05)', border:'none', color:'#888', cursor:'pointer', padding:'6px', borderRadius:'50%', display:'flex', alignItems:'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {loading ? (
              <div style={{ padding:'2rem', textAlign:'center' }}>
                <Loader2 size={24} className="animate-spin" style={{ color:'#888' }} />
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
                <div style={{ fontSize:'13px', color:'var(--text-secondary)', lineHeight:1.5 }}>
                  Selecione em qual etapa do funil deseja inserir <strong>{client.display_name}</strong> como lead:
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  {stages.map(stage => (
                    <button
                      key={stage.id}
                      onClick={() => setSelectedStage(stage.name)}
                      style={{ 
                        display:'flex', 
                        alignItems:'center', 
                        gap:'10px', 
                        padding:'10px 12px', 
                        borderRadius:'10px', 
                        border: selectedStage === stage.name ? '1px solid var(--gold-light)' : '1px solid rgba(255,255,255,0.05)',
                        background: selectedStage === stage.name ? 'rgba(201,147,24,0.08)' : 'rgba(255,255,255,0.02)',
                        color: selectedStage === stage.name ? '#f5f0e8' : '#888',
                        fontSize:'13px',
                        cursor:'pointer',
                        textAlign:'left',
                        transition:'all 0.2s'
                      }}
                    >
                      <div style={{ width:'8px', height:'8px', borderRadius:'50%', background: stage.color }} />
                      {stage.name}
                      {selectedStage === stage.name && (
                        <div style={{ marginLeft:'auto' }}>
                          <Check size={14} style={{ color: 'var(--gold-light)' }} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.5rem' }}>
                  <button 
                    onClick={() => setShowModal(false)} 
                    className="btn-ghost" 
                    style={{ flex:1 }}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSend} 
                    disabled={!selectedStage || saving || success} 
                    className="btn-primary" 
                    style={{ flex:1.5, gap:'8px' }}
                  >
                    {saving ? (
                      <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                    ) : success ? (
                      <><Check size={14} /> Enviado!</>
                    ) : (
                      'Confirmar Envio'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
