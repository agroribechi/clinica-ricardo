
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debug() {
  const { data: profiles } = await supabase.from('profiles').select('*')
  console.log('--- PROFILES ---')
  console.table(profiles)
  
  const { data: stages } = await supabase.from('lead_stages').select('*')
  console.log('--- STAGES ---')
  console.table(stages)
}

debug()
