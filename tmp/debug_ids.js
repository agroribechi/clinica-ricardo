
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function debug() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
  if (pError) console.error('Profiles Error:', pError);
  else {
    console.log('--- PROFILES ---');
    console.table(profiles.map(p => ({ id: p.id, name: p.display_name, role: p.role })));
  }
  
  const { data: stages, error: sError } = await supabase.from('lead_stages').select('*');
  if (sError) console.error('Stages Error:', sError);
  else {
    console.log('--- STAGES ---');
    console.table(stages.map(s => ({ id: s.id, name: s.name, owner: s.owner_id })));
  }
}

debug();
