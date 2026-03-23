import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { formatCurrency } from '@/lib/utils'
import { Users, Filter, MessageSquare, TrendingUp, AlertTriangle, Clock } from 'lucide-react'
import Link from 'next/link'

async function getDashboardData() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll(_c: { name: string; value: string }[]) {} } }
  )

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59).toISOString()

  const [
    { count: totalClients },
    { count: newClientsMonth },
    { count: newClientsLastMonth },
    { count: activeLeads },
    { count: unreadMessages },
    { data: revenueData },
    { data: recentClients },
    { data: lowStock },
    { data: handoffLeads },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }).gte('join_date', startOfMonth),
    supabase.from('clients').select('*', { count: 'exact', head: true }).gte('join_date', startOfLastMonth).lte('join_date', endOfLastMonth),
    supabase.from('leads').select('*', { count: 'exact', head: true }).not('status', 'in', '("Convertido","Perdido")'),
    supabase.from('whatsapp_messages').select('*', { count: 'exact', head: true }).eq('is_read', false),
    supabase.from('treatments').select('price').gte('date', startOfMonth),
    supabase.from('clients').select('id, display_name, phone, join_date').order('created_at', { ascending: false }).limit(5),
    supabase.from('products').select('*').filter('stock', 'lte', 'low_stock_threshold').limit(5),
    supabase.from('whatsapp_messages').select('client_name, client_phone, sent_date').eq('handoff', true).eq('is_read', false).order('sent_date', { ascending: false }).limit(5),
  ])

  const revenue = revenueData?.reduce((sum, t) => sum + (t.price || 0), 0) || 0
  const clientGrowth = newClientsLastMonth ? ((newClientsMonth || 0) - newClientsLastMonth) : 0

  return { totalClients, newClientsMonth, clientGrowth, activeLeads, unreadMessages, revenue, recentClients, lowStock, handoffLeads }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const kpis = [
    { label: 'Total de Clientes', value: data.totalClients?.toString() || '0', sub: `+${data.newClientsMonth} este mês`, icon: Users, change: data.clientGrowth },
    { label: 'Leads Ativos', value: data.activeLeads?.toString() || '0', sub: 'em andamento no funil', icon: Filter, change: null },
    { label: 'Mensagens Novas', value: data.unreadMessages?.toString() || '0', sub: 'não lidas', icon: MessageSquare, change: null },
    { label: 'Receita do Mês', value: formatCurrency(data.revenue), sub: 'tratamentos realizados', icon: TrendingUp, change: null },
  ]

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 300, color: '#f5f0e8', letterSpacing: '0.02em' }}>
          Painel
        </h1>
        <div style={{ height: '1px', marginTop: '0.5rem', background: 'linear-gradient(90deg, rgba(201,147,24,0.4), transparent)' }} />
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {kpis.map(({ label, value, sub, icon: Icon, change }) => (
          <div key={label} className="card card-hover kpi-card animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div className="kpi-label">{label}</div>
              <div style={{ padding: '6px', background: 'rgba(201,147,24,0.08)', borderRadius: '6px', color: 'var(--gold)' }}>
                <Icon size={14} />
              </div>
            </div>
            <div className="kpi-value">{value}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sub}</span>
              {change != null && change !== 0 && (
                <span className={`kpi-change ${change > 0 ? 'up' : 'down'}`}>
                  {change > 0 ? `+${change}` : change} vs mês anterior
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Alertas e listas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>

        {/* Handoffs pendentes */}
        <div className="card animate-in">
          <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Aguardando Atendimento
            </span>
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            {!data.handoffLeads?.length ? (
              <div style={{ padding: '1.5rem 1.25rem', fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum lead aguardando</div>
            ) : data.handoffLeads.map((m, i) => (
              <Link key={i} href={`/conversas?phone=${m.client_phone?.replace(/\D/g, '')}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', textDecoration: 'none', transition: 'background 0.15s' }}
              >
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{m.client_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.client_phone}</div>
                </div>
                <span className="badge badge-gold">Handoff</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Clientes recentes */}
        <div className="card animate-in">
          <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Clientes Recentes
              </span>
            </div>
            <Link href="/clientes" style={{ fontSize: '11px', color: 'var(--gold)', textDecoration: 'none' }}>Ver todos</Link>
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            {!data.recentClients?.length ? (
              <div style={{ padding: '1.5rem 1.25rem', fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum cliente ainda</div>
            ) : data.recentClients.map(c => (
              <Link key={c.id} href={`/clientes/${c.id}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', textDecoration: 'none', transition: 'background 0.15s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(201,147,24,0.12)', border: '1px solid rgba(201,147,24,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--gold-light)', flexShrink: 0 }}>
                    {c.display_name[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{c.display_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.phone || 'Sem telefone'}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Estoque baixo */}
      {data.lowStock && data.lowStock.length > 0 && (
        <div className="card animate-in" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
          <div style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={14} style={{ color: '#f87171' }} />
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#f87171', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Estoque Baixo — {data.lowStock.length} iten(s)
            </span>
            <Link href="/estoque" style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--gold)', textDecoration: 'none' }}>Ver estoque</Link>
          </div>
        </div>
      )}
    </div>
  )
}
