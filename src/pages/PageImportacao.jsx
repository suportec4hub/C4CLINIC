import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
const lbl = {
  display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
  fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
}
function focus(e) { e.target.style.borderColor = L.teal }
function blur(e)  { e.target.style.borderColor = L.line }

function Field({ label, children }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  )
}

function Badge({ status }) {
  const map = {
    processando: { bg: L.yellowBg, color: L.yellow, bd: L.yellowBd, label: 'Processando' },
    concluido:   { bg: L.greenBg,  color: L.green,  bd: L.greenBd,  label: 'Concluído'  },
    falha:       { bg: L.redBg,    color: L.red,     bd: L.redBd,    label: 'Falha'      },
  }
  const s = map[status] || map.processando
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, border: `1px solid ${s.bd}`,
    }}>{s.label}</span>
  )
}

/* ─── CSV parse (no external libs) ────────────────────────────────────────── */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (!lines.length) return { headers: [], rows: [] }
  const parseRow = line => {
    const cols = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    cols.push(cur.trim())
    return cols
  }
  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(l => {
    const vals = parseRow(l)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  })
  return { headers, rows }
}

/* ─── import type definitions ─────────────────────────────────────────────── */
const IMPORT_TYPES = [
  {
    id: 'pacientes',
    label: 'Pacientes',
    icon: '👤',
    desc: 'Nome, CPF, data de nascimento, telefone, e-mail, endereço, sexo',
    fields: [
      { key: 'nome',            label: 'Nome',             required: true  },
      { key: 'cpf',             label: 'CPF',              required: false },
      { key: 'data_nascimento', label: 'Data de Nascimento',required: false },
      { key: 'telefone',        label: 'Telefone',         required: false },
      { key: 'email',           label: 'E-mail',           required: false },
      { key: 'endereco',        label: 'Endereço',         required: false },
      { key: 'sexo',            label: 'Sexo',             required: false },
    ],
    table: 'pacientes',
  },
  {
    id: 'medicos',
    label: 'Médicos',
    icon: '🩺',
    desc: 'Nome, CRM, especialidade, telefone, e-mail',
    fields: [
      { key: 'nome',         label: 'Nome',         required: true  },
      { key: 'crm',          label: 'CRM',          required: false },
      { key: 'especialidade',label: 'Especialidade', required: false },
      { key: 'telefone',     label: 'Telefone',     required: false },
      { key: 'email',        label: 'E-mail',       required: false },
    ],
    table: 'medicos',
  },
  {
    id: 'agendamentos',
    label: 'Agendamentos',
    icon: '📅',
    desc: 'Paciente, médico, data, hora, procedimento, status',
    fields: [
      { key: 'paciente',     label: 'Paciente',     required: true  },
      { key: 'medico',       label: 'Médico',       required: false },
      { key: 'data',         label: 'Data',         required: true  },
      { key: 'hora',         label: 'Hora',         required: false },
      { key: 'procedimento', label: 'Procedimento', required: false },
      { key: 'status',       label: 'Status',       required: false },
    ],
    table: null, // not directly inserted in this demo
  },
  {
    id: 'exames',
    label: 'Exames',
    icon: '🔬',
    desc: 'Paciente, tipo de exame, data, resultado, médico solicitante',
    fields: [
      { key: 'paciente',    label: 'Paciente',           required: true  },
      { key: 'tipo_exame',  label: 'Tipo de Exame',      required: true  },
      { key: 'data',        label: 'Data',               required: false },
      { key: 'resultado',   label: 'Resultado',          required: false },
      { key: 'medico',      label: 'Médico Solicitante', required: false },
    ],
    table: null,
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: '💰',
    desc: 'Descrição, valor, categoria, data de vencimento, status de pagamento',
    fields: [
      { key: 'descricao',        label: 'Descrição',           required: true  },
      { key: 'valor',            label: 'Valor',               required: true  },
      { key: 'categoria',        label: 'Categoria',           required: false },
      { key: 'data_vencimento',  label: 'Data de Vencimento',  required: false },
      { key: 'status_pagamento', label: 'Status de Pagamento', required: false },
    ],
    table: null,
  },
]

/* ─── templates ───────────────────────────────────────────────────────────── */
const TEMPLATES = [
  {
    id: 'pacientes',
    label: 'Pacientes',
    icon: '👤',
    headers: ['nome','cpf','data_nascimento','telefone','email','endereco','sexo'],
    samples: [
      ['Maria Silva','123.456.789-00','1985-03-15','(11) 91234-5678','maria@email.com','Rua das Flores, 100','F'],
      ['João Santos','987.654.321-00','1978-07-22','(21) 98765-4321','joao@email.com','Av. Central, 200','M'],
    ],
  },
  {
    id: 'medicos',
    label: 'Médicos',
    icon: '🩺',
    headers: ['nome','crm','especialidade','telefone','email'],
    samples: [
      ['Dr. Carlos Lima','CRM-SP 123456','Cardiologia','(11) 3456-7890','carlos@clinica.com'],
      ['Dra. Ana Costa','CRM-RJ 654321','Pediatria','(21) 2345-6789','ana@clinica.com'],
    ],
  },
  {
    id: 'agendamentos',
    label: 'Agendamentos',
    icon: '📅',
    headers: ['paciente','medico','data','hora','procedimento','status'],
    samples: [
      ['Maria Silva','Dr. Carlos Lima','2025-06-01','09:00','Consulta','agendado'],
      ['João Santos','Dra. Ana Costa','2025-06-02','14:30','Retorno','agendado'],
    ],
  },
]

/* ─── validation ─────────────────────────────────────────────────────────── */
function validateCPF(cpf) {
  if (!cpf) return true // not required here
  const clean = cpf.replace(/\D/g,'')
  return clean.length === 11
}
function validateDate(d) {
  if (!d) return true
  return /^\d{4}-\d{2}-\d{2}$/.test(d) || /^\d{2}\/\d{2}\/\d{4}$/.test(d)
}

function validateRow(row, mapping, typeId) {
  const errs = []
  const typeDef = IMPORT_TYPES.find(t => t.id === typeId)
  if (!typeDef) return errs

  typeDef.fields.forEach(field => {
    const col = mapping[field.key]
    const val = col ? (row[col] || '').trim() : ''
    if (field.required && !val) {
      errs.push(`Campo obrigatório "${field.label}" está vazio`)
    }
    if (typeId === 'pacientes' && field.key === 'cpf' && val && !validateCPF(val)) {
      errs.push(`CPF inválido: "${val}"`)
    }
    if (field.key === 'data_nascimento' && val && !validateDate(val)) {
      errs.push(`Data inválida: "${val}" — use YYYY-MM-DD ou DD/MM/YYYY`)
    }
    if (field.key === 'data' && val && !validateDate(val)) {
      errs.push(`Data inválida: "${val}" — use YYYY-MM-DD ou DD/MM/YYYY`)
    }
  })
  return errs
}

function buildRecord(row, mapping, typeId, clinicaId) {
  const typeDef = IMPORT_TYPES.find(t => t.id === typeId)
  const rec = { clinica_id: clinicaId, ativo: true }
  typeDef.fields.forEach(field => {
    const col = mapping[field.key]
    rec[field.key] = col ? (row[col] || '').trim() || null : null
  })
  // normalize date
  if (rec.data_nascimento && /^\d{2}\/\d{2}\/\d{4}$/.test(rec.data_nascimento)) {
    const [d,m,y] = rec.data_nascimento.split('/')
    rec.data_nascimento = `${y}-${m}-${d}`
  }
  if (rec.data && /^\d{2}\/\d{2}\/\d{4}$/.test(rec.data)) {
    const [d,m,y] = rec.data.split('/')
    rec.data = `${y}-${m}-${d}`
  }
  return rec
}

/* ─── auto-detect column mapping ─────────────────────────────────────────── */
function autoDetect(headers, fields) {
  const mapping = {}
  fields.forEach(field => {
    const key = field.key.toLowerCase()
    const label = field.label.toLowerCase()
    const found = headers.find(h => {
      const hh = h.toLowerCase().replace(/[_\s]/g,'')
      const kk = key.replace(/[_\s]/g,'')
      const ll = label.replace(/[_\s]/g,'')
      return hh === kk || hh === ll || hh.includes(kk) || kk.includes(hh)
    })
    mapping[field.key] = found || ''
  })
  return mapping
}

/* ─── CSV download ────────────────────────────────────────────────────────── */
function downloadCSV(filename, headers, rows) {
  const escape = v => `"${String(v).replace(/"/g,'""')}"`
  const lines = [headers.map(escape).join(',')]
  rows.forEach(r => lines.push(r.map(escape).join(',')))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ─── bottom-sheet modal ─────────────────────────────────────────────────── */
function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: L.bg, borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: wide ? 860 : 580,
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{
            fontSize: 22, color: L.t3, background: 'none', border: 'none', cursor: 'pointer',
          }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  TAB 0 — IMPORTAR DADOS                                                   */
/* ══════════════════════════════════════════════════════════════════════════ */
function TabImportar({ profile }) {
  const [step, setStep]       = useState(1)
  const [typeId, setTypeId]   = useState('pacientes')
  const [file, setFile]       = useState(null)
  const [parsed, setParsed]   = useState(null)   // { headers, rows }
  const [mapping, setMapping] = useState({})
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress]   = useState({ done: 0, total: 0 })
  const [done, setDone]           = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef()

  const typeDef = IMPORT_TYPES.find(t => t.id === typeId)

  // ── parsed validation ──────────────────────────────────────────────────
  const validatedRows = parsed ? parsed.rows.map((row, i) => {
    const errs = validateRow(row, mapping, typeId)
    return { row, errs, idx: i }
  }) : []
  const validRows   = validatedRows.filter(r => r.errs.length === 0)
  const invalidRows = validatedRows.filter(r => r.errs.length > 0)

  // ── file handling ──────────────────────────────────────────────────────
  function handleFile(f) {
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target.result
      const result = parseCSV(text)
      setParsed(result)
      setMapping(autoDetect(result.headers, typeDef.fields))
    }
    reader.readAsText(f, 'UTF-8')
  }

  function onDrop(e) {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  // ── import ─────────────────────────────────────────────────────────────
  async function runImport() {
    if (!typeDef.table) {
      // For types without direct table support, just simulate
      setImporting(true)
      for (let i = 0; i < validRows.length; i++) {
        await new Promise(r => setTimeout(r, 30))
        setProgress({ done: i + 1, total: validRows.length })
      }
      const logData = {
        clinica_id: profile.clinica_id,
        tipo: typeId,
        arquivo_nome: file?.name || 'desconhecido',
        total_linhas: parsed.rows.length,
        importados: validRows.length,
        erros: invalidRows.length,
        status: 'concluido',
        erros_detalhes: invalidRows.slice(0,50).map(r => ({ linha: r.idx+2, erros: r.errs })),
      }
      await supabase.from('importacao_logs').insert(logData)
      setImportResult({ importados: validRows.length, erros: invalidRows.length })
      setImporting(false); setDone(true)
      return
    }

    setImporting(true)
    let importados = 0
    const errosLog = []

    for (let i = 0; i < validRows.length; i++) {
      const { row, idx } = validRows[i]
      const rec = buildRecord(row, mapping, typeId, profile.clinica_id)
      const { error } = await supabase.from(typeDef.table).insert(rec)
      if (error) {
        errosLog.push({ linha: idx + 2, erros: [error.message] })
      } else {
        importados++
      }
      setProgress({ done: i + 1, total: validRows.length })
    }

    const status = errosLog.length === 0 ? 'concluido' : (importados === 0 ? 'falha' : 'concluido')
    const logData = {
      clinica_id: profile.clinica_id,
      tipo: typeId,
      arquivo_nome: file?.name || 'desconhecido',
      total_linhas: parsed.rows.length,
      importados,
      erros: invalidRows.length + errosLog.length,
      status,
      erros_detalhes: [
        ...invalidRows.slice(0,25).map(r => ({ linha: r.idx+2, erros: r.errs })),
        ...errosLog.slice(0,25),
      ],
    }
    await supabase.from('importacao_logs').insert(logData)
    setImportResult({ importados, erros: invalidRows.length + errosLog.length })
    setImporting(false); setDone(true)
  }

  function reset() {
    setStep(1); setFile(null); setParsed(null); setMapping({})
    setDone(false); setImportResult(null); setProgress({ done: 0, total: 0 })
  }

  // ── step indicator ─────────────────────────────────────────────────────
  const steps = ['Selecionar Tipo', 'Upload & Mapeamento', 'Confirmar & Importar']

  return (
    <div>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
        {steps.map((s, i) => {
          const n = i + 1
          const active = step === n
          const done_  = step > n
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
                  background: done_ ? L.green : active ? L.teal : L.surface,
                  color: (done_ || active) ? L.white : L.t3,
                  border: `2px solid ${done_ ? L.green : active ? L.teal : L.line}`,
                  transition: 'all 0.2s',
                }}>
                  {done_ ? '✓' : n}
                </div>
                <div style={{ fontSize: 11, color: active ? L.teal : L.t4, fontWeight: active ? 600 : 400,
                  fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                  {s}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1, height: 2, margin: '0 8px', marginBottom: 22,
                  background: step > n + 1 ? L.green : step > n ? L.teal : L.line,
                  transition: 'background 0.3s',
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: L.t1, marginBottom: 16 }}>
            Selecione o tipo de dado a importar
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {IMPORT_TYPES.map(t => (
              <div key={t.id} onClick={() => setTypeId(t.id)} style={{
                padding: '16px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
                border: `2px solid ${typeId === t.id ? L.teal : L.line}`,
                background: typeId === t.id ? L.tealBg : L.surface,
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{t.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: typeId === t.id ? L.teal : L.t1, marginBottom: 4 }}>
                  {t.label}
                </div>
                <div style={{ fontSize: 12, color: L.t4, lineHeight: 1.5 }}>{t.desc}</div>
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {IMPORT_TYPES.find(x => x.id === t.id).fields.filter(f => f.required).map(f => (
                    <span key={f.key} style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 8,
                      background: L.tealBg, color: L.teal, fontWeight: 600,
                    }}>
                      {f.label}*
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <button onClick={() => setStep(2)} style={{
              padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
            }}>
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div>
          {/* Upload zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${dragOver ? L.teal : file ? L.green : L.line}`,
              borderRadius: 12, padding: '40px 24px', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.2s', marginBottom: 24,
              background: dragOver ? L.tealBg : file ? L.greenBg : L.surface,
            }}
          >
            <input
              ref={fileRef} type="file" accept=".csv,.xlsx"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />
            <div style={{ fontSize: 36, marginBottom: 10 }}>{file ? '✅' : '📂'}</div>
            {file ? (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: L.green }}>{file.name}</div>
                <div style={{ fontSize: 12, color: L.t4, marginTop: 4 }}>
                  {parsed ? `${parsed.rows.length} linhas detectadas` : 'Processando…'}
                </div>
                <div style={{ fontSize: 12, color: L.t4, marginTop: 2 }}>
                  Clique para trocar o arquivo
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: L.t1, marginBottom: 6 }}>
                  Arraste seu arquivo CSV aqui ou clique para selecionar
                </div>
                <div style={{ fontSize: 12, color: L.t4 }}>Aceita .csv e .xlsx</div>
              </div>
            )}
          </div>

          {/* Preview table */}
          {parsed && parsed.rows.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: L.t2, marginBottom: 10 }}>
                Prévia dos dados (primeiras 5 linhas)
              </div>
              <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${L.line}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: L.surface }}>
                      {parsed.headers.map(h => (
                        <th key={h} style={{
                          padding: '8px 12px', textAlign: 'left', color: L.t3, fontWeight: 600,
                          borderBottom: `1px solid ${L.line}`, whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0,5).map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${L.lineSoft}` }}>
                        {parsed.headers.map(h => (
                          <td key={h} style={{ padding: '8px 12px', color: L.t2, maxWidth: 180,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Column mapping */}
          {parsed && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: L.t2, marginBottom: 12 }}>
                Mapeamento de colunas — arraste ou selecione qual coluna do CSV corresponde a cada campo
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {typeDef.fields.map(field => (
                  <Field key={field.key} label={`${field.label}${field.required ? ' *' : ''}`}>
                    <select
                      value={mapping[field.key] || ''}
                      onChange={e => setMapping(m => ({ ...m, [field.key]: e.target.value }))}
                      onFocus={focus} onBlur={blur}
                      style={{ ...inp, cursor: 'pointer' }}
                    >
                      <option value="">— não mapear —</option>
                      {parsed.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>

              {/* Validation summary */}
              {validatedRows.length > 0 && (
                <div style={{
                  marginTop: 20, padding: '12px 16px', borderRadius: 10,
                  background: L.surface, border: `1px solid ${L.line}`,
                  display: 'flex', gap: 24, alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: L.green }}>{validRows.length}</div>
                    <div style={{ fontSize: 11, color: L.t4 }}>válidos</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: invalidRows.length ? L.red : L.t4 }}>
                      {invalidRows.length}
                    </div>
                    <div style={{ fontSize: 11, color: L.t4 }}>com erros</div>
                  </div>
                  {invalidRows.length > 0 && (
                    <div style={{ flex: 1, fontSize: 12, color: L.red }}>
                      {invalidRows.slice(0,3).map(r => (
                        <div key={r.idx}>Linha {r.idx + 2}: {r.errs[0]}</div>
                      ))}
                      {invalidRows.length > 3 && (
                        <div style={{ color: L.t4 }}>+{invalidRows.length - 3} mais…</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button onClick={() => setStep(1)} style={{
              padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
              background: L.surface, color: L.t2, border: `1.5px solid ${L.line}`, cursor: 'pointer',
            }}>← Voltar</button>
            <button
              onClick={() => setStep(3)}
              disabled={!parsed || validRows.length === 0}
              style={{
                padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: (!parsed || validRows.length === 0) ? L.line : L.teal,
                color: L.white, border: 'none', cursor: (!parsed || validRows.length === 0) ? 'not-allowed' : 'pointer',
              }}
            >
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <div>
          {done ? (
            /* Success / Result screen */
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>
                {importResult.erros === 0 ? '✅' : '⚠️'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: L.t1, marginBottom: 8 }}>
                Importação concluída!
              </div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 24 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: L.green }}>{importResult.importados}</div>
                  <div style={{ fontSize: 12, color: L.t4 }}>importados</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: importResult.erros ? L.red : L.t4 }}>
                    {importResult.erros}
                  </div>
                  <div style={{ fontSize: 12, color: L.t4 }}>erros</div>
                </div>
              </div>
              <button onClick={reset} style={{
                padding: '12px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
              }}>
                Nova Importação
              </button>
            </div>
          ) : (
            <div>
              {/* Summary */}
              <div style={{
                padding: '20px', borderRadius: 12, background: L.surface,
                border: `1px solid ${L.line}`, marginBottom: 20,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: L.t1, marginBottom: 12 }}>
                  Resumo da Importação
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: L.t4, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                      TIPO
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: L.t1 }}>{typeDef.label}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: L.t4, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                      ARQUIVO
                    </div>
                    <div style={{ fontSize: 13, color: L.t2, wordBreak: 'break-all' }}>{file?.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: L.t4, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                      TOTAL DE LINHAS
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: L.t1 }}>{parsed?.rows.length}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
                  <div style={{
                    flex: 1, padding: '12px', borderRadius: 8, background: L.greenBg,
                    border: `1px solid ${L.greenBd}`, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: L.green }}>{validRows.length}</div>
                    <div style={{ fontSize: 11, color: L.t4 }}>serão importados</div>
                  </div>
                  <div style={{
                    flex: 1, padding: '12px', borderRadius: 8, textAlign: 'center',
                    background: invalidRows.length ? L.redBg : L.surface,
                    border: `1px solid ${invalidRows.length ? L.redBd : L.line}`,
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: invalidRows.length ? L.red : L.t4 }}>
                      {invalidRows.length}
                    </div>
                    <div style={{ fontSize: 11, color: L.t4 }}>serão ignorados (erros)</div>
                  </div>
                </div>
              </div>

              {/* Error list */}
              {invalidRows.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: L.red, marginBottom: 8 }}>
                    Linhas com erros (primeiras {Math.min(10, invalidRows.length)})
                  </div>
                  <div style={{
                    maxHeight: 200, overflowY: 'auto', borderRadius: 8,
                    border: `1px solid ${L.redBd}`, background: L.redBg,
                  }}>
                    {invalidRows.slice(0,10).map(r => (
                      <div key={r.idx} style={{
                        padding: '8px 12px', borderBottom: `1px solid ${L.redBd}`,
                        fontSize: 12, color: L.red, display: 'flex', gap: 10,
                      }}>
                        <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Linha {r.idx + 2}:</span>
                        <span>{r.errs.join('; ')}</span>
                      </div>
                    ))}
                    {invalidRows.length > 10 && (
                      <div style={{ padding: '8px 12px', fontSize: 12, color: L.t4 }}>
                        +{invalidRows.length - 10} linhas com erros adicionais…
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Progress bar */}
              {importing && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 12, color: L.t3 }}>
                      Importando… {progress.done}/{progress.total}
                    </div>
                    <div style={{ fontSize: 12, color: L.teal, fontWeight: 600 }}>
                      {Math.round((progress.done / (progress.total || 1)) * 100)}%
                    </div>
                  </div>
                  <div style={{
                    height: 8, borderRadius: 4, background: L.line, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 4, background: L.teal, transition: 'width 0.2s',
                      width: `${Math.round((progress.done / (progress.total || 1)) * 100)}%`,
                    }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <button onClick={() => setStep(2)} disabled={importing} style={{
                  padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  background: L.surface, color: L.t2, border: `1.5px solid ${L.line}`,
                  cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.5 : 1,
                }}>← Voltar</button>
                <button
                  onClick={runImport}
                  disabled={importing || validRows.length === 0}
                  style={{
                    padding: '10px 28px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                    background: (importing || validRows.length === 0) ? L.line : L.teal,
                    color: L.white, border: 'none',
                    cursor: (importing || validRows.length === 0) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {importing && (
                    <span style={{ width: 14, height: 14, border: `2px solid ${L.white}`,
                      borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block',
                      animation: 'spin 0.7s linear infinite' }} />
                  )}
                  {importing ? 'Importando…' : `Importar ${validRows.length} registro${validRows.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  TAB 1 — HISTÓRICO                                                        */
/* ══════════════════════════════════════════════════════════════════════════ */
function TabHistorico({ profile }) {
  const [logs, setLogs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [erroModal, setErroModal] = useState(null) // log object

  useEffect(() => { loadLogs() }, [])

  async function loadLogs() {
    setLoading(true)
    const { data } = await supabase
      .from('importacao_logs')
      .select('*')
      .eq('clinica_id', profile.clinica_id)
      .order('criado_em', { ascending: false })
      .limit(100)
    setLogs(data || [])
    setLoading(false)
  }

  function fmt(ts) {
    if (!ts) return '—'
    const d = new Date(ts)
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const typeLabel = id => IMPORT_TYPES.find(t => t.id === id)?.label || id

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: L.t1 }}>Histórico de Importações</div>
        <button onClick={loadLogs} style={{
          padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: L.surface, color: L.t2, border: `1.5px solid ${L.line}`, cursor: 'pointer',
        }}>↻ Atualizar</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: L.t4 }}>
          <span style={{ display: 'inline-block', width: 20, height: 20,
            border: `2px solid ${L.teal}`, borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
      ) : logs.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, color: L.t3 }}>Nenhuma importação realizada ainda</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${L.line}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: L.surface }}>
                {['Data','Tipo','Arquivo','Total','Importados','Erros','Status',''].map((h,i) => (
                  <th key={i} style={{
                    padding: '10px 14px', textAlign: 'left', color: L.t4, fontWeight: 600,
                    fontSize: 11, borderBottom: `1px solid ${L.line}`,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: `1px solid ${L.lineSoft}` }}>
                  <td style={{ padding: '10px 14px', color: L.t3, whiteSpace: 'nowrap' }}>{fmt(log.criado_em)}</td>
                  <td style={{ padding: '10px 14px', color: L.t1, fontWeight: 500 }}>{typeLabel(log.tipo)}</td>
                  <td style={{ padding: '10px 14px', color: L.t3, maxWidth: 180,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.arquivo_nome}
                  </td>
                  <td style={{ padding: '10px 14px', color: L.t2, textAlign: 'right' }}>{log.total_linhas ?? '—'}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <span style={{ color: L.green, fontWeight: 600 }}>{log.importados ?? 0}</span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <span style={{ color: log.erros ? L.red : L.t4, fontWeight: log.erros ? 600 : 400 }}>
                      {log.erros ?? 0}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}><Badge status={log.status} /></td>
                  <td style={{ padding: '10px 14px' }}>
                    {(log.erros_detalhes?.length > 0) && (
                      <button onClick={() => setErroModal(log)} style={{
                        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        background: L.redBg, color: L.red, border: `1px solid ${L.redBd}`, cursor: 'pointer',
                      }}>Ver Erros</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Error details modal */}
      {erroModal && (
        <Modal title={`Erros — ${erroModal.arquivo_nome}`} onClose={() => setErroModal(null)} wide>
          <div style={{ marginBottom: 12, fontSize: 13, color: L.t3 }}>
            {erroModal.erros_detalhes?.length} registro(s) com problema
          </div>
          <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${L.line}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: L.surface }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: L.t4,
                    borderBottom: `1px solid ${L.line}`, fontWeight: 600, width: 80 }}>Linha</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: L.t4,
                    borderBottom: `1px solid ${L.line}`, fontWeight: 600 }}>Erros</th>
                </tr>
              </thead>
              <tbody>
                {(erroModal.erros_detalhes || []).map((e, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${L.lineSoft}` }}>
                    <td style={{ padding: '8px 12px', color: L.t3, fontWeight: 600 }}>{e.linha}</td>
                    <td style={{ padding: '8px 12px', color: L.red }}>
                      {Array.isArray(e.erros) ? e.erros.join('; ') : String(e.erros || '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  TAB 2 — TEMPLATES                                                        */
/* ══════════════════════════════════════════════════════════════════════════ */
function TabTemplates() {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: L.t1, marginBottom: 6 }}>
        Templates para Importação
      </div>
      <div style={{ fontSize: 13, color: L.t4, marginBottom: 24 }}>
        Baixe os modelos CSV com exemplos de dados para facilitar a importação.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {TEMPLATES.map(tmpl => (
          <div key={tmpl.id} style={{
            borderRadius: 12, border: `1px solid ${L.line}`,
            background: L.surface, overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px', background: L.tealBg,
              borderBottom: `1px solid ${L.line}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 22 }}>{tmpl.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: L.teal }}>{tmpl.label}</div>
                <div style={{ fontSize: 11, color: L.t4, marginTop: 2 }}>
                  {tmpl.headers.length} colunas
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {/* Column list */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: L.t4, marginBottom: 8,
                  fontFamily: "'JetBrains Mono', monospace" }}>COLUNAS ESPERADAS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tmpl.headers.map(h => (
                    <span key={h} style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 6,
                      background: L.bg, border: `1px solid ${L.line}`,
                      color: L.t2, fontFamily: "'JetBrains Mono', monospace",
                    }}>{h}</span>
                  ))}
                </div>
              </div>

              {/* Sample table */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: L.t4, marginBottom: 8,
                  fontFamily: "'JetBrains Mono', monospace" }}>EXEMPLO DE DADOS</div>
                <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${L.line}` }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: L.bg }}>
                        {tmpl.headers.map(h => (
                          <th key={h} style={{
                            padding: '5px 8px', textAlign: 'left', color: L.t4, fontWeight: 600,
                            borderBottom: `1px solid ${L.line}`, whiteSpace: 'nowrap',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tmpl.samples.map((row, i) => (
                        <tr key={i} style={{ borderBottom: i < tmpl.samples.length-1 ? `1px solid ${L.lineSoft}` : 'none' }}>
                          {row.map((cell, j) => (
                            <td key={j} style={{
                              padding: '5px 8px', color: L.t3, whiteSpace: 'nowrap',
                              maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Download button */}
              <button
                onClick={() => downloadCSV(
                  `template_${tmpl.id}.csv`,
                  tmpl.headers,
                  tmpl.samples,
                )}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: L.teal, color: L.white, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                ⬇ Baixar Template CSV
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  PAGE ROOT                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */
export default function PageImportacao({ profile }) {
  const [tab, setTab] = useState(0)

  const tabs = [
    { label: 'Importar Dados',         icon: '⬆' },
    { label: 'Histórico de Importações', icon: '📋' },
    { label: 'Templates',              icon: '📄' },
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 0 40px' }}>
      <style>{`
        @keyframes up   { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes spin { from { transform: rotate(0deg) }                  to { transform: rotate(360deg) } }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: L.t1, marginBottom: 4 }}>
          Importação de Dados
        </div>
        <div style={{ fontSize: 13, color: L.t4 }}>
          Migre dados de outros sistemas via CSV ou Excel
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 28,
        borderBottom: `1px solid ${L.line}`, paddingBottom: 0,
      }}>
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding: '10px 18px', borderRadius: '8px 8px 0 0', fontSize: 13, fontWeight: 600,
            background: tab === i ? L.surface : 'transparent',
            color: tab === i ? L.teal : L.t3,
            border: `1.5px solid ${tab === i ? L.line : 'transparent'}`,
            borderBottom: tab === i ? `1.5px solid ${L.surface}` : 'none',
            cursor: 'pointer', marginBottom: -1.5,
            transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{
        background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`,
        padding: '28px 28px',
      }}>
        {tab === 0 && <TabImportar profile={profile} />}
        {tab === 1 && <TabHistorico profile={profile} />}
        {tab === 2 && <TabTemplates />}
      </div>
    </div>
  )
}
