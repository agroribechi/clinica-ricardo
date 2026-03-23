'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { Service } from '@/types/database'
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react'

const EMPTY = { name:'', description:'', category:'', duration_minutes:'60', price:'' }

export default function ServicosPage() {
  const supabase = createClient()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('services').select('*').order('name')
    setServices(data || []); setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() { setEditing(null); setForm(EMPTY); setShowForm(true) }
  function openEdit(s: Service) {
    setEditing(s)
    setForm({ name:s.name, description:s.description||'', category:s.category||'', duration_minutes:String(s.duration_minutes||60), price:String(s.price) })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const data = { name:form.name, description:form.description||null, category:form.category||null, duration_minutes:parseInt(form.duration_minutes)||60, price:parseFloat(form.price)||0 }
    if (editing) await supabase.from('services').update(data).eq('id', editing.id)
    else await supabase.from('services').insert(data)
    setSaving(false); setShowForm(false); load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este serviço?')) return
    await supabase.from('services').delete().eq('id', id)
    setServices(p => p.filter(s => s.id !== id))
  }

  const categories = [...new Set(services.map(s => s.category).filter(Boolean))]

  return (
    <div style={{ padding:'2rem', maxWidth:'900px' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'2.2rem', fontWeight:300, color:'#f5f0e8' }}>Serviços</h1>
          <div style={{ height:'1px', marginTop:'0.5rem', width:'80px', background:'linear-gradient(90deg, rgba(201,147,24,0.4), transparent)' }} />
        </div>
        <button onClick={openNew} className="btn-primary"><Plus size={14} />Novo Serviço</button>
      </div>

      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="card" style={{ width:'100%', maxWidth:'460px', padding:'1.75rem' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:300, color:'#f5f0e8', marginBottom:'1.25rem' }}>
              {editing ? 'Editar Serviço' : 'Novo Serviço'}
            </h2>
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
              {[
                { label:'Nome *', id:'name' }, { label:'Categoria', id:'category' },
                { label:'Descrição', id:'description' },
              ].map(({ label, id }) => (
                <div key={id}>
                  <label style={{ display:'block', fontSize:'11px', letterSpacing:'0.05em', textTransform:'uppercase', color:'#888', marginBottom:'0.3rem' }}>{label}</label>
                  <input value={(form as any)[id]} onChange={e => setForm(p => ({ ...p, [id]: e.target.value }))} className="input-base" />
                </div>
              ))}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.875rem' }}>
                <div>
                  <label style={{ display:'block', fontSize:'11px', letterSpacing:'0.05em', textTransform:'uppercase', color:'#888', marginBottom:'0.3rem' }}>Duração (min)</label>
                  <input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} className="input-base" />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'11px', letterSpacing:'0.05em', textTransform:'uppercase', color:'#888', marginBottom:'0.3rem' }}>Preço (R$)</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} className="input-base" />
                </div>
              </div>
              <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.5rem', justifyContent:'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving && <Loader2 size={14} />}
                  {saving ? 'Salvando...' : editing ? 'Salvar Alterações' : 'Criar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div style={{ color:'var(--text-muted)' }}>Carregando...</div> : (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {categories.length > 0 ? categories.map(cat => (
            <div key={cat}>
              <div style={{ fontSize:'11px', letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'0.5rem', paddingLeft:'0.25rem' }}>{cat}</div>
              <div className="card">
                <table className="table-base">
                  <thead><tr><th>Serviço</th><th>Duração</th><th>Preço</th><th></th></tr></thead>
                  <tbody>
                    {services.filter(s => s.category === cat).map(s => (
                      <tr key={s.id}>
                        <td>
                          <div style={{ fontSize:'13px', fontWeight:500, color:'var(--text-primary)' }}>{s.name}</div>
                          {s.description && <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>{s.description}</div>}
                        </td>
                        <td style={{ color:'var(--text-secondary)', fontSize:'13px' }}>{s.duration_minutes} min</td>
                        <td><span className="badge badge-gold">{formatCurrency(s.price)}</span></td>
                        <td>
                          <div style={{ display:'flex', gap:'4px', justifyContent:'flex-end' }}>
                            <button onClick={() => openEdit(s)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'4px', borderRadius:'4px' }}><Edit size={13} /></button>
                            <button onClick={() => handleDelete(s.id)} style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', padding:'4px', borderRadius:'4px', opacity:0.6 }}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )) : (
            <div className="card">
              <table className="table-base">
                <thead><tr><th>Serviço</th><th>Duração</th><th>Preço</th><th></th></tr></thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontSize:'13px', fontWeight:500, color:'var(--text-primary)' }}>{s.name}</div>
                        {s.description && <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{s.description}</div>}
                      </td>
                      <td style={{ color:'var(--text-secondary)', fontSize:'13px' }}>{s.duration_minutes} min</td>
                      <td><span className="badge badge-gold">{formatCurrency(s.price)}</span></td>
                      <td>
                        <div style={{ display:'flex', gap:'4px', justifyContent:'flex-end' }}>
                          <button onClick={() => openEdit(s)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'4px' }}><Edit size={13} /></button>
                          <button onClick={() => handleDelete(s.id)} style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', padding:'4px', opacity:0.6 }}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {services.length === 0 && <tr><td colSpan={4} style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>Nenhum serviço cadastrado.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
