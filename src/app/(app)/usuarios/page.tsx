'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Search, Smartphone, Shield, User, RefreshCw, Trash2, Key, Edit2 } from 'lucide-react'
import { getUsersWithProfiles, updateProfile, deleteUser, resetPassword } from './actions'

type UserProfile = {
  id: string
  email?: string
  display_name: string
  role: 'admin' | 'agent'
  whatsapp_number: string
  webhook_url: string
  created_at?: string
}

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newUserData, setNewUserData] = useState({ email:'', password:'', name:'', role:'agent', whatsapp:'', webhook:'' })
  const [showResetModal, setShowResetModal] = useState<string | null>(null)
  const [resetPasswordValue, setResetPasswordValue] = useState('')

  const refreshData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getUsersWithProfiles()
      setProfiles(data as UserProfile[])
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refreshData() }, [refreshData])

  async function handleUpdateProfile(id: string, updates: Partial<UserProfile>) {
    setSaving(id)
    try {
      await updateProfile(id, updates)
      setProfiles(p => p.map(u => u.id === id ? { ...u, ...updates } : u))
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar perfil')
    } finally {
      setSaving(null)
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData()
      Object.entries(newUserData).forEach(([k, v]) => formData.append(k, v))
      
      const { createUser } = await import('./actions')
      await createUser(formData)
      
      setShowModal(false)
      setNewUserData({ email:'', password:'', name:'', role:'agent', whatsapp:'', webhook:'' })
      refreshData()
    } catch (err: any) {
      alert(err.message || 'Erro ao criar usuário')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteUser(id: string, name: string) {
    if (!confirm(`Tem certeza que deseja excluir permanentemente o usuário ${name}?\nEsta ação não pode ser desfeita.`)) return
    setLoading(true)
    try {
      await deleteUser(id)
      setProfiles(p => p.filter(u => u.id !== id))
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir usuário')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword() {
    if (!showResetModal || !resetPasswordValue.trim()) return
    setLoading(true)
    try {
      await resetPassword(showResetModal, resetPasswordValue)
      alert('Senha resetada com sucesso!')
      setShowResetModal(null)
      setResetPasswordValue('')
    } catch (err: any) {
      alert(err.message || 'Erro ao resetar senha')
    } finally {
      setLoading(false)
    }
  }

  const filtered = search.trim().toLowerCase() 
    ? profiles.filter(p => p.display_name?.toLowerCase().includes(search.toLowerCase()) || p.whatsapp_number?.includes(search))
    : profiles

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#888' }}>
      <Loader2 size={24} style={{ animation:'spin 1s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ padding:'1.5rem 2rem', height:'100%', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'1.5rem', flexShrink:0 }}>
        <div>
          <h1 style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'2.2rem', fontWeight:300, color:'#f5f0e8' }}>Gerenciamento de Usuários</h1>
          <div style={{ height:'1px', marginTop:'0.5rem', width:'120px', background:'linear-gradient(90deg, rgba(201,147,24,0.4), transparent)' }} />
        </div>
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
          <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
            <Search size={14} style={{ position:'absolute', left:'10px', color:'#666', pointerEvents:'none' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou número..."
              style={{ paddingLeft:'32px', paddingRight:'10px', paddingTop:'8px', paddingBottom:'8px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', color:'#d0c8bc', fontSize:'13px', width:'250px', outline:'none' }}
            />
          </div>
          <button 
            onClick={() => setShowModal(true)}
            style={{ padding:'8px 16px', background:'#c99318', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:500 }}
          >
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Grid de Usuários */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:'1.25rem', overflowY:'auto', paddingBottom:'2rem' }}>
        {filtered.map(profile => (
          <div key={profile.id} style={{ background:'#141414', border:'1px solid rgba(201,147,24,0.15)', borderRadius:'12px', padding:'1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
              <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:'rgba(201,147,24,0.1)', border:'1px solid rgba(201,147,24,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#c99318' }}>
                <User size={24} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <input 
                    type="text"
                    defaultValue={profile.display_name}
                    onBlur={e => {
                      if (e.target.value !== profile.display_name) {
                        handleUpdateProfile(profile.id, { display_name: e.target.value })
                      }
                    }}
                    style={{ background:'transparent', border:'none', color:'#f5f0e8', fontSize:'16px', fontWeight:500, outline:'none', padding:0, width:'100%' }}
                  />
                </div>
                <div style={{ fontSize:'12px', color:'#888' }}>ID: {profile.id.slice(0, 8)}...</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                <div style={{ alignSelf:'flex-end', background: profile.role === 'admin' ? 'rgba(201,147,24,0.1)' : 'rgba(255,255,255,0.05)', color: profile.role === 'admin' ? '#c99318' : '#aaa', fontSize:'10px', padding:'1px 6px', borderRadius:'10px', textTransform:'uppercase', fontWeight:600 }}>
                  {profile.role}
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={() => setShowResetModal(profile.id)} title="Resetar Senha" style={{ background:'none', border:'none', color:'#7a7060', cursor:'pointer', padding:'2px' }}>
                    <Key size={14} />
                  </button>
                  <button onClick={() => handleDeleteUser(profile.id, profile.display_name)} title="Excluir Usuário" style={{ background:'none', border:'none', color:'#ef444466', cursor:'pointer', padding:'2px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ height:'1px', background:'rgba(255,255,255,0.04)' }} />

            {/* Ajuste de Role */}
            <div>
              <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', color:'#888', textTransform:'uppercase', marginBottom:'0.5rem' }}>
                <Shield size={12} /> Nível de Acesso
              </label>
              <select 
                value={profile.role}
                onChange={e => handleUpdateProfile(profile.id, { role: e.target.value as 'admin' | 'agent' })}
                style={{ width:'100%', background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'8px 12px', color:'#d0c8bc', fontSize:'13px', outline:'none' }}
              >
                <option value="agent">Agente (Apenas próprio funil)</option>
                <option value="admin">Administrador (Acesso total)</option>
              </select>
            </div>

            {/* Ajuste de Número WhatsApp */}
            <div>
              <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', color:'#888', textTransform:'uppercase', marginBottom:'0.5rem' }}>
                <Smartphone size={12} /> Número WhatsApp (Webhook)
              </label>
              <div style={{ position:'relative' }}>
                <input 
                  type="text"
                  placeholder="Ex: 5511999999999"
                  defaultValue={profile.whatsapp_number || ''}
                  onBlur={e => {
                    if (e.target.value !== (profile.whatsapp_number || '')) {
                      handleUpdateProfile(profile.id, { whatsapp_number: e.target.value || null })
                    }
                  }}
                  style={{ width:'100%', background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'8px 12px', color:'#d0c8bc', fontSize:'13px', outline:'none' }}
                />
                {saving === profile.id && (
                  <div style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)' }}>
                    <Loader2 size={14} style={{ color:'#c99318', animation:'spin 1s linear infinite' }} />
                  </div>
                )}
              </div>
              <div style={{ fontSize:'10px', color:'#555', marginTop:'4px' }}>Este número será usado para exibir no CRM.</div>
            </div>

            {/* Ajuste de Webhook */}
            <div>
              <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', color:'#888', textTransform:'uppercase', marginBottom:'0.5rem' }}>
                <RefreshCw size={12} /> URL do Webhook (n8n)
              </label>
              <div style={{ position:'relative' }}>
                <input 
                  type="text"
                  placeholder="https://n8n..."
                  defaultValue={profile.webhook_url || ''}
                  onBlur={e => {
                    if (e.target.value !== (profile.webhook_url || '')) {
                      handleUpdateProfile(profile.id, { webhook_url: e.target.value || null })
                    }
                  }}
                  style={{ width:'100%', background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'8px 12px', color:'#d0c8bc', fontSize:'13px', outline:'none' }}
                />
              </div>
              <div style={{ fontSize:'10px', color:'#555', marginTop:'4px' }}>Webhook específico para este número de WhatsApp.</div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && !loading && (
          <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'4rem', color:'#555' }}>
            Nenhum usuário encontrado.
          </div>
        )}
      </div>

      {/* Modal de Novo Usuário */}
      {showModal && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem' }}>
          <div style={{ background:'#1a1a1a', border:'1px solid rgba(201,147,24,0.3)', borderRadius:'16px', padding:'2rem', width:'100%', maxWidth:'450px', boxShadow:'0 20px 50px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'1.8rem', color:'#f5f0e8', marginBottom:'1.5rem' }}>Cadastrar Novo Usuário</h2>
            <form onSubmit={handleCreateUser} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div>
                <label style={{ fontSize:'12px', color:'#888', marginBottom:'4px', display:'block' }}>NOME COMPLETO</label>
                <input required type="text" value={newUserData.name} onChange={e => setNewUserData({...newUserData, name: e.target.value})} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'10px', color:'#fff', outline:'none' }} />
              </div>
              <div>
                <label style={{ fontSize:'12px', color:'#888', marginBottom:'4px', display:'block' }}>E-MAIL</label>
                <input required type="email" value={newUserData.email} onChange={e => setNewUserData({...newUserData, email: e.target.value})} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'10px', color:'#fff', outline:'none' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                <div>
                  <label style={{ fontSize:'12px', color:'#888', marginBottom:'4px', display:'block' }}>SENHA INICIAL</label>
                  <input required type="password" value={newUserData.password} onChange={e => setNewUserData({...newUserData, password: e.target.value})} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'10px', color:'#fff', outline:'none' }} />
                </div>
                <div>
                    <label style={{ fontSize:'12px', color:'#888', marginBottom:'4px', display:'block' }}>WHATSAPP (OPCIONAL)</label>
                    <input type="text" placeholder="5511..." value={newUserData.whatsapp} onChange={e => setNewUserData({...newUserData, whatsapp: e.target.value})} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'10px', color:'#fff', outline:'none' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize:'12px', color:'#888', marginBottom:'4px', display:'block' }}>NÍVEL DE ACESSO</label>
                <select value={newUserData.role} onChange={e => setNewUserData({...newUserData, role: e.target.value})} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'10px', color:'#fff', outline:'none' }}>
                  <option value="agent">Agente (Vendedor)</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:'12px', color:'#888', marginBottom:'4px', display:'block' }}>URL DO WEBHOOK (OPCIONAL)</label>
                <input type="text" placeholder="https://n8n..." value={newUserData.webhook} onChange={e => setNewUserData({...newUserData, webhook: e.target.value})} style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'10px', color:'#fff', outline:'none' }} />
              </div>
              <div style={{ display:'flex', gap:'1rem', marginTop:'1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex:1, padding:'12px', background:'rgba(255,255,255,0.05)', border:'none', borderRadius:'8px', color:'#aaa', cursor:'pointer' }}>Cancelar</button>
                <button type="submit" disabled={loading} style={{ flex:1, padding:'12px', background:'#c99318', border:'none', borderRadius:'8px', color:'#fff', cursor:'pointer' }}>
                  {loading ? 'Criando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Reset de Senha */}
      {showResetModal && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'1rem' }}>
          <div style={{ background:'#1a1a1a', border:'1px solid rgba(201,147,24,0.3)', borderRadius:'16px', padding:'2rem', width:'100%', maxWidth:'400px', boxShadow:'0 20px 50px rgba(0,0,0,0.5)' }}>
            <h2 style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'1.6rem', color:'#f5f0e8', marginBottom:'1.5rem' }}>Resetar Senha</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div>
                <label style={{ fontSize:'12px', color:'#888', marginBottom:'4px', display:'block' }}>NOVA SENHA</label>
                <input 
                  type="password" 
                  value={resetPasswordValue} 
                  onChange={e => setResetPasswordValue(e.target.value)} 
                  style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'10px', color:'#fff', outline:'none' }} 
                />
              </div>
              <div style={{ display:'flex', gap:'1rem', marginTop:'0.5rem' }}>
                <button onClick={() => { setShowResetModal(null); setResetPasswordValue(''); }} style={{ flex:1, padding:'10px', background:'rgba(255,255,255,0.05)', border:'none', borderRadius:'8px', color:'#aaa', cursor:'pointer' }}>Cancelar</button>
                <button onClick={handleResetPassword} style={{ flex:1, padding:'10px', background:'#c99318', border:'none', borderRadius:'8px', color:'#fff', cursor:'pointer' }}>Alterar Senha</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
