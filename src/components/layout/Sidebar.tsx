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
  const [unreadCount, setUnreadCount] = useState(0)
  const [profile, setProfile] = useState<Profile | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadProfileAndUnread() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // 1. Perfil
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        setProfile(prof)

        // 2. Contagem inicial de não lidas com filtro de acesso
        let query = supabase.from('whatsapp_messages').select('*', { count: 'exact', head: true }).eq('is_read', false)
        if (prof?.role !== 'admin') query = query.eq('owner_id', session.user.id)
        
        const { count } = await query
        setUnreadCount(count || 0)

        // 3. Realtime para atualizações dinâmicas
        const channel = supabase.channel('sidebar-unread')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages' }, async (p) => {
            const msg = (p.new || p.old) as any
            
            // Verifica se a mensagem pertence ao usuário (se for agente)
            if (prof?.role !== 'admin' && msg.owner_id !== session.user.id) return

            // Recalcula contagem
            let q = supabase.from('whatsapp_messages').select('*', { count: 'exact', head: true }).eq('is_read', false)
            if (prof?.role !== 'admin') q = q.eq('owner_id', session.user.id)
            const { count: newCount } = await q
            setUnreadCount(newCount || 0)
          })
          .subscribe()
        
        return () => { supabase.removeChannel(channel) }
      }
    }
    loadProfileAndUnread()
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
          const isConversas = href === '/conversas'
          
          return (
            <Link key={href} href={href} className={`nav-link ${active ? 'active' : ''}`} style={{ justifyContent:'space-between' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <Icon size={15} />
                <span>{label}</span>
              </div>
              {isConversas && unreadCount > 0 && (
                <div style={{ 
                  background: active ? 'var(--gold)' : 'rgba(201,147,24,0.15)', 
                  color: active ? 'var(--obsidian)' : 'var(--gold-light)', 
                  fontSize: '10px', 
                  fontWeight: 700, 
                  padding: '1px 6px', 
                  borderRadius: '10px',
                  minWidth: '18px',
                  textAlign: 'center'
                }}>
                  {unreadCount}
                </div>
              )}
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
