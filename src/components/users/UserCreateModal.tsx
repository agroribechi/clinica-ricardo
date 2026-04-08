'use client'

import { useState } from 'react'
import { X, Loader2, UserPlus, Shield, Smartphone, Mail, Lock } from 'lucide-react'
import { createUser } from '@/app/(app)/usuarios/actions'

interface UserCreateModalProps {
  onClose: () => void
  onSuccess: () => void
}

export function UserCreateModal({ onClose, onSuccess }: UserCreateModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    try {
      await createUser(formData)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao criar usuário')
      setLoading(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
      <div style={{ background:'#121212', border:'1px solid rgba(201,147,24,0.2)', borderRadius:'16px', width:'100%', maxWidth:'450px', padding:'2rem', boxShadow:'0 20px 40px rgba(0,0,0,0.4)' }}>
        
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
          <div>
            <h2 style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'1.8rem', fontWeight:300, color:'#f5f0e8', margin:0 }}>Novo Usuário</h2>
            <div style={{ height:'1px', marginTop:'0.25rem', width:'60px', background:'linear-gradient(90deg, #c99318, transparent)' }} />
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#666', cursor:'pointer', padding:'4px', transition:'color .2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#666'}>
            <X size={24} />
          </button>
        </div>

        {error && (
          <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171', padding:'0.75rem', borderRadius:'8px', fontSize:'13px', marginBottom:'1.5rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
          
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <div>
              <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', letterSpacing:'.05em', textTransform:'uppercase', color:'#888', marginBottom:'0.5rem' }}>
                <UserPlus size={12} /> Nome Completo
              </label>
              <input name="name" required placeholder="Ex: João Silva" className="input-base" style={{ width:'100%' }} />
            </div>
            <div>
              <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', letterSpacing:'.05em', textTransform:'uppercase', color:'#888', marginBottom:'0.5rem' }}>
                <Shield size={12} /> Papel
              </label>
              <select name="role" required className="input-base" style={{ width:'100%', appearance:'none', cursor:'pointer' }}>
                <option value="agent">Agente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', letterSpacing:'.05em', textTransform:'uppercase', color:'#888', marginBottom:'0.5rem' }}>
              <Mail size={12} /> Email de Acesso
            </label>
            <input name="email" type="email" required placeholder="joao@clinica.com" className="input-base" style={{ width:'100%' }} />
          </div>

          <div>
            <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', letterSpacing:'.05em', textTransform:'uppercase', color:'#888', marginBottom:'0.5rem' }}>
              <Lock size={12} /> Senha Inicial
            </label>
            <input name="password" type="password" required placeholder="••••••••" className="input-base" style={{ width:'100%' }} />
            <p style={{ fontSize:'10px', color:'#555', marginTop:'4px' }}>Mínimo de 6 caracteres.</p>
          </div>

          <div>
            <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', letterSpacing:'.05em', textTransform:'uppercase', color:'#888', marginBottom:'0.5rem' }}>
              <Smartphone size={12} /> WhatsApp (Apenas Números)
            </label>
            <input name="whatsapp" placeholder="5511999999999" className="input-base" style={{ width:'100%' }} />
            <p style={{ fontSize:'10px', color:'#555', marginTop:'4px' }}>Para roteamento automático de mensagens.</p>
          </div>

          <div style={{ display:'flex', gap:'1rem', marginTop:'1rem' }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex:1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary" style={{ flex:1, gap:'8px' }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {loading ? 'Criando...' : 'Criar Conta'}
            </button>
          </div>
        </form>
      </div>
      
      <style jsx global>{`
        .input-base {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 0.75rem;
          color: #f5f0e8;
          font-size: 14px;
          outline: none;
          transition: all 0.2s ease;
        }
        .input-base:focus {
          border-color: rgba(201,147,24,0.4);
          background: rgba(255,255,255,0.06);
          box-shadow: 0 0 0 2px rgba(201,147,24,0.1);
        }
        .btn-primary {
          background: linear-gradient(135deg, #c99318, #9a6d0d);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          alignItems: center;
          justifyContent: center;
          transition: all 0.2s ease;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(201,147,24,0.3);
          filter: brightness(1.1);
        }
        .btn-ghost {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: #888;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-ghost:hover {
          background: rgba(255,255,255,0.05);
          color: #f5f0e8;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
