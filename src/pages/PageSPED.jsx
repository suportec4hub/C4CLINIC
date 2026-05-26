import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── Constants ───────────────────────────────────────────────────────────────

const TIPOS_OBRIG = [
  'sped_contabil', 'sped_fiscal', 'ecd', 'ecf',
  'reinf', 'esocial', 'dctf', 'dasn', 'defis'
]

const TIPO_META = {
  sped_contabil: { label: 'SPED Contábil',  color: L.blue,   bg: L.blueBg   },
  sped_fiscal:   { label: 'SPED Fiscal',    color: L.purple, bg: L.purpleBg },
  ecd:           { label: 'ECD',            color: '#0369a1', bg: '#e0f2fe'  },
  ecf:           { label: 'ECF',            color: L.teal,   bg: L.tealBg   },
  reinf:         { label: 'EFD-REINF',      color: L.orange, bg: L.orangeBg },
  esocial:       { label: 'eSocial',        color: L.green,  bg: L.greenBg  },
  dctf:          { label: 'DCTF',           color: '#ca8a04', bg: '#fef9c3' },
  dasn:          { label: 'DASN-SIMEI',     color: '#9333ea', bg: '#f3e8ff' },
  defis:         { label: 'DEFIS',          color: '#0f766e', bg: '#ccfbf1' },
}

const STATUS_OBRIG = {
  pendente:     { label: 'Pendente',     color: L.red,    bg: L.redBg    },
  gerado:       { label: 'Gerado',       color: L.blue,   bg: L.blueBg   },
  validado:     { label: 'Validado',     color: L.yellow, bg: L.yellowBg },
  transmitido:  { label: 'Transmitido',  color: L.green,  bg: L.greenBg  },
  retificado:   { label: 'Retificado',   color: L.orange, bg: L.orangeBg },
}

const TIPOS_EVENTO_REINF = [
  { value: 'r1000', label: 'R-1000 – Informações do Contribuinte' },
  { value: 'r1070', label: 'R-1070 – Processos Administrativos/Judiciais' },
  { value: 'r2010', label: 'R-2010 – Ret. INSS – Serviços Tomados' },
  { value: 'r2020', label: 'R-2020 – Ret. INSS – Serviços Prestados' },
  { value: 'r2030', label: 'R-2030 – Recursos Recebidos por Associação Desportiva' },
  { value: 'r2040', label: 'R-2040 – Recursos Repassados p/ Associação Desportiva' },
  { value: 'r2050', label: 'R-2050 – Comercialização da Produção Rural' },
  { value: 'r2055', label: 'R-2055 – Aquisição de Produção Rural' },
  { value: 'r2060', label: 'R-2060 – Contribuição Previdenciária sobre Receita Bruta' },
  { value: 'r2070', label: 'R-2070 – Retenções na Fonte (IR, CSLL, PIS, COFINS)' },
  { value: 'r2098', label: 'R-2098 – Reabertura dos Eventos Periódicos' },
  { value: 'r2099', label: 'R-2099 – Fechamento dos Eventos Periódicos' },
  { value: 'r4010', label: 'R-4010 – IRRF – Beneficiário PF' },
  { value: 'r4020', label: 'R-4020 – IRRF – Beneficiário PJ' },
  { value: 'r4040', label: 'R-4040 – Beneficiários Não Identificados' },
  { value: 'r4080', label: 'R-4080 – Retenção no Recebimento' },
  { value: 'r9000', label: 'R-9000 – Exclusão de Eventos' },
  { value: 'r9001', label: 'R-9001 – Informações por Contribuinte' },
  { value: 'r9011', label: 'R-9011 – Informações por Contribuinte' },
]

const STATUS_EVENTO = {
  aberto:      { label: 'Aberto',      color: L.blue,   bg: L.blueBg   },
  fechado:     { label: 'Fechado',     color: L.yellow, bg: L.yellowBg },
  enviado:     { label: 'Enviado',     color: L.teal,   bg: L.tealBg   },
  processado:  { label: 'Processado',  color: L.green,  bg: L.greenBg  },
  retificado:  { label: 'Retificado',  color: L.orange, bg: L.orangeBg },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtDate = (d) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

const monthLabel = (ym) => {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${names[parseInt(m, 10) - 1]}/${y}`
}

const daysUntil = (dateStr) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  return Math.round((d - today) / 86400000)
}

const getMonthYM = (offset = 0) => {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

const currentYear = () => new Date().getFullYear()

function csvDownload(rows, headers, filename) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [headers.map(esc).join(',')]
  rows.forEach((r) => lines.push(headers.map((h) => esc(r[h])).join(',')))
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
        textTransform: 'uppercase',
      }}>{label}</label>
      {children}
    </div>
  )
}

function Badge({ color, bg, children }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, color, background: bg,
      fontFamily: "'JetBrains Mono', monospace",
    }}>{children}</span>
  )
}

function BottomSheet({ title, onClose, children }) {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: L.bg, borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: 560, maxHeight: '92vh',
        overflowY: 'auto', animation: 'up 0.25s ease',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</span>
          <button
            onClick={onClose}
            style={{ fontSize: 22, color: L.t3, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
          >×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

function ConfirmModal({ title, message, onConfirm, onClose, loading }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: L.bg, borderRadius: 14, width: '100%', maxWidth: 400,
        padding: 28, boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: L.t1, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 13, color: L.t2, lineHeight: 1.6, marginBottom: 24 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 18px', borderRadius: 8, border: `1.5px solid ${L.line}`,
            background: 'none', color: L.t2, cursor: 'pointer', fontSize: 13,
          }}>Cancelar</button>
          <button onClick={onConfirm} disabled={loading} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: L.teal, color: L.white, fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer', fontSize: 13,
          }}>
            {loading ? 'Aguarde…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: L.surface, borderRadius: 12, padding: '14px 18px',
      border: `1px solid ${L.line}`, flex: 1, minWidth: 130,
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || L.t1, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: L.t3, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div style={{
        width: 28, height: 28, border: `3px solid ${L.line}`,
        borderTopColor: L.teal, borderRadius: '50%', animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  )
}

// ─── Tab 0: Calendário de Obrigações ─────────────────────────────────────────

function TabCalendario({ clinicaId }) {
  const [obrigacoes, setObrigacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showConfirmAnual, setShowConfirmAnual] = useState(false)
  const [generatingAnual, setGeneratingAnual] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    tipo: 'sped_fiscal', competencia: getMonthYM(),
    data_vencimento: '', status: 'pendente',
    responsavel: '', observacoes: '', arquivo_path: '',
  })

  const months = [getMonthYM(0), getMonthYM(1), getMonthYM(2)]

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sped_obrigacoes')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('data_vencimento', { ascending: true })
    setObrigacoes(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  const pendentes = obrigacoes.filter((o) => o.status === 'pendente').length
  const vencidas = obrigacoes.filter((o) => {
    const diff = daysUntil(o.data_vencimento)
    return o.status === 'pendente' && diff < 0
  }).length
  const thisMonth = getMonthYM(0).slice(0, 7)
  const transmitidas = obrigacoes.filter(
    (o) => o.status === 'transmitido' && o.competencia?.startsWith(thisMonth)
  ).length
  const nextDue = obrigacoes
    .filter((o) => o.status !== 'transmitido' && daysUntil(o.data_vencimento) >= 0)
    .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))[0]
  const nextDays = nextDue ? daysUntil(nextDue.data_vencimento) : null

  const markStatus = async (id, status) => {
    await supabase.from('sped_obrigacoes').update({ status }).eq('id', id)
    setObrigacoes((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('sped_obrigacoes').insert([{ ...form, clinica_id: clinicaId }])
    setSaving(false)
    setShowForm(false)
    setForm({ tipo: 'sped_fiscal', competencia: getMonthYM(), data_vencimento: '', status: 'pendente', responsavel: '', observacoes: '', arquivo_path: '' })
    load()
  }

  const handleGerarAnual = async () => {
    setGeneratingAnual(true)
    const ano = currentYear()
    const rows = []
    // Monthly: SPED Fiscal (last business day), REINF (dia 15)
    for (let m = 1; m <= 12; m++) {
      const ym = `${ano}-${String(m).padStart(2, '0')}`
      // SPED Fiscal: vencimento dia 25 do mês seguinte
      const nextM = m === 12 ? 1 : m + 1
      const nextY = m === 12 ? ano + 1 : ano
      rows.push({
        clinica_id: clinicaId, tipo: 'sped_fiscal', competencia: ym, status: 'pendente',
        data_vencimento: `${nextY}-${String(nextM).padStart(2, '0')}-25`,
        responsavel: 'Contabilidade', observacoes: 'Gerado automaticamente',
      })
      // REINF: vencimento dia 15 do mês seguinte
      rows.push({
        clinica_id: clinicaId, tipo: 'reinf', competencia: ym, status: 'pendente',
        data_vencimento: `${nextY}-${String(nextM).padStart(2, '0')}-15`,
        responsavel: 'Contabilidade', observacoes: 'Gerado automaticamente',
      })
    }
    // Annual: ECD (June 30), ECF (July 31)
    rows.push({
      clinica_id: clinicaId, tipo: 'ecd', competencia: `${ano}-12`, status: 'pendente',
      data_vencimento: `${ano + 1}-06-30`,
      responsavel: 'Contabilidade', observacoes: 'ECD – Escrituração Contábil Digital',
    })
    rows.push({
      clinica_id: clinicaId, tipo: 'ecf', competencia: `${ano}-12`, status: 'pendente',
      data_vencimento: `${ano + 1}-07-31`,
      responsavel: 'Contabilidade', observacoes: 'ECF – Escrituração Contábil Fiscal',
    })
    // DCTF Monthly
    for (let m = 1; m <= 12; m++) {
      const ym = `${ano}-${String(m).padStart(2, '0')}`
      const nextM = m === 12 ? 1 : m + 1
      const nextY = m === 12 ? ano + 1 : ano
      rows.push({
        clinica_id: clinicaId, tipo: 'dctf', competencia: ym, status: 'pendente',
        data_vencimento: `${nextY}-${String(nextM).padStart(2, '0')}-15`,
        responsavel: 'Contabilidade', observacoes: 'Gerado automaticamente',
      })
    }
    await supabase.from('sped_obrigacoes').insert(rows)
    setGeneratingAnual(false)
    setShowConfirmAnual(false)
    load()
  }

  const obrigByMonth = (ym) =>
    obrigacoes
      .filter((o) => o.data_vencimento?.startsWith(ym))
      .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento))

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <KpiCard label="Pendentes" value={pendentes} color={pendentes > 0 ? L.red : L.green} />
        <KpiCard label="Vencidas" value={vencidas} color={vencidas > 0 ? L.red : L.green} />
        <KpiCard label="Transmitidas (mês)" value={transmitidas} color={L.green} />
        <KpiCard
          label="Próx. vencimento"
          value={nextDays !== null ? `${nextDays}d` : '—'}
          sub={nextDue ? `${TIPO_META[nextDue.tipo]?.label} – ${fmtDate(nextDue.data_vencimento)}` : ''}
          color={nextDays !== null && nextDays <= 7 ? L.red : L.teal}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: L.teal, color: L.white, fontWeight: 600,
            cursor: 'pointer', fontSize: 13,
          }}
        >+ Nova Obrigação</button>
        <button
          onClick={() => setShowConfirmAnual(true)}
          style={{
            padding: '9px 18px', borderRadius: 8,
            border: `1.5px solid ${L.line}`, background: 'none',
            color: L.t2, cursor: 'pointer', fontSize: 13,
          }}
        >Gerar Calendário Anual {currentYear()}</button>
      </div>

      {/* Calendar columns */}
      {loading ? <Spinner /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {months.map((ym) => (
            <div key={ym} style={{ background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`, overflow: 'hidden' }}>
              <div style={{
                padding: '12px 16px', background: L.teal, color: L.white,
                fontWeight: 700, fontSize: 14,
              }}>
                {monthLabel(ym)}
              </div>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {obrigByMonth(ym).length === 0 ? (
                  <div style={{ fontSize: 12, color: L.t4, textAlign: 'center', padding: '20px 0' }}>Nenhuma obrigação</div>
                ) : (
                  obrigByMonth(ym).map((o) => {
                    const diff = daysUntil(o.data_vencimento)
                    const dateColor = diff < 0 ? L.red : diff <= 7 ? L.yellow : L.green
                    const meta = TIPO_META[o.tipo] || { label: o.tipo, color: L.t2, bg: L.surface }
                    const st = STATUS_OBRIG[o.status] || { label: o.status, color: L.t3, bg: L.surface }
                    return (
                      <div key={o.id} style={{
                        background: L.bg, borderRadius: 10, padding: 12,
                        border: `1px solid ${L.line}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
                          <Badge color={st.color} bg={st.bg}>{st.label}</Badge>
                        </div>
                        <div style={{ fontSize: 12, color: L.t3, marginBottom: 2 }}>
                          Competência: <strong style={{ color: L.t1 }}>{monthLabel(o.competencia)}</strong>
                        </div>
                        <div style={{ fontSize: 12, marginBottom: 2 }}>
                          Vencimento:{' '}
                          <strong style={{ color: dateColor }}>{fmtDate(o.data_vencimento)}</strong>
                        </div>
                        {o.responsavel && (
                          <div style={{ fontSize: 11, color: L.t4, marginBottom: 4 }}>
                            Resp.: {o.responsavel}
                          </div>
                        )}
                        <div style={{
                          fontSize: 11, fontWeight: 600,
                          color: diff < 0 ? L.red : diff <= 7 ? L.yellow : L.green,
                          marginBottom: 8,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>
                          {diff < 0 ? `${Math.abs(diff)}d atrasada` : diff === 0 ? 'Vence hoje' : `${diff}d restantes`}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {o.status !== 'gerado' && o.status !== 'transmitido' && (
                            <button
                              onClick={() => markStatus(o.id, 'gerado')}
                              style={{
                                fontSize: 10, padding: '3px 8px', borderRadius: 6,
                                border: `1px solid ${L.blueBd || L.blue}`,
                                background: L.blueBg, color: L.blue, cursor: 'pointer',
                              }}
                            >Marcar Gerado</button>
                          )}
                          {o.status !== 'transmitido' && (
                            <button
                              onClick={() => markStatus(o.id, 'transmitido')}
                              style={{
                                fontSize: 10, padding: '3px 8px', borderRadius: 6,
                                border: `1px solid ${L.greenBd || L.green}`,
                                background: L.greenBg, color: L.green, cursor: 'pointer',
                              }}
                            >Marcar Transmitido</button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form bottom-sheet */}
      {showForm && (
        <BottomSheet title="Nova Obrigação" onClose={() => setShowForm(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Tipo">
              <select
                style={inp}
                value={form.tipo}
                onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              >
                {TIPOS_OBRIG.map((t) => (
                  <option key={t} value={t}>{TIPO_META[t]?.label || t}</option>
                ))}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Competência (AAAA-MM)">
                <input
                  style={inp} type="month"
                  value={form.competencia}
                  onChange={(e) => setForm((f) => ({ ...f, competencia: e.target.value }))}
                />
              </Field>
              <Field label="Data de Vencimento">
                <input
                  style={inp} type="date"
                  value={form.data_vencimento}
                  onChange={(e) => setForm((f) => ({ ...f, data_vencimento: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Status">
              <select
                style={inp}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {Object.entries(STATUS_OBRIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Responsável">
              <input
                style={inp} type="text" placeholder="Nome do responsável"
                value={form.responsavel}
                onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))}
              />
            </Field>
            <Field label="Caminho do Arquivo">
              <input
                style={inp} type="text" placeholder="Ex: /fiscal/sped_2024_01.txt"
                value={form.arquivo_path}
                onChange={(e) => setForm((f) => ({ ...f, arquivo_path: e.target.value }))}
              />
            </Field>
            <Field label="Observações">
              <textarea
                style={{ ...inp, minHeight: 72, resize: 'vertical' }}
                placeholder="Observações adicionais..."
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </Field>
            <button
              onClick={handleSave} disabled={saving || !form.data_vencimento}
              style={{
                padding: '11px 0', borderRadius: 8, border: 'none',
                background: L.teal, color: L.white, fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer', fontSize: 14,
              }}
            >{saving ? 'Salvando…' : 'Salvar Obrigação'}</button>
          </div>
        </BottomSheet>
      )}

      {showConfirmAnual && (
        <ConfirmModal
          title={`Gerar Calendário Anual ${currentYear()}`}
          message={`Serão inseridas obrigações mensais de SPED Fiscal, EFD-REINF e DCTF para todos os 12 meses de ${currentYear()}, além de ECD e ECF anuais. Obrigações existentes não serão afetadas. Deseja continuar?`}
          onConfirm={handleGerarAnual}
          onClose={() => setShowConfirmAnual(false)}
          loading={generatingAnual}
        />
      )}
    </div>
  )
}

// ─── Tab 1: REINF ─────────────────────────────────────────────────────────────

function TabREINF({ clinicaId }) {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalAction, setModalAction] = useState(null) // { id, action }
  const [form, setForm] = useState({
    tipo_evento: 'r2010', competencia: getMonthYM(),
    status: 'aberto', valor_base: '', valor_retencao: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('reinf_eventos')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('competencia', { ascending: false })
    setEventos(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  // Bar chart: last 6 months retencao
  const last6 = Array.from({ length: 6 }, (_, i) => getMonthYM(-(5 - i)))
  const barData = last6.map((ym) => ({
    ym,
    total: eventos
      .filter((e) => e.competencia === ym)
      .reduce((s, e) => s + Number(e.valor_retencao || 0), 0),
  }))
  const barMax = Math.max(...barData.map((b) => b.total), 1)
  const totalAno = eventos
    .filter((e) => e.competencia?.startsWith(String(currentYear())))
    .reduce((s, e) => s + Number(e.valor_retencao || 0), 0)

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('reinf_eventos').insert([{
      ...form,
      clinica_id: clinicaId,
      valor_base: Number(form.valor_base) || 0,
      valor_retencao: Number(form.valor_retencao) || 0,
    }])
    setSaving(false)
    setShowForm(false)
    setForm({ tipo_evento: 'r2010', competencia: getMonthYM(), status: 'aberto', valor_base: '', valor_retencao: '' })
    load()
  }

  const doAction = async () => {
    if (!modalAction) return
    const { id, action } = modalAction
    await supabase.from('reinf_eventos').update({ status: action }).eq('id', id)
    setEventos((prev) => prev.map((e) => (e.id === id ? { ...e, status: action } : e)))
    setModalAction(null)
  }

  return (
    <div>
      {/* Info banner */}
      <div style={{
        background: L.orangeBg || '#fff7ed', border: `1px solid ${L.orangeBd || L.orange}`,
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        fontSize: 13, color: L.t2, lineHeight: 1.6,
      }}>
        <strong style={{ color: L.orange }}>EFD-REINF</strong> — Escrituração Fiscal Digital de Retenções e Outras Informações Fiscais.
        É obrigatória para clínicas que contratam médicos e profissionais de saúde autônomos (PF/PJ) e retêm INSS/IRRF sobre os pagamentos.
        Substitui a GFIP para pagamentos a terceiros sem vínculo empregatício.
      </div>

      {/* Dashboard: bar chart + total */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 24, alignItems: 'start',
      }}>
        <div style={{ background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`, padding: '16px 20px' }}>
          <div style={{ fontSize: 12, color: L.t3, fontFamily: "'JetBrains Mono', monospace", marginBottom: 14, textTransform: 'uppercase' }}>
            Retenções por Mês (últimos 6 meses)
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
            {barData.map((b) => (
              <div key={b.ym} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 9, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
                  {b.total > 0 ? fmt(b.total).replace('R$ ', '') : ''}
                </div>
                <div style={{
                  width: '100%', background: L.orange, borderRadius: '4px 4px 0 0',
                  height: `${Math.max(4, (b.total / barMax) * 60)}px`,
                  transition: 'height 0.3s ease',
                }} />
                <div style={{ fontSize: 9, color: L.t4, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                  {monthLabel(b.ym)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{
          background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`,
          padding: '16px 20px', minWidth: 160, textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, textTransform: 'uppercase' }}>Total Retenções {currentYear()}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: L.orange }}>{fmt(totalAno)}</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: L.t1 }}>Eventos REINF</div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: L.teal, color: L.white, fontWeight: 600,
            cursor: 'pointer', fontSize: 13,
          }}
        >+ Novo Evento</button>
      </div>

      {/* Table */}
      {loading ? <Spinner /> : (
        <div style={{ background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: L.hover }}>
                  {['Tipo Evento', 'Competência', 'Status', 'Valor Base', 'Retenção', 'Ações'].map((h) => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left', fontSize: 11,
                      color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600, borderBottom: `1px solid ${L.line}`, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eventos.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: L.t4, fontSize: 13 }}>
                      Nenhum evento registrado
                    </td>
                  </tr>
                ) : eventos.map((e) => {
                  const st = STATUS_EVENTO[e.status] || { label: e.status, color: L.t3, bg: L.surface }
                  const tipoLabel = TIPOS_EVENTO_REINF.find((t) => t.value === e.tipo_evento)?.label || e.tipo_evento
                  return (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${L.line}` }}>
                      <td style={{ padding: '10px 14px' }}>
                        <Badge color={L.orange} bg={L.orangeBg}>{e.tipo_evento?.toUpperCase()}</Badge>
                        <div style={{ fontSize: 11, color: L.t4, marginTop: 3 }}>
                          {tipoLabel.split(' – ')[1] || ''}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: L.t1 }}>{monthLabel(e.competencia)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Badge color={st.color} bg={st.bg}>{st.label}</Badge>
                      </td>
                      <td style={{ padding: '10px 14px', color: L.t2, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(e.valor_base)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: L.orange, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(e.valor_retencao)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {e.status === 'aberto' && (
                            <button
                              onClick={() => setModalAction({ id: e.id, action: 'fechado', label: 'Fechar Período' })}
                              style={{
                                fontSize: 11, padding: '4px 10px', borderRadius: 6,
                                border: `1px solid ${L.yellowBd || L.yellow}`,
                                background: L.yellowBg, color: L.yellow, cursor: 'pointer',
                              }}
                            >Fechar</button>
                          )}
                          {e.status === 'fechado' && (
                            <button
                              onClick={() => setModalAction({ id: e.id, action: 'enviado', label: 'Enviar Evento' })}
                              style={{
                                fontSize: 11, padding: '4px 10px', borderRadius: 6,
                                border: `1px solid ${L.teal}`,
                                background: L.tealBg, color: L.teal, cursor: 'pointer',
                              }}
                            >Enviar</button>
                          )}
                          {e.status !== 'retificado' && (
                            <button
                              onClick={() => setModalAction({ id: e.id, action: 'retificado', label: 'Retificar Evento' })}
                              style={{
                                fontSize: 11, padding: '4px 10px', borderRadius: 6,
                                border: `1px solid ${L.orangeBd || L.orange}`,
                                background: L.orangeBg, color: L.orange, cursor: 'pointer',
                              }}
                            >Retificar</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form bottom-sheet */}
      {showForm && (
        <BottomSheet title="Novo Evento REINF" onClose={() => setShowForm(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Tipo de Evento">
              <select
                style={inp}
                value={form.tipo_evento}
                onChange={(e) => setForm((f) => ({ ...f, tipo_evento: e.target.value }))}
              >
                {TIPOS_EVENTO_REINF.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Competência (AAAA-MM)">
                <input
                  style={inp} type="month"
                  value={form.competencia}
                  onChange={(e) => setForm((f) => ({ ...f, competencia: e.target.value }))}
                />
              </Field>
              <Field label="Status">
                <select
                  style={inp}
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {Object.entries(STATUS_EVENTO).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Valor Base (R$)">
                <input
                  style={inp} type="number" step="0.01" placeholder="0,00"
                  value={form.valor_base}
                  onChange={(e) => setForm((f) => ({ ...f, valor_base: e.target.value }))}
                />
              </Field>
              <Field label="Valor Retenção (R$)">
                <input
                  style={inp} type="number" step="0.01" placeholder="0,00"
                  value={form.valor_retencao}
                  onChange={(e) => setForm((f) => ({ ...f, valor_retencao: e.target.value }))}
                />
              </Field>
            </div>
            <button
              onClick={handleSave} disabled={saving}
              style={{
                padding: '11px 0', borderRadius: 8, border: 'none',
                background: L.teal, color: L.white, fontWeight: 600,
                cursor: saving ? 'wait' : 'pointer', fontSize: 14,
              }}
            >{saving ? 'Salvando…' : 'Salvar Evento'}</button>
          </div>
        </BottomSheet>
      )}

      {/* Action confirm */}
      {modalAction && (
        <ConfirmModal
          title={modalAction.label}
          message={`Confirma a ação "${modalAction.label}" para este evento?`}
          onConfirm={doAction}
          onClose={() => setModalAction(null)}
        />
      )}
    </div>
  )
}

// ─── Tab 2: Histórico & Transmissões ─────────────────────────────────────────

function TabHistorico({ clinicaId }) {
  const [obrigacoes, setObrigacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterYear, setFilterYear] = useState(String(currentYear()))

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sped_obrigacoes')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('data_vencimento', { ascending: false })
    setObrigacoes(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  const years = [...new Set(obrigacoes.map((o) => o.competencia?.slice(0, 4)).filter(Boolean))].sort().reverse()
  if (!years.includes(filterYear) && years.length > 0 && filterYear !== 'todos') {
    // keep the selection
  }

  const filtered = obrigacoes.filter((o) => {
    if (filterTipo !== 'todos' && o.tipo !== filterTipo) return false
    if (filterStatus !== 'todos' && o.status !== filterStatus) return false
    if (filterYear !== 'todos' && !o.competencia?.startsWith(filterYear)) return false
    return true
  })

  // Compliance score
  const transmitidas = filtered.filter((o) => o.status === 'transmitido')
  const total = filtered.length
  const score = total > 0 ? Math.round((transmitidas.length / total) * 100) : 0

  // Late = transmitted but past due date (using criado_em as proxy for transmission date)
  const onTime = transmitidas.filter((o) => {
    const due = new Date(o.data_vencimento + 'T00:00:00')
    const sent = new Date(o.criado_em)
    return sent <= due
  }).length
  const late = transmitidas.length - onTime
  const scoreOnTime = transmitidas.length > 0 ? Math.round((onTime / transmitidas.length) * 100) : 0

  // By tipo breakdown
  const byTipo = TIPOS_OBRIG.map((tipo) => {
    const items = filtered.filter((o) => o.tipo === tipo)
    const tx = items.filter((o) => o.status === 'transmitido').length
    return { tipo, total: items.length, transmitido: tx }
  }).filter((b) => b.total > 0)

  const handleExport = () => {
    const headers = ['tipo', 'competencia', 'data_vencimento', 'status', 'responsavel', 'arquivo_path', 'observacoes', 'criado_em']
    csvDownload(filtered, headers, `sped_obrigacoes_${filterYear}.csv`)
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: L.t4, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>Tipo</label>
          <select
            style={{ ...inp, width: 'auto', minWidth: 140 }}
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
          >
            <option value="todos">Todos os tipos</option>
            {TIPOS_OBRIG.map((t) => (
              <option key={t} value={t}>{TIPO_META[t]?.label || t}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: L.t4, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>Status</label>
          <select
            style={{ ...inp, width: 'auto', minWidth: 130 }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="todos">Todos</option>
            {Object.entries(STATUS_OBRIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: L.t4, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase' }}>Ano</label>
          <select
            style={{ ...inp, width: 'auto', minWidth: 100 }}
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="todos">Todos</option>
            {[String(currentYear()), String(currentYear() - 1), String(currentYear() - 2)].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleExport}
          style={{
            padding: '9px 18px', borderRadius: 8,
            border: `1.5px solid ${L.line}`, background: 'none',
            color: L.teal, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >Exportar Relatório CSV</button>
      </div>

      {/* Compliance score panel */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24,
      }}>
        {/* Gauge */}
        <div style={{
          background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`,
          padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20,
        }}>
          {/* CSS gauge ring */}
          <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke={L.line} strokeWidth="8" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                stroke={score >= 80 ? L.green : score >= 50 ? L.yellow : L.red}
                strokeWidth="8"
                strokeDasharray={`${(score / 100) * 213.6} 213.6`}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: L.t1,
            }}>{score}%</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: L.t1, marginBottom: 4 }}>Compliance Fiscal</div>
            <div style={{ fontSize: 12, color: L.t3, marginBottom: 2 }}>{transmitidas.length} de {total} transmitidas</div>
            <div style={{ fontSize: 12, color: L.green }}>{onTime} no prazo</div>
            <div style={{ fontSize: 12, color: L.red }}>{late} em atraso</div>
            {transmitidas.length > 0 && (
              <div style={{ fontSize: 11, color: L.t4, marginTop: 4 }}>
                Pontualidade: <strong style={{ color: scoreOnTime >= 80 ? L.green : L.yellow }}>{scoreOnTime}%</strong>
              </div>
            )}
          </div>
        </div>

        {/* Breakdown by tipo */}
        <div style={{
          background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`,
          padding: '16px 20px',
        }}>
          <div style={{ fontSize: 12, color: L.t3, fontFamily: "'JetBrains Mono', monospace", marginBottom: 12, textTransform: 'uppercase' }}>
            Por Tipo de Obrigação
          </div>
          {byTipo.length === 0 ? (
            <div style={{ fontSize: 12, color: L.t4 }}>Nenhum dado</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {byTipo.map((b) => {
                const pct = b.total > 0 ? Math.round((b.transmitido / b.total) * 100) : 0
                const meta = TIPO_META[b.tipo] || { label: b.tipo, color: L.t2 }
                return (
                  <div key={b.tipo}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: L.t2 }}>{meta.label}</span>
                      <span style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
                        {b.transmitido}/{b.total} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: 5, background: L.line, borderRadius: 3 }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, borderRadius: 3,
                        background: meta.color, transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? <Spinner /> : (
        <div style={{ background: L.surface, borderRadius: 12, border: `1px solid ${L.line}`, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: L.hover }}>
                  {['Tipo', 'Competência', 'Vencimento', 'Status', 'Responsável', 'Arquivo', 'Observações'].map((h) => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left', fontSize: 11,
                      color: L.t4, fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 600, borderBottom: `1px solid ${L.line}`, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: L.t4, fontSize: 13 }}>
                      Nenhum registro encontrado
                    </td>
                  </tr>
                ) : filtered.map((o) => {
                  const meta = TIPO_META[o.tipo] || { label: o.tipo, color: L.t2, bg: L.surface }
                  const st = STATUS_OBRIG[o.status] || { label: o.status, color: L.t3, bg: L.surface }
                  const diff = daysUntil(o.data_vencimento)
                  const dateColor = o.status === 'transmitido' ? L.t2 : diff < 0 ? L.red : diff <= 7 ? L.yellow : L.t2
                  return (
                    <tr key={o.id} style={{ borderBottom: `1px solid ${L.line}` }}>
                      <td style={{ padding: '10px 14px' }}>
                        <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
                      </td>
                      <td style={{ padding: '10px 14px', color: L.t1 }}>{monthLabel(o.competencia)}</td>
                      <td style={{ padding: '10px 14px', color: dateColor, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        {fmtDate(o.data_vencimento)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Badge color={st.color} bg={st.bg}>{st.label}</Badge>
                      </td>
                      <td style={{ padding: '10px 14px', color: L.t2, fontSize: 12 }}>{o.responsavel || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {o.arquivo_path ? (
                          <a
                            href={o.arquivo_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: L.teal, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
                          >Download</a>
                        ) : <span style={{ color: L.t4, fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 14px', color: L.t3, fontSize: 12, maxWidth: 180 }}>
                        <span title={o.observacoes} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                          {o.observacoes || '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 16px', fontSize: 12, color: L.t4, borderTop: `1px solid ${L.line}` }}>
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PageSPED({ profile }) {
  const [tab, setTab] = useState(0)
  const clinicaId = profile?.clinica_id

  const TABS = ['Calendário de Obrigações', 'EFD-REINF', 'Histórico & Transmissões']

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        @keyframes up {
          from { transform: translateY(60px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: L.tealGrad, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 18,
          }}>📋</div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: L.t1, margin: 0 }}>
              SPED / EFD / REINF
            </h1>
            <div style={{ fontSize: 12, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>
              Obrigações Fiscais Acessórias & Folha de Pagamento
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: `2px solid ${L.line}`, marginBottom: 24,
      }}>
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: tab === i ? 700 : 400,
              color: tab === i ? L.teal : L.t3,
              borderBottom: tab === i ? `2px solid ${L.teal}` : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s',
            }}
          >{t}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 0 && <TabCalendario clinicaId={clinicaId} />}
      {tab === 1 && <TabREINF clinicaId={clinicaId} />}
      {tab === 2 && <TabHistorico clinicaId={clinicaId} />}
    </div>
  )
}
