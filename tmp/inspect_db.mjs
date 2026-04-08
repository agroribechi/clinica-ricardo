
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name, role')
  
  if (error) {
    console.error(error)
    return
  }
  
  console.log('--- PROFILES ---')
  profiles.forEach(p => console.log(`${p.display_name} (${p.role}): ${p.id}`))
  
  const { data: stages, error: stagesError } = await supabase
    .from('lead_stages')
    .select('id, name, owner_id')
  
  if (stagesError) {
    console.error(stagesError)
    return
  }
  
  console.log('--- STAGES ---')
  stages.forEach(s => console.log(`${s.name}: ${s.owner_id || 'null'}`))
}

main()
