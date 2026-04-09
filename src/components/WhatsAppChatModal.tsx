'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2 } from 'lucide-react'

interface WhatsAppChatModalProps {
  phone: string
  onClose: () => void
}

export function WhatsAppChatModal({ phone, onClose }: WhatsAppChatModalProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadChat() {
      const p = (phone || '').replace(/\D/g, '')
      if (!p) {
        setMessages([])
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .or(`client_phone.eq.${p},client_phone.ilike.%${p}%`)
        .order('sent_date', { ascending: true })
      
      setMessages(data || [])
      setLoading(false)
    }
    loadChat()

    const channel = supabase.channel(`chat-${phone}`)
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'whatsapp_messages' }, p => {
        const msg = p.new as any
        const msgPhone = (msg.client_phone || '').replace(/\D/g, '')
        const targetPhone = (phone || '').replace(/\D/g, '')
        if (msgPhone === targetPhone) {
          setMessages(prev => [...prev, msg])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [phone])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
      <div style={{ background:'#0d0d0d', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'16px', width:'100%', maxWidth:'550px', height:'80vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 24px 48px rgba(0,0,0,0.5)' }}>
        <div style={{ padding:'1rem 1.5rem', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.02)' }}>
          <div>
            <div style={{ fontSize:'10px', color:'#666', textTransform:'uppercase', letterSpacing:'.1em' }}>Histórico WhatsApp</div>
            <div style={{ fontSize:'16px', color:'#f5f0e8', fontWeight:300 }}>{phone}</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.05)', border:'none', color:'#888', cursor:'pointer', padding:'8px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={20} /></button>
        </div>

        <div 
          ref={scrollRef}
          style={{ flex:1, overflowY:'auto', padding:'1.5rem', display:'flex', flexDirection:'column', gap:'0.75rem', backgroundImage:'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize:'24px 24px' }}
        >
          {loading ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><Loader2 className="animate-spin" color="#666" /></div>
          ) : messages.length === 0 ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#444', fontSize:'13px', textAlign:'center', padding:'2rem' }}>Sem mensagens registradas.</div>
          ) : (
            messages.map((msg, i) => {
              const fromBella = !msg.is_client || msg.sender_phone === 'Bella' || msg.client_phone === 'Bella'
              return (
                <div key={msg.id} style={{ display:'flex', justifyContent: fromBella ? 'flex-end' : 'flex-start' }}>
                  <div style={{ 
                    maxWidth:'85%', 
                    padding:'10px 14px', 
                    borderRadius: fromBella ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: fromBella ? 'rgba(201,147,24,0.12)' : 'rgba(255,255,255,0.05)',
                    border: fromBella ? '1px solid rgba(201,147,24,0.2)' : '1px solid rgba(255,255,255,0.1)',
                    color: '#e5e5e5'
                  }}>
                    <div style={{ fontSize:'13px', lineHeight:1.5, whiteSpace:'pre-wrap' }}>{msg.content || msg.message}</div>
                    <div style={{ fontSize:'9px', color:'#555', marginTop:'4px', textAlign:'right' }}>
                      {(() => {
                        const d = new Date(msg.sent_date)
                        return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
                      })()}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div style={{ padding:'0.75rem', background:'rgba(0,0,0,0.3)', borderTop:'1px solid rgba(255,255,255,0.05)', textAlign:'center', fontSize:'11px', color:'#444' }}>
          Respostas via CRM disponíveis apenas na aba <strong>Conversas</strong>.
        </div>
      </div>
    </div>
  )
}
