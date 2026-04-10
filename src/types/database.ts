export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type Client = {
  id: string
  display_name: string
  email?: string | null
  phone?: string | null
  cpf?: string | null
  photo_url?: string | null
  join_date?: string | null
  dob?: string | null
  address?: string | null
  notes?: string | null
  medical_history?: string[] | null
  tags?: string[] | null
  created_at?: string
  updated_at?: string
}

export type Treatment = {
  id: string
  client_id: string
  date: string
  service_name: string
  professional: string
  price: number
  notes?: string | null
  created_at?: string
}

export type LeadStage = {
  id: string
  name: string
  order: number
  color: string
  description?: string | null
  owner_id?: string | null
}

export type Lead = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  source?: string | null
  status: string
  owner_id?: string | null
  potential_value?: number
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export type LeadHistory = {
  id: string
  lead_id: string
  date: string
  interaction_type: string
  summary: string
  next_action?: string | null
  next_action_date?: string | null
  created_at?: string
}

export type LeadNote = {
  id: string
  lead_id: string
  content: string
  author_id?: string | null
  created_at?: string
}

export type Service = {
  id: string
  name: string
  description?: string | null
  category?: string | null
  duration_minutes?: number
  price: number
  active?: boolean
  created_at?: string
}

export type Product = {
  id: string
  name: string
  category?: string | null
  stock: number
  max_stock: number
  low_stock_threshold: number
  unit?: string
  last_restock?: string | null
  created_at?: string
  updated_at?: string
}

export type WhatsAppMessage = {
  id: string
  client_name: string
  client_phone: string
  sender_phone?: string | null
  owner_id?: string | null
  content: string
  message: string
  sent_date: string
  is_read: boolean
  is_client: boolean
  handoff?: boolean
  created_at?: string
}

export type N8nLog = {
  id: string
  received_at: string
  data: Json
  is_read: boolean
}

export type AITraining = {
  id: string
  campo: string
  valor: string
  updated_at?: string
}

export type Settings = {
  id: string
  clinic_name?: string
  logo_url?: string | null
  whatsapp_number?: string | null
  automation_key?: string | null
  n8n_webhook_url?: string | null
  updated_at?: string
}

export type Conversation = {
  phone: string
  display_name: string
  last_message_at: string
  last_message: string
  messages: WhatsAppMessage[]
  unread_count: number
  is_client: boolean
  client_id?: string
  stage_color?: string
  handoff?: boolean
  sender_phone?: string | null
  agent_name?: string | null
}

export type Profile = {
  id: string
  full_name?: string | null
  display_name?: string | null
  role: 'admin' | 'agent' | 'producer'
  whatsapp_number?: string | null
  webhook_url?: string | null
  created_at?: string
  updated_at?: string
}

// Alias de Database vazio para o createClient
export type Database = Record<string, unknown>
