'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('E-mail ou senha incorretos.'); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0d0d0d', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ width:'100%', maxWidth:'380px' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'2.8rem', fontWeight:300, color:'#f5f0e8', letterSpacing:'0.05em', lineHeight:1 }}>
            Med Bio
          </div>
          <div style={{ marginTop:'0.5rem', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
            <div style={{ height:'1px', width:'40px', background:'linear-gradient(90deg, transparent, #c99318)' }} />
            <span style={{ fontSize:'10px', letterSpacing:'0.2em', textTransform:'uppercase', color:'#c99318' }}>Estética Avançada</span>
            <div style={{ height:'1px', width:'40px', background:'linear-gradient(90deg, #c99318, transparent)' }} />
          </div>
        </div>

        {/* Card */}
        <div style={{ background:'#141414', border:'1px solid rgba(201,147,24,0.15)', borderRadius:'0.75rem', padding:'2rem' }}>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:400, color:'#f5f0e8', marginBottom:'0.25rem' }}>
            Acesso ao sistema
          </h1>
          <p style={{ fontSize:'13px', color:'#666', marginBottom:'1.75rem' }}>
            Entre com suas credenciais para continuar
          </p>

          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div>
              <label style={{ display:'block', fontSize:'11px', letterSpacing:'0.05em', textTransform:'uppercase', color:'#888', marginBottom:'0.4rem' }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="input-base"
              />
            </div>
            <div>
              <label style={{ display:'block', fontSize:'11px', letterSpacing:'0.05em', textTransform:'uppercase', color:'#888', marginBottom:'0.4rem' }}>
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input-base"
              />
            </div>

            {error && (
              <div style={{ padding:'0.625rem 0.875rem', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'0.5rem', fontSize:'13px', color:'#f87171' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:'0.5rem', padding:'0.75rem' }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', marginTop:'1.5rem', fontSize:'12px', color:'#444' }}>
          Sistema interno — Med Bio Estética
        </p>
      </div>
    </div>
  )
}
