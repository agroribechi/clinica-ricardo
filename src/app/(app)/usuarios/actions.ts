'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Verifica se o usuário atual é um administrador
 * Inclui lógica de auto-criação de perfil para o primeiro usuário (bootstrap)
 */
async function checkAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado')

  const adminClient = createAdminClient()
  let { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Auto-criação de perfil para o usuário logado (Self-healing)
  if (!profile) {
    const { count, error: countError } = await adminClient.from('profiles').select('*', { count: 'exact', head: true })
    if (countError) throw countError
    
    const isFirstUser = (count || 0) === 0
    
    const { data: newProfile, error } = await adminClient
      .from('profiles')
      .insert({
        id: user.id,
        display_name: user.user_metadata?.display_name || 'Admin Inicial',
        role: isFirstUser ? 'admin' : 'agent'
      })
      .select('role')
      .single()
    
    if (error) throw error
    profile = newProfile
  }

  if (profile?.role !== 'admin') {
    throw new Error('Acesso negado: Apenas administradores podem realizar esta ação')
  }
  
  return user
}

/**
 * Lista todos os usuários (Auth + Profile)
 */
export async function getUsersWithProfiles() {
  await checkAdmin()
  const supabase = createAdminClient()

  // 1. Busca dados do Auth (para e-mails)
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
  if (authError) throw authError

  // 2. Busca dados dos Perfis
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
  if (profileError) throw profileError

  // Merge
  return users.map(u => ({
    id: u.id,
    email: u.email,
    display_name: profiles.find(p => p.id === u.id)?.display_name || 'Sem nome',
    role: (profiles.find(p => p.id === u.id)?.role as 'admin' | 'agent') || 'agent',
    whatsapp_number: profiles.find(p => p.id === u.id)?.whatsapp_number || '',
    webhook_url: profiles.find(p => p.id === u.id)?.webhook_url || '',
    created_at: u.created_at
  }))
}

/**
 * Cria um novo usuário com senha definida pelo Admin
 */
export async function createUser(formData: FormData) {
  await checkAdmin()
  const supabase = createAdminClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const role = formData.get('role') as string
  const whatsapp = formData.get('whatsapp') as string
  const webhook = formData.get('webhook') as string

  // 1. Cria no Auth
  const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name }
  })

  if (createError) throw createError

  // 2. Atualiza o perfil (trigger handle_new_user já deve ter criado, mas garantimos campos extras)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      role, 
      whatsapp_number: whatsapp || null,
      display_name: name,
      webhook_url: webhook || null
    })
    .eq('id', user?.id)

  if (updateError) throw updateError

  revalidatePath('/usuarios')
  return { success: true }
}

/**
 * Atualiza um perfil existente
 */
export async function updateProfile(userId: string, data: any) {
  await checkAdmin()
  const supabase = createAdminClient()

  const updates: any = {}
  if (data.role !== undefined) updates.role = data.role
  if (data.display_name !== undefined) updates.display_name = data.display_name
  if (data.whatsapp_number !== undefined) updates.whatsapp_number = data.whatsapp_number
  if (data.webhook_url !== undefined) updates.webhook_url = data.webhook_url

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)

  if (error) throw error

  revalidatePath('/usuarios')
  return { success: true }
}

/**
 * Reseta a senha de um usuário diretamente
 */
export async function resetPassword(userId: string, newPassword: string) {
  await checkAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword
  })

  if (error) throw error
  return { success: true }
}

/**
 * Deleta um usuário permanentemente
 */
export async function deleteUser(userId: string) {
  await checkAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw error

  revalidatePath('/usuarios')
  return { success: true }
}
