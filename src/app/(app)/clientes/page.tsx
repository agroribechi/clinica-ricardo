import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { formatDate, formatPhone } from '@/lib/utils'
import { UserPlus, Search } from 'lucide-react'
import { ClientSearch } from '@/components/clientes/ClientSearch'

async function getClientes(search?: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll(_c: { name: string; value: string }[]) {} } }
  )
  let q = supabase.from('clients').select('id, display_name, email, phone, join_date, tags').order('display_name')
  if (search) {
    q = q.or(`display_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search.replace(/\D/g,'')}%`)
  }
  const { data } = await q.limit(100)
  return data || []
}

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const search = q || ''
  const clients = await getClientes(search)

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 300, color: '#f5f0e8', letterSpacing: '0.02em' }}>
            Clientes
          </h1>
          <div style={{ height: '1px', marginTop: '0.5rem', width: '120px', background: 'linear-gradient(90deg, rgba(201,147,24,0.4), transparent)' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <ClientSearch defaultValue={search} />
          <Link href="/clientes/novo" className="btn-primary">
            <UserPlus size={14} />
            Novo Cliente
          </Link>
        </div>
      </div>

      <div className="card">
        {clients.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            {search ? `Nenhum resultado para "${search}"` : 'Nenhum cliente cadastrado ainda.'}
          </div>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Desde</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(201,147,24,0.1)', border: '1px solid rgba(201,147,24,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--gold-light)', flexShrink: 0 }}>
                        {c.display_name[0]?.toUpperCase()}
                      </div>
                      <Link href={`/clientes/${c.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500, fontSize: '13px' }}
                      >
                        {c.display_name}
                      </Link>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{c.email || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
                    {c.phone ? formatPhone(c.phone) : '—'}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{formatDate(c.join_date)}</td>
                  <td>
                    <Link href={`/clientes/${c.id}`} style={{ fontSize: '12px', color: 'var(--gold)', textDecoration: 'none', opacity: 0.7 }}
                    >
                      Ver perfil →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ marginTop: '0.75rem', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
        {clients.length} cliente{clients.length !== 1 ? 's' : ''} encontrado{clients.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
