-- MIGRATION: Login & User Management
-- Execute este script no SQL Editor do Supabase

-- 1. ADICIONAR TABELA DE PERFIS
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null check (role in ('admin', 'agent')) default 'agent',
  whatsapp_number text unique, -- Número vinculado ao usuário para o webhook
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. AJUSTAR TABELAS DO FUNIL
alter table leads add column if not exists owner_id uuid references auth.users(id);
alter table lead_stages add column if not exists owner_id uuid references auth.users(id);

-- 3. HABILITAR RLS EM TUDO
alter table clients enable row level security;
alter table treatments enable row level security;
alter table leads enable row level security;
alter table lead_history enable row level security;
alter table lead_stages enable row level security;
alter table services enable row level security;
alter table products enable row level security;
alter table whatsapp_messages enable row level security;
alter table profiles enable row level security;

-- 4. POLÍTICAS DE ACESSO (RLS)

-- 4. FUNÇÕES DE APOIO (PARA EVITAR RECURSÃO NO RLS)
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- PROFILES (Cada um vê o seu, Admin vê tudo)
create policy "Usuários podem ver seu próprio perfil" on profiles for select using (auth.uid() = id);
create policy "Admins podem ver todos os perfis" on profiles for all using (public.is_admin());

-- CLIENTES (Compartilhados)
create policy "Todos autenticados podem ver clientes" on clients for select using (auth.role() = 'authenticated');
create policy "Todos autenticados podem inserir/editar clientes" on clients for insert with check (auth.role() = 'authenticated');
create policy "Todos autenticados podem atualizar clientes" on clients for update using (auth.role() = 'authenticated');

-- LEADS (Isolados por dono, Admin vê tudo)
create policy "Agents veem seus próprios leads" on leads for select using (
  owner_id = auth.uid() or public.is_admin()
);
create policy "Usuários podem criar leads" on leads for insert with check (auth.role() = 'authenticated');
create policy "Dono ou Admin pode editar lead" on leads for update using (
  owner_id = auth.uid() or public.is_admin()
);
create policy "Admin pode deletar lead" on leads for delete using (public.is_admin());

-- 1. Função de normalização no Postgres
CREATE OR REPLACE FUNCTION public.normalize_phone(phone text)
RETURNS text AS $$
DECLARE
  digits text;
BEGIN
  IF phone IS NULL THEN RETURN NULL; END IF;
  digits := regexp_replace(phone, '\D', '', 'g');
  IF (left(digits, 2) = '55' AND (length(digits) = 12 OR length(digits) = 13)) THEN
    digits := right(digits, -2);
  END IF;
  RETURN digits;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- MENSAGENS WHATSAPP (Isoladas pelo número vinculado ao perfil ou Admin)
DROP POLICY IF EXISTS "Agents veem mensagens de seus leads" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Agents veem mensagens vinculadas ao seu numero" ON public.whatsapp_messages;
CREATE POLICY "Agents veem mensagens vinculadas ao seu numero" ON public.whatsapp_messages 
FOR SELECT 
USING (
  public.normalize_phone(sender_phone) = (
    SELECT public.normalize_phone(whatsapp_number) 
    FROM public.profiles 
    WHERE id = auth.uid()
  ) 
  OR public.is_admin()
);

-- ETAPAS DO FUNIL (Admin vê tudo, Dono vê as suas)
create policy "Admins podem ver todas as etapas" on lead_stages for select using (public.is_admin());
create policy "Agents veem suas próprias etapas" on lead_stages for select using (owner_id = auth.uid() or public.is_admin());
create policy "Admins podem gerenciar etapas" on lead_stages for all using (public.is_admin());

-- 5. TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, new.raw_user_meta_data->>'display_name', 'agent');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- IMPORTANTE: Defina o primeiro usuário como admin manualmente após o cadastro:
-- update profiles set role = 'admin' where id = 'UUID-DO-SEU-USUARIO';
