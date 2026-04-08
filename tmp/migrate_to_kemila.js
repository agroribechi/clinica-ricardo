
const { createClient } = require('@supabase/supabase-js');

async function migrate() {
  const supabase = createClient(
    'https://oiacdxclurktikmpyivu.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pYWNkeGNsdXJrdGlrbXB5aXZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDIyMzQ4MiwiZXhwIjoyMDg5Nzk5NDgyfQ.tVMknek-vk-sWSwmqrsVWaQJoWvWwslC9Igi_Sj72Lw'
  );

  const KEMILA_ID = '55498450-2620-44ac-b2cd-88d67ba34f19';

  console.log('--- Iniciando Migração para Kemila ---');

  // 1. Atualizar Leads
  const { data: leads, error: leadError } = await supabase
    .from('leads')
    .update({ owner_id: KEMILA_ID })
    .or(`owner_id.is.null,owner_id.neq.${KEMILA_ID}`)
    .select('id');

  if (leadError) {
    console.error('Erro ao atualizar leads:', JSON.stringify(leadError, null, 2));
  } else {
    console.log(`Atualizados ${leads.length} leads.`);
  }

  // 2. Atualizar Etapas (Lead Stages)
  const { data: stages, error: stageError } = await supabase
    .from('lead_stages')
    .update({ owner_id: KEMILA_ID })
    .or(`owner_id.is.null,owner_id.neq.${KEMILA_ID}`)
    .select('id');

  if (stageError) {
    console.error('Erro ao atualizar etapas:', JSON.stringify(stageError, null, 2));
  } else {
    console.log(`Atualizadas ${stages.length} etapas.`);
  }

  console.log('--- Migração Concluída ---');
}

migrate();
