'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function NovoClientePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    display_name: '', email: '', phone: '', cpf: '',
    dob: '', address: '', notes: '',
    photo_url: ''
  })

  function set(field: string, value: string) {
    setForm(p => ({ ...p, [field]: value }))
    if (field === 'display_name' && !form.photo_url) {
      setForm(p => ({ ...p, photo_url: `https://picsum.photos/seed/${encodeURIComponent(value)}/200/200` }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.display_name.trim()) { setError('Nome é obrigatório.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.from('clients').insert({
      display_name: form.display_name,
      email: form.email || null,
      phone: form.phone || null,
      cpf: form.cpf || null,
      dob: form.dob || null,
      address: form.address || null,
      notes: form.notes || null,
      photo_url: form.photo_url || `https://picsum.photos/seed/${encodeURIComponent(form.display_name)}/200/200`,
    })
    if (err) { setError('Erro ao salvar. Tente novamente.'); setLoading(false); return }
    router.push('/clientes')
    router.refresh()
  }

  const Field = ({ label, id, type = 'text', placeholder = '', full = false }: any) => (
    <div style={{ gridColumn: full ? '1/-1' : undefined }}>
      <label style={{ display:'block', fontSize:'11px', letterSpacing:'0.05em', textTransform:'uppercase', color:'#888', marginBottom:'0.4rem' }}>{label}</label>
      {type === 'textarea' ? (
        <textarea id={id} value={(form as any)[id]} onChange={e => set(id, e.target.value)} placeholder={placeholder}
          className="input-base" style={{ minHeight:'80px', resize:'vertical' }} />
      ) : (
        <input type={type} id={id} value={(form as any)[id]} onChange={e => set(id, e.target.value)} placeholder={placeholder} className="input-base" />
      )}
    </div>
  )

  return (
    <div style={{ padding:'2rem', maxWidth:'700px' }}>
      <Link href="/clientes" style={{ display:'inline-flex', alignItems:'center', gap:'6px', fontSize:'13px', color:'var(--text-muted)', textDecoration:'none', marginBottom:'1.5rem' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <ArrowLeft size={14} /> Voltar
      </Link>

      <h1 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', fontWeight:300, color:'#f5f0e8', marginBottom:'0.5rem' }}>Novo Cliente</h1>
      <div style={{ height:'1px', width:'100px', background:'linear-gradient(90deg, rgba(201,147,24,0.4), transparent)', marginBottom:'2rem' }} />

      <div className="card" style={{ padding:'1.75rem' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' }}>
            <Field label="Nome completo *" id="display_name" placeholder="Ex: Maria da Silva" full />
            <Field label="E-mail" id="email" type="email" placeholder="maria@email.com" />
            <Field label="Telefone" id="phone" placeholder="(44) 99999-8888" />
            <Field label="CPF" id="cpf" placeholder="000.000.000-00" />
            <Field label="Data de nascimento" id="dob" type="date" />
            <Field label="Endereço" id="address" placeholder="Rua, número, cidade" />
            <Field label="Observações" id="notes" type="textarea" placeholder="Histórico, alergias, preferências..." full />
          </div>

          {error && <div style={{ marginTop:'1rem', padding:'0.625rem 0.875rem', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'0.5rem', fontSize:'13px', color:'#f87171' }}>{error}</div>}

          <div style={{ display:'flex', gap:'0.75rem', marginTop:'1.5rem', justifyContent:'flex-end' }}>
            <Link href="/clientes" className="btn-ghost">Cancelar</Link>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading && <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} />}
              {loading ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
