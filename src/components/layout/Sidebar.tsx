'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Users, Filter, MessageSquare,
  Package, BrainCircuit, Settings, LogOut, Sparkles, Upload, UserCog
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Profile } from '@/types/database'

const nav = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Painel' },
  { href: '/clientes',      icon: Users,           label: 'Clientes' },
  { href: '/leads',         icon: Filter,          label: 'Funil de Vendas' },
  { href: '/conversas',     icon: MessageSquare,   label: 'Conversas' },
  { href: '/servicos',      icon: Sparkles,        label: 'Serviços' },
  { href: '/estoque',       icon: Package,         label: 'Estoque' },
  { href: '/treinamento',   icon: BrainCircuit,    label: 'Treinamento IA' },
  { href: '/importar',      icon: Upload,          label: 'Importar Dados' },
  { href: '/configuracoes', icon: Settings,        label: 'Configurações' },
]

export function Sidebar({ clinicName = 'Med Bio' }: { clinicName?: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
    }
    loadProfile()
  }, [supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside style={{
      width: '220px',
      minWidth: '220px',
      background: '#0d0d0d',
      borderRight: '1px solid rgba(201,147,24,0.1)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '1.5rem 1.25rem 1.25rem', borderBottom: '1px solid rgba(201,147,24,0.08)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 300, color: '#f5f0e8', letterSpacing: '0.04em' }}>
          {clinicName}
        </div>
        <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, #c99318, transparent)' }} />
          <span style={{ fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7d5213' }}>crm</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className={`nav-link ${active ? 'active' : ''}`}>
              <Icon size={15} />
              <span>{label}</span>
            </Link>
          )
        })}
        {profile?.role === 'admin' && (
          <Link href="/usuarios" className={`nav-link ${pathname.startsWith('/usuarios') ? 'active' : ''}`}>
            <UserCog size={15} />
            <span>Usuários</span>
          </Link>
        )}
      </nav>

      {/* Logout */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(201,147,24,0.08)' }}>
        <button onClick={handleLogout} className="nav-link" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}>
          <LogOut size={15} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
