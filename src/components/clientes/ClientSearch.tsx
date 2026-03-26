'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'
import { Search } from 'lucide-react'

export function ClientSearch({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(defaultValue)
  const [, startTransition] = useTransition()

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = searchParams.get('q') || ''
      if (query === current) return
      
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (query) params.set('q', query)
        else params.delete('q')
        
        router.push(`${pathname}?${params.toString()}`)
      })
    }, 400)
    return () => clearTimeout(timer)
  }, [query, pathname, router, searchParams])

  return (
    <div style={{ position: 'relative' }}>
      <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
      <input
        value={query}
        placeholder="Buscar clientes..."
        onChange={e => setQuery(e.target.value)}
        style={{ paddingLeft: '30px', width: '220px' }}
        className="input-base"
      />
    </div>
  )
}
