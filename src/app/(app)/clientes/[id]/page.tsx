import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatCurrency, normalizePhone } from '@/lib/utils'
import { ArrowLeft, Edit, MessageSquare, Phone, Mail, MapPin, FileText, Stethoscope } from 'lucide-react'

async function getClient(id: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const [{ data: client }, { data: treatments }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('treatments').select('*').eq('client_id', id).order('date', { ascending: false }).limit(20),
  ])
  return { client, treatments: treatments || [] }
}

export default async function ClienteDetailPage({ params }: { params: { id: string } }) {
  const { client, treatments } = await getClient(params.id)
  if (!client) notFound()

  const totalGasto = treatments.reduce((s, t) => s + (t.price || 0), 0)

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px' }}>
      <Link href="/clientes" style={{ display:'inline-flex', alignItems:'center', gap:'6px', fontSize:'13px', color:'var(--text-muted)', textDecoration:'none', marginBottom:'1.5rem' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <ArrowLeft size={14} /> Clientes
      </Link>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'2rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'1.25rem' }}>
          <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'rgba(201,147,24,0.12)', border:'2px solid rgba(201,147,24,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', fontFamily:'var(--font-display)', fontWeight:300, color:'var(--gold-light)', flexShrink:0 }}>
            {client.display_name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', fontWeight:300, color:'#f5f0e8', lineHeight:1 }}>{client.display_name}</h1>
            <p style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'4px' }}>Cliente desde {formatDate(client.join_date)}</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          {client.phone && (
            <Link href={`/conversas?phone=${normalizePhone(client.phone)}`} className="btn-ghost" style={{ fontSize:'13px', padding:'0.4rem 0.875rem' }}>
              <MessageSquare size={13} /> Conversa
            </Link>
          )}
          <Link href={`/clientes/${client.id}/editar`} className="btn-primary" style={{ fontSize:'13px', padding:'0.4rem 0.875rem' }}>
            <Edit size={13} /> Editar
          </Link>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:'1.25rem' }}>
        {/* Info */}
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div className="card" style={{ padding:'1.25rem' }}>
            <div style={{ fontSize:'11px', letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'1rem' }}>Informações</div>
            {[
              { icon: Mail, label: client.email || '—' },
              { icon: Phone, label: client.phone ? normalizePhone(client.phone) : '—' },
              { icon: MapPin, label: client.address || '—' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'0.5rem 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                <Icon size={13} style={{ color:'var(--text-muted)', flexShrink:0 }} />
                <span style={{ fontSize:'13px', color:'var(--text-secondary)' }}>{label}</span>
              </div>
            ))}
            {client.dob && (
              <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'0.5rem 0' }}>
                <FileText size={13} style={{ color:'var(--text-muted)' }} />
                <span style={{ fontSize:'13px', color:'var(--text-secondary)' }}>{formatDate(client.dob, 'dd/MM/yyyy')}</span>
              </div>
            )}
          </div>

          {client.notes && (
            <div className="card" style={{ padding:'1.25rem' }}>
              <div style={{ fontSize:'11px', letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'0.75rem' }}>Observações</div>
              <p style={{ fontSize:'13px', color:'var(--text-secondary)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{client.notes}</p>
            </div>
          )}

          <div className="card kpi-card">
            <div className="kpi-label">Total investido</div>
            <div className="kpi-value" style={{ fontSize:'1.8rem' }}>{formatCurrency(totalGasto)}</div>
            <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'4px' }}>{treatments.length} tratamento{treatments.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Tratamentos */}
        <div className="card">
          <div style={{ padding:'1.25rem', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <Stethoscope size={14} style={{ color:'var(--text-muted)' }} />
              <span style={{ fontSize:'12px', fontWeight:500, color:'var(--text-secondary)', letterSpacing:'0.04em', textTransform:'uppercase' }}>Histórico de Tratamentos</span>
            </div>
          </div>
          {treatments.length === 0 ? (
            <div style={{ padding:'3rem', textAlign:'center', color:'var(--text-muted)', fontSize:'13px' }}>Nenhum tratamento registrado.</div>
          ) : (
            <table className="table-base">
              <thead><tr><th>Data</th><th>Serviço</th><th>Profissional</th><th>Valor</th></tr></thead>
              <tbody>
                {treatments.map(t => (
                  <tr key={t.id}>
                    <td style={{ color:'var(--text-muted)', fontSize:'12px', fontFamily:'var(--font-mono)' }}>{formatDate(t.date)}</td>
                    <td style={{ fontSize:'13px', color:'var(--text-primary)' }}>{t.service_name}</td>
                    <td style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{t.professional}</td>
                    <td><span className="badge badge-gold">{formatCurrency(t.price)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
