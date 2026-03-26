'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, CheckCircle, AlertTriangle, Loader2, Download, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'

type Row = Record<string, string>
type ImportResult = { success: number; errors: string[] }

function parseCSV(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  // Detecta delimitador: conta vírgulas vs ponto-e-vírgula na primeira linha
  const firstLine = lines[0]
  const commaCount = (firstLine.match(/,/g) || []).length
  const semiCount = (firstLine.match(/;/g) || []).length
  const delimiter = semiCount > commaCount ? ';' : ','

  // Parser robusto que lida com aspas, vírgulas internas e o delimitador detectado
  const parseLine = (line: string) => {
    const result = []
    let cur = '', inQuote = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i], next = line[i+1]
      // Lida com aspas duplas escapadas ("")
      if (char === '"' && inQuote && next === '"') { cur += '"'; i++ }
      else if (char === '"') { inQuote = !inQuote }
      else if (char === delimiter && !inQuote) { result.push(cur.trim()); cur = '' }
      else { cur += char }
    }
    result.push(cur.trim())
    return result.map(v => v.replace(/^"|"$/g, '').trim())
  }

  const headers = parseLine(lines[0])
  const data = lines.slice(1).map(line => {
    const values = parseLine(line)
    const row: Row = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  })
  
  console.log(`[CSV Import] Parsed ${data.length} rows using delimiter "${delimiter}"`)
  return data
}

function get(row: Row, ...keys: string[]): string | null {
  for (const k of keys) {
    const found = Object.keys(row).find(rk => {
      const rkl = rk.toLowerCase().replace(/\s+/g, '').trim()
      const kl = k.toLowerCase().replace(/\s+/g, '').trim()
      return rkl === kl
    })
    if (found && row[found]?.trim()) return row[found].trim()
  }
  return null
}

function mapCliente(row: Row) {
  return {
    display_name: get(row,'nome','name','display_name','cliente','nome completo','full_name','username','user_name') || '',
    email:        get(row,'email','e-mail','mail','correo') || null,
    phone:        get(row,'telefone','phone','fone','celular','whatsapp','wa','cell','mobile','phoneNumber','phone_number') || null,
    cpf:          get(row,'cpf','document','documento') || null,
    dob:          get(row,'nascimento','dob','data de nascimento','birth','birthday') || null,
    address:      get(row,'endereco','endereço','address','location') || null,
    notes:        get(row,'observacoes','observações','notes','obs','description','comentario') || null,
  }
}

function mapLead(row: Row) {
  return {
    name:            get(row,'nome','name','lead','nome completo','full_name') || '',
    email:           get(row,'email','e-mail','mail','correo') || null,
    phone:           get(row,'telefone','phone','celular','whatsapp','wa','cell','mobile','phoneNumber','phone_number') || null,
    source:          get(row,'origem','source','canal','midia','utm_source') || 'Importação',
    status:          get(row,'status','etapa','stage','fase','lead_status','funil','leadstage','state','pipeline','funil_posicao','segmentation','status(funil)') || 'Novo Lead',
    owner:           get(row,'responsavel','responsável','owner','assigned_to') || 'Não atribuído',
    potential_value: parseFloat(get(row,'valor','value','potential_value','price','orcamento','orçamento') || '0') || 0,
    notes:           get(row,'observacoes','observações','notes','obs','description','comentario') || null,
  }
}

function downloadCSV(type: 'clientes' | 'leads') {
  const headers = type === 'clientes'
    ? 'Nome,Email,Telefone,CPF,Nascimento,Endereço,Observações'
    : 'Nome,Email,Telefone,Origem,Status,Valor Potencial,Observações'
  const example = type === 'clientes'
    ? 'Maria da Silva,maria@email.com,44999990000,000.000.000-00,1990-05-15,Rua das Flores 123,Cliente VIP'
    : 'Ana Lima,ana@email.com,44988880000,WhatsApp,Novo Lead,500,Interesse em botox'
  const csv = `${headers}\n${example}`
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `modelo_${type}.csv`
  a.click()
}

export default function ImportarPage() {
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [type, setType] = useState<'clientes' | 'leads'>('clientes')
  const [preview, setPreview] = useState<Row[]>([])
  const [allRows, setAllRows] = useState<Row[]>([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)
    const text = await file.text()
    const rows = parseCSV(text)
    setAllRows(rows)
    setPreview(rows.slice(0, 5))
    setStep('preview')
  }

  async function handleImport() {
    setLoading(true)
    let success = 0
    let skipped = 0
    const errors: string[] = []
    
    // Busca as etapas atuais para normalização de status
    const { data: stages } = await supabase.from('lead_stages').select('name, order').order('order')
    let stageNames = stages?.map(s => s.name) || []
    const defaultStage = stageNames[0] || 'Novo Lead'

    // Busca contatos existentes para evitar duplicados (por telefone ou e-mail)
    const table = type === 'clientes' ? 'clients' : 'leads'
    const { data: existing } = await supabase.from(table).select('phone, email')
    const existingPhones = new Set(existing?.map(e => e.phone?.replace(/\D/g, '')).filter(Boolean))
    const existingEmails = new Set(existing?.map(e => e.email?.toLowerCase().trim()).filter(Boolean))

    // Cria etapas faltantes se for importação de leads
    if (type === 'leads') {
      const csvStages = Array.from(new Set(allRows.map(mapLead).map(r => r.status).filter(Boolean)))
      console.log('Statuses encontrados no CSV:', csvStages)
      const missing = csvStages.filter(cs => !stageNames.some(sn => sn.toLowerCase().trim() === cs.toLowerCase().trim()))
      console.log('Etapas faltantes:', missing)
      
      if (missing.length > 0) {
        const lastOrder = stages?.length ? Math.max(...stages.map(s => s.order)) : -1
        const newStages = missing.map((name, i) => ({ name, order: lastOrder + 1 + i, color: '#c99318' }))
        console.log('Criando novas etapas:', newStages)
        const { error: stageError } = await supabase.from('lead_stages').insert(newStages)
        
        if (!stageError) {
          const { data: updatedStages } = await supabase.from('lead_stages').select('name').order('order')
          stageNames = updatedStages?.map(s => s.name) || []
          console.log('Etapas atualizadas no banco:', stageNames)
          alert(`Sucesso: ${newStages.length} novas etapas criadas: ${missing.join(', ')}`)
        } else {
          console.error('Erro ao criar etapas:', stageError)
          alert(`Erro ao criar etapas: ${stageError.message}`)
          errors.push(`Erro ao criar etapas: ${stageError.message}`)
        }
      }
    }

    const BATCH = 50
    for (let i = 0; i < allRows.length; i += BATCH) {
      const batch = allRows.slice(i, i + BATCH)
      let records: any[] = type === 'clientes' 
        ? batch.map(mapCliente).filter(r => r.display_name)
        : batch.map(mapLead).filter(r => r.name).map(r => {
             const rawStatus = r.status
             const matched = stageNames.find(s => s.toLowerCase().trim() === rawStatus.toLowerCase().trim())
             return { ...r, status: matched || defaultStage }
           })

      // Filtra duplicados
      const initialCount = records.length
      records = records.filter(r => {
        const p = r.phone?.replace(/\D/g, '')
        const e = r.email?.toLowerCase().trim()
        const isDuplicate = (p && existingPhones.has(p)) || (e && existingEmails.has(e))
        return !isDuplicate
      })
      skipped += (initialCount - records.length)

      if (!records.length) continue
      
      const { error } = await supabase.from(table).insert(records as any)
      if (error) errors.push(`Linhas ${i+1}-${i+batch.length}: ${error.message}`)
      else success += records.length
    }
    setResult({ success, errors })
    setLoading(false)
    setStep('done')
    if (skipped > 0) console.log(`[Import] Pulados ${skipped} registros já existentes.`)
  }

  function reset() {
    setStep('upload'); setPreview([]); setAllRows([]); setFileName(''); setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const headers = preview[0] ? Object.keys(preview[0]) : []

  return (
    <div style={{ padding:'2rem', maxWidth:'820px' }}>
      <div style={{ marginBottom:'2rem' }}>
        <h1 style={{ fontFamily:'Cormorant Garamond, serif', fontSize:'2.2rem', fontWeight:300, color:'#f0ebe0' }}>Importar Dados</h1>
        <div style={{ height:'1px', marginTop:'0.5rem', width:'120px', background:'linear-gradient(90deg, rgba(201,147,24,0.4), transparent)' }} />
        <p style={{ marginTop:'0.75rem', fontSize:'13px', color:'#9a9080', maxWidth:'480px' }}>
          Importe clientes ou leads a partir de um arquivo CSV.
        </p>
      </div>

      <div style={{ display:'flex', gap:'8px', marginBottom:'1.5rem' }}>
        {(['clientes','leads'] as const).map(t => (
          <button key={t} onClick={() => { setType(t); reset() }}
            style={{ padding:'8px 20px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:500, background: type===t ? 'var(--gold)' : 'rgba(255,255,255,0.05)', color: type===t ? '#0d0d0d' : '#9a9080', transition:'all .15s' }}>
            {t === 'clientes' ? 'Clientes' : 'Leads'}
          </button>
        ))}
        <button onClick={() => downloadCSV(type)} className="btn-ghost" style={{ marginLeft:'auto', fontSize:'12px', gap:'6px' }}>
          <Download size={13} />Baixar modelo CSV
        </button>
      </div>

      {step === 'upload' && (
        <div className="card">
          <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'1rem', padding:'3rem 2rem', cursor:'pointer', borderRadius:'0.75rem', border:'2px dashed rgba(201,147,24,0.2)', transition:'border-color .2s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(201,147,24,0.4)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor='rgba(201,147,24,0.2)')}>
            <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'rgba(201,147,24,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <FileSpreadsheet size={24} style={{ color:'var(--gold)' }} />
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'14px', fontWeight:500, color:'#f0ebe0', marginBottom:'4px' }}>Clique para selecionar o arquivo</div>
              <div style={{ fontSize:'12px', color:'#7a7060' }}>CSV (.csv) — máx. 10.000 linhas</div>
            </div>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display:'none' }} />
          </label>
        </div>
      )}

      {step === 'preview' && preview.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <div className="card" style={{ padding:'1.25rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.75rem' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:500, color:'#f0ebe0' }}>{fileName}</div>
                <div style={{ fontSize:'12px', color:'#9a9080', marginTop:'2px' }}>{allRows.length} linha(s) — prévia das primeiras 5</div>
              </div>
              <button onClick={reset} style={{ background:'none', border:'none', color:'#7a7060', cursor:'pointer', fontSize:'12px' }}>Trocar arquivo</button>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table className="table-base">
                <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>{headers.map(h => <td key={h} style={{ color:'#c8c0b0', maxWidth:'140px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row[h]||'—'}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ padding:'10px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:'8px', fontSize:'12px', color:'#a09080' }}>
            <strong style={{ color:'var(--gold)', display:'block', marginBottom:'6px', fontSize:'11px', textTransform:'uppercase' }}>Colunas detectadas no arquivo</strong>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
              {headers.map(h => {
                const hl = h.toLowerCase().replace(/\s+/g, '').trim()
                const isMapped = type === 'clientes' 
                  ? ['nome','name','display_name','cliente','nomecompleto','fullname','username','user_name','email','e-mail','mail','correo','telefone','phone','fone','celular','whatsapp','wa','cell','mobile','phonenumber','phone_number','cpf','document','documento','nascimento','dob','datadenascimento','birth','birthday','endereco','endereço','address','location', 'observacoes','observações','notes','obs','description','comentario'].includes(hl)
                  : ['nome','name','lead','nomecompleto','fullname','email','e-mail','mail','correo','telefone','phone','celular','whatsapp','wa','cell','mobile','phonenumber','phone_number','origem','source','canal','midia','utm_source','status','etapa','stage','fase','lead_status','funil','leadstage','state','pipeline','funil_posicao','segmentation','status(funil)','valor','value','potential_value','price','orcamento','orçamento','observacoes','observações','notes','obs','description','comentario'].includes(hl)
                return (
                  <span key={h} title={isMapped ? 'Coluna mapeada' : 'Coluna ignorada'} 
                    style={{ color: isMapped ? '#34d399' : '#7a7060', background: isMapped ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)', padding:'2px 8px', borderRadius:'4px', border: isMapped ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(255,255,255,0.05)', fontSize:'11px' }}>
                    {h}
                  </span>
                )
              })}
            </div>
            {!headers.some(h => ['status','etapa','stage','fase','lead_status','funil','leadstage','state','pipeline','funil_posicao','segmentation','status(funil)'].includes(h.toLowerCase().trim())) && type === 'leads' && (
              <div style={{ marginTop:'8px', color:'#f87171', fontSize:'11px', display:'flex', alignItems:'center', gap:'4px' }}>
                <AlertTriangle size={12} /> Nenhuma coluna de "Status/Etapa" detectada. Os leads serão criados como "Novo Lead".
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'flex-end' }}>
            <button onClick={reset} className="btn-ghost">Cancelar</button>
            <button onClick={handleImport} disabled={loading} className="btn-primary">
              {loading ? <><Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} />Importando...</> : <><Upload size={14} />Confirmar importação</>}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && result && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {result.success > 0 && (
            <div style={{ padding:'1.25rem 1.5rem', background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:'10px', display:'flex', alignItems:'center', gap:'12px' }}>
              <CheckCircle size={20} style={{ color:'#34d399', flexShrink:0 }} />
              <div>
                <div style={{ fontSize:'14px', fontWeight:500, color:'#34d399' }}>{result.success} {type === 'clientes' ? 'cliente(s)' : 'lead(s)'} importado(s)!</div>
                <div style={{ fontSize:'12px', color:'#9a9080', marginTop:'2px' }}>Disponíveis imediatamente no sistema.</div>
              </div>
            </div>
          )}
          {result.errors.length > 0 && (
            <div style={{ padding:'1.25rem 1.5rem', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'10px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                <AlertTriangle size={16} style={{ color:'#f87171' }} />
                <span style={{ fontSize:'13px', fontWeight:500, color:'#f87171' }}>{result.errors.length} erro(s)</span>
              </div>
              {result.errors.map((err, i) => <div key={i} style={{ fontSize:'12px', color:'#9a9080', padding:'4px 0', borderTop:'1px solid rgba(239,68,68,0.1)' }}>{err}</div>)}
            </div>
          )}
          <div style={{ display:'flex', gap:'0.75rem' }}>
            <button onClick={reset} className="btn-ghost">Importar mais</button>
            <Link href={`/${type}`} className="btn-primary" style={{ textDecoration:'none' }}>Ver {type === 'clientes' ? 'clientes' : 'leads'} →</Link>
          </div>
        </div>
      )}

      <div className="card" style={{ padding:'1.5rem', marginTop:'2rem' }}>
        <div style={{ fontSize:'11px', fontWeight:500, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--gold)', marginBottom:'1rem' }}>Como preparar o arquivo</div>
        {[
          'Clique em "Baixar modelo CSV" para obter o formato correto',
          'Abra no Excel, Google Sheets ou qualquer editor de planilhas',
          'Preencha a partir da segunda linha — a primeira é o cabeçalho',
          'Salve como CSV (Arquivo → Salvar como → CSV UTF-8)',
          'Faça upload aqui — o sistema mapeia as colunas automaticamente',
        ].map((s, i) => (
          <div key={i} style={{ display:'flex', gap:'12px', alignItems:'flex-start', padding:'6px 0', borderTop: i>0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:'rgba(201,147,24,0.1)', border:'1px solid rgba(201,147,24,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:600, color:'var(--gold)', flexShrink:0, marginTop:'1px' }}>{i+1}</div>
            <div style={{ fontSize:'12px', color:'#9a9080', lineHeight:1.5 }}>{s}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
