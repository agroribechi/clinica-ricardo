import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  const { data: users } = await supabase.auth.admin.listUsers()
  const { data: profiles } = await supabase.from('profiles').select('*')
  
  console.log('--- AUTH USERS ---')
  console.log(users.users.map(u => ({ id: u.id, email: u.email })))
  
  console.log('\n--- PROFILES ---')
  console.log(profiles)
}

run()
