const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkData() {
  try {
    console.log('--- Checking recent messages ---')
    const { data: messages, error: mError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .order('sent_date', { ascending: false })
      .limit(5)

    if (mError) console.error('Error fetching messages:', mError)
    else console.log('Recent messages:', JSON.stringify(messages, null, 2))

    console.log('\n--- Checking profiles ---')
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('id, display_name, whatsapp_number, role')

    if (pError) console.error('Error fetching profiles:', pError)
    else console.log('Profiles:', JSON.stringify(profiles, null, 2))
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

checkData()
