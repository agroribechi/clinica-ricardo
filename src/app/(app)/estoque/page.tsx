'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types/database'
import { Plus, Edit, AlertTriangle, Loader2, Trash2 } from 'lucide-react'

const EMPTY = { name:'', category:'', stock:'0', max_stock:'100', low_stock_threshold:'10', unit:'un' }

export default function EstoquePage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const refreshData = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('name')
    setProducts(data || []); setLoading(false)
  }, [])

  useEffect(() => { refreshData() }, [refreshData])

  function openEdit(p: Product) {
    setEditing(p)
    setForm({ name:p.name, category:p.category||'', stock:String(p.stock), max_stock:String(p.max_stock), low_stock_threshold:String(p.low_stock_threshold), unit:p.unit||'un' })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const data = { name:form.name, category:form.category||null, stock:parseInt(form.stock)||0, max_stock:parseInt(form.max_stock)||100, low_stock_threshold:parseInt(form.low_stock_threshold)||10, unit:form.unit||'un' }
    if (editing) await supabase.from('products').update(data).eq('id', editing.id)
    else await supabase.from('products').insert(data as any)
    setSaving(false); setShowForm(false); setEditing(null); setForm(EMPTY); refreshData()
  }
  async function handleDelete(id: string) {
    if (!confirm('Excluir este item do estoque?')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(p => p.filter(prod => prod.id !== id))
  }

  const stockPct = (p: Product) => Math.min(100, Math.round((p.stock / p.max_stock) * 100))
  const isLow = (p: Product) => p.stock <= p.low_stock_threshold

  return (
    <div style={{ padding:'2rem', maxWidth:'900px' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'2rem' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'2.2rem', fontWeight:300, color:'#f5f0e8' }}>Estoque</h1>
          <div style={{ height:'1px', marginTop:'0.5rem', width:'80px', background:'linear-gradient(90deg, rgba(201,147,24,0.4), transparent)' }} />
        </div>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(true) }} className="btn-primary"><Plus size={14} />Novo Item</button>
      </div>

      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="card" style={{ width:'100%', maxWidth:'460px', padding:'1.75rem' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:300, color:'#f5f0e8', marginBottom:'1.25rem' }}>
              {editing ? 'Editar Item' : 'Novo Item'}
            </h2>
            <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.875rem' }}>
                {[
                  { label:'Nome *', id:'name', full:true },
                  { label:'Categoria', id:'category', full:true },
                  { label:'Estoque atual', id:'stock', type:'number' },
                  { label:'Estoque máximo', id:'max_stock', type:'number' },
                  { label:'Alerta (mínimo)', id:'low_stock_threshold', type:'number' },
                  { label:'Unidade', id:'unit' },
                ].map(({ label, id, type='text', full }) => (
                  <div key={id} style={{ gridColumn: full ? '1/-1' : undefined }}>
                    <label style={{ display:'block', fontSize:'12px', letterSpacing:'0.05em', textTransform:'uppercase', color:'#888', marginBottom:'0.3rem' }}>{label}</label>
                    <input type={type} value={(form as any)[id]} onChange={e => setForm(p => ({ ...p, [id]: e.target.value }))} className="input-base" />
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.5rem', justifyContent:'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving && <Loader2 size={14} />}
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <div style={{ color:'var(--text-muted)' }}>Carregando...</div> : (
        <div className="card">
          <table className="table-base">
            <thead><tr><th>Produto</th><th>Nível de estoque</th><th>Qtd</th><th>Unidade</th><th></th></tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      {isLow(p) && <AlertTriangle size={13} style={{ color:'#f59e0b', flexShrink:0 }} />}
                      <div>
                        <div style={{ fontSize:'13px', fontWeight:500, color: isLow(p) ? '#f59e0b' : 'var(--text-primary)' }}>{p.name}</div>
                        {p.category && <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{p.category}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ width:'160px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <div style={{ flex:1, height:'4px', background:'rgba(255,255,255,0.08)', borderRadius:'2px', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${stockPct(p)}%`, background: isLow(p) ? '#f59e0b' : 'var(--gold)', borderRadius:'2px', transition:'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize:'11px', color:'var(--text-muted)', minWidth:'28px' }}>{stockPct(p)}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize:'13px', color: isLow(p) ? '#f59e0b' : 'var(--text-secondary)', fontFamily:'var(--font-mono)' }}>
                    {p.stock} / {p.max_stock}
                  </td>
                  <td style={{ fontSize:'12px', color:'var(--text-muted)' }}>{p.unit}</td>
                  <td>
                    <div style={{ display:'flex', gap:'4px', justifyContent:'flex-end' }}>
                      <button onClick={() => openEdit(p)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'4px', borderRadius:'4px' }}><Edit size={13} /></button>
                      <button onClick={() => handleDelete(p.id)} style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', padding:'4px', borderRadius:'4px', opacity:0.6 }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={5} style={{ textAlign:'center', color:'var(--text-muted)', padding:'2rem' }}>Nenhum item no estoque.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
