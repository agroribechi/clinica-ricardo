'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AITraining } from '@/types/database'
import { Save, Loader2, BrainCircuit, CheckCircle } from 'lucide-react'

const CAMPOS: { id: string; label: string; desc: string; placeholder: string }[] = [
  { id:'apresentacao', label:'Apresentação da Bella', desc:'Tom de voz, identidade, missão', placeholder:'Você é a Bella, secretária virtual da clínica Med Bio...' },
  { id:'procedimentos', label:'Procedimentos', desc:'Lista e descrição dos serviços oferecidos', placeholder:'- Botox: suaviza rugas de expressão...\n- Preenchimento Labial: ...' },
  { id:'faqs', label:'Perguntas Frequentes', desc:'Perguntas e respostas que a Bella deve saber', placeholder:'P: O botox dói?\nR: O desconforto é mínimo...' },
  { id:'regras', label:'Regras de Comportamento', desc:'O que a Bella pode e não pode fazer', placeholder:'- NUNCA forneça valores. Redirecione com [TRANSFERIR_HUMANO]\n- Não faça diagnósticos...' },
  { id:'promocoes', label:'Promoções Ativas', desc:'Promoções vigentes (não informe valores, apenas mencione)', placeholder:'PROMOÇÃO DE VERÃO — válida até 31/01...' },
  { id:'horarios', label:'Horários e Endereço', desc:'Funcionamento e localização da clínica', placeholder:'Segunda a Sexta: 9h às 18h\nEndereço: Av. Mandacaru, 277...' },
]

export default function TreinamentoPage() {
  const supabase = createClient()
  const [data, setData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [active, setActive] = useState('apresentacao')

  const load = useCallback(async () => {
    const { data: rows } = await supabase.from('ai_training').select('*')
    if (rows) setData(Object.fromEntries(rows.map(r => [r.campo, r.valor])))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(campo: string) {
    setSaving(campo)
    await supabase.from('ai_training').upsert({ campo, valor: data[campo] || '', updated_at: new Date().toISOString() }, { onConflict: 'campo' })
    setSaving(null); setSaved(campo)
    setTimeout(() => setSaved(null), 2000)
  }

  async function handleSendToN8n(campo: string) {
    const { data: settings } = await supabase.from('settings').select('n8n_webhook_url, automation_key').eq('id', 'general').single()
    if (!settings?.n8n_webhook_url) { alert('Configure a URL do webhook n8n nas Configurações.'); return }
    await fetch(settings.n8n_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': settings.automation_key || '' },
      body: JSON.stringify({ campo, valor: data[campo] || '' }),
    })
    alert(`Campo "${campo}" enviado para o n8n!`)
  }

  if (loading) return <div style={{ padding:'2rem', color:'var(--text-muted)' }}>Carregando...</div>

  const activeCampo = CAMPOS.find(c => c.id === active)!

  return (
    <div style={{ padding:'2rem', maxWidth:'1000px' }}>
      <div style={{ marginBottom:'2rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'0.25rem' }}>
          <BrainCircuit size={20} style={{ color:'var(--gold)' }} />
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'2.2rem', fontWeight:300, color:'#f5f0e8' }}>Treinamento IA</h1>
        </div>
        <div style={{ height:'1px', marginTop:'0.5rem', width:'140px', background:'linear-gradient(90deg, rgba(201,147,24,0.4), transparent)' }} />
        <p style={{ marginTop:'0.75rem', fontSize:'13px', color:'var(--text-muted)', maxWidth:'500px' }}>
          Configure o comportamento da Bella. As alterações são salvas no banco e enviadas ao n8n automaticamente quando solicitado.
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:'1.25rem' }}>
        {/* Menu lateral */}
        <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
          {CAMPOS.map(c => (
            <button key={c.id} onClick={() => setActive(c.id)}
              style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', padding:'0.75rem', borderRadius:'8px', border:'none', cursor:'pointer', background: active===c.id ? 'rgba(201,147,24,0.1)' : 'transparent', borderLeft: active===c.id ? '2px solid var(--gold)' : '2px solid transparent', transition:'all 0.15s' }}>
              <span style={{ fontSize:'13px', fontWeight:500, color: active===c.id ? 'var(--gold-light)' : 'var(--text-secondary)' }}>{c.label}</span>
              <span style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>{c.desc}</span>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="card" style={{ padding:'1.5rem' }}>
          <div style={{ marginBottom:'1rem' }}>
            <h2 style={{ fontSize:'15px', fontWeight:500, color:'var(--text-primary)', marginBottom:'4px' }}>{activeCampo.label}</h2>
            <p style={{ fontSize:'12px', color:'var(--text-muted)' }}>{activeCampo.desc}</p>
          </div>
          <textarea
            value={data[active] || ''}
            onChange={e => setData(p => ({ ...p, [active]: e.target.value }))}
            placeholder={activeCampo.placeholder}
            className="input-base"
            style={{ minHeight:'280px', resize:'vertical', fontFamily:'var(--font-mono)', fontSize:'12px', lineHeight:'1.6' }}
          />
          <div style={{ display:'flex', gap:'0.75rem', marginTop:'1rem', justifyContent:'flex-end', alignItems:'center' }}>
            {saved === active && (
              <div style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', color:'#34d399' }}>
                <CheckCircle size={13} />Salvo
              </div>
            )}
            <button onClick={() => handleSendToN8n(active)} className="btn-ghost" style={{ fontSize:'12px' }}>
              Enviar ao n8n
            </button>
            <button onClick={() => handleSave(active)} disabled={saving === active} className="btn-primary" style={{ fontSize:'13px' }}>
              {saving === active ? <><Loader2 size={13} />Salvando...</> : <><Save size={13} />Salvar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
