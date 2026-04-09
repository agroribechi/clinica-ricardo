-- Migration: Adicionar owner_id à tabela whatsapp_messages para suporte a múltiplos agentes
-- Execute este script no SQL Editor do Supabase se o campo ainda não existir.

-- 1. Adicionar a coluna owner_id
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- 2. Indexar para performance nas consultas de filtro
CREATE INDEX IF NOT EXISTS idx_wa_messages_owner ON public.whatsapp_messages(owner_id);

-- 3. (Opcional) Migrar mensagens órfãs baseadas no sender_phone se o vínculo mapeado em profiles existir
-- Isso ajuda a recuperar o histórico de agentes que já usavam o sistema.
/*
UPDATE public.whatsapp_messages m
SET owner_id = p.id
FROM public.profiles p
WHERE m.owner_id IS NULL 
  AND public.normalize_phone(m.sender_phone) = public.normalize_phone(p.whatsapp_number);
*/
