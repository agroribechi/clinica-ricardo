-- 1. Adicionar owner_id à tabela lead_stages se não existir
ALTER TABLE public.lead_stages ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- 2. Migrar etapas existentes para o usuário 'medbio'
-- ID do usuário medbio: f6aef97d-b0a7-4d0d-b5e1-0bd388dc3ff9
UPDATE public.lead_stages 
SET owner_id = 'f6aef97d-b0a7-4d0d-b5e1-0bd388dc3ff9' 
WHERE owner_id IS NULL;

-- 3. Habilitar RLS e criar políticas de isolamento
ALTER TABLE public.lead_stages ENABLE ROW LEVEL SECURITY;

-- Política de Leitura: Ver apenas o próprio funil ou ser admin
DROP POLICY IF EXISTS "Usuários podem ver suas próprias etapas" ON public.lead_stages;
CREATE POLICY "Usuários podem ver suas próprias etapas" ON public.lead_stages
  FOR SELECT USING (owner_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Política de Escrita: Gerenciar apenas o próprio funil ou ser admin
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias etapas" ON public.lead_stages;
CREATE POLICY "Usuários podem gerenciar suas próprias etapas" ON public.lead_stages
  FOR ALL USING (owner_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
