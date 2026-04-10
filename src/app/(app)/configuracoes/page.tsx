'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Settings } from '@/types/database'
import { Save, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'

export default function ConfiguracoesPage() {
  const supabase = createClient()
  const [form, setForm] = useState<Partial<Settings>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)

  const refreshData = useCallback(async () => {
    const { data } = await supabase.from('settings').select('*').eq('id', 'general').single()
    if (data) setForm(data)
    setLoading(false)
  }, [])

  useEffect(() => { refreshData() }, [refreshData])

  function set(field: string, value: string) { setForm(p => ({ ...p, [field]: value })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('settings').upsert({
      id: 'general',
      clinic_name: form.clinic_name || 'Med Bio',
      logo_url: form.logo_url || null,
      whatsapp_number: form.whatsapp_number || null,
      automation_key: form.automation_key || null,
      n8n_webhook_url: form.n8n_webhook_url || null,
      updated_at: new Date().toISOString(),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div style={{ padding:'2rem', color:'var(--text-muted)' }}>Carregando...</div>

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="card" style={{ padding:'1.5rem', marginBottom:'1rem' }}>
      <div style={{ fontSize:'12px', letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--gold)', marginBottom:'1.25rem' }}>{title}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
        {children}
      </div>
    </div>
  )

  const Field = ({ label, id, type='text', placeholder='', hint='', secret=false }: any) => (
    <div>
      <label style={{ display:'block', fontSize:'12px', letterSpacing:'0.05em', textTransform:'uppercase', color:'#888', marginBottom:'0.4rem' }}>{label}</label>
      <div style={{ position:'relative' }}>
        <input
          type={secret && !showKey ? 'password' : type}
          value={(form as any)[id] || ''}
          onChange={e => set(id, e.target.value)}
          placeholder={placeholder}
          className="input-base"
          style={secret ? { paddingRight:'40px' } : {}}
        />
        {secret && (
          <button type="button" onClick={() => setShowKey(p => !p)}
            style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer' }}>
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && <p style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'4px' }}>{hint}</p>}
    </div>
  )

  return (
    <div style={{ padding:'2rem', maxWidth:'680px' }}>
      <div style={{ marginBottom:'2rem' }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'2.2rem', fontWeight:300, color:'#f5f0e8' }}>Configurações</h1>
        <div style={{ height:'1px', marginTop:'0.5rem', width:'120px', background:'linear-gradient(90deg, rgba(201,147,24,0.4), transparent)' }} />
      </div>

      <form onSubmit={handleSave}>
        <Section title="Clínica">
          <Field label="Nome da Clínica" id="clinic_name" placeholder="Med Bio" />
          <Field label="URL do Logo" id="logo_url" placeholder="https://..." hint="URL de uma imagem para o logo na barra lateral" />
        </Section>

        <Section title="WhatsApp e Automação">
          <Field label="Número da Clínica (WhatsApp)" id="whatsapp_number" placeholder="5544999999999" hint="DDD + número, só dígitos" />
          <Field label="Chave de API (Automation Key)" id="automation_key" placeholder="Chave secreta para autenticar o n8n" secret hint="Usada no header x-api-key das chamadas do n8n" />
          <Field label="URL do Webhook n8n (Treinamento)" id="n8n_webhook_url" placeholder="https://n8n.seu-dominio.com/webhook/bella-treinar" hint="Endpoint que recebe os dados de treinamento da Bella" />
        </Section>

        <div style={{ display:'flex', alignItems:'center', gap:'1rem', justifyContent:'flex-end', marginTop:'1.5rem' }}>
          {saved && (
            <div style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'13px', color:'#34d399' }}>
              <CheckCircle size={14} />Configurações salvas!
            </div>
          )}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <><Loader2 size={14} />Salvando...</> : <><Save size={14} />Salvar Configurações</>}
          </button>
        </div>
      </form>
    </div>
  )
}
