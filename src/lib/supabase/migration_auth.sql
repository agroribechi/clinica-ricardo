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

-- 2. AJUSTAR TABELA DE LEADS
alter table leads add column if not exists owner_id uuid references auth.users(id);

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

-- MENSAGENS WHATSAPP (Isoladas por dono ou Admin)
create policy "Agents veem mensagens de seus leads" on whatsapp_messages for select using (
  exists (
    select 1 from leads where phone = client_phone and owner_id = auth.uid()
  ) or public.is_admin()
);

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
