'use client'
import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { WhatsAppChatModal } from '@/components/WhatsAppChatModal'
import { normalizePhone } from '@/lib/utils'

export function ClientChatButton({ phone }: { phone: string }) {
  const [show, setShow] = useState(false)

  return (
    <>
      <button onClick={() => setShow(true)} className="btn-ghost" style={{ fontSize:'13px', padding:'0.4rem 0.875rem' }}>
        <MessageSquare size={13} /> Ver Histórico WhatsApp
      </button>

      {show && (
        <WhatsAppChatModal 
          phone={phone} 
          onClose={() => setShow(false)} 
        />
      )}
    </>
  )
}
