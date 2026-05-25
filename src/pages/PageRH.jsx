import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

// ─── helpers ────────────────────────────────────────────────────────────────

const fmtDate  = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const fmtBRL   = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtHora  = dt => dt ? new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'
const initials = nome => (nome || '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
const today    = () => new Date().toISOString().slice(0, 10)
const nowLocal = () => {
  const d = new Date()
  return d.toISOString().slice(0, 16)
}
function diffHoras(a, b) {
  if (!a || !b) return 0
  return (new Date(b) - new Date(a)) / 3600000
}
function calcHorasTrab(pontos) {
  const get = tipo => pontos.find(p => p.tipo === tipo)?.data_hora || null
  const entrada    = get('entrada')
  const saida      = get('saida')
  const iniInt     = get('intervalo_inicio')
  const fimInt     = get('intervalo_fim')
  if (!entrada || !saida) return null
  let h = diffHoras(entrada, saida)
  if (iniInt && fimInt) h -= diffHoras(iniInt, fimInt)
  return Math.max(0, h)
}

const TIPO_PONTO_LABELS = {
  entrada: 'Entrada',
  saida: 'Saída',
  intervalo_inicio: 'Início Intervalo',
  intervalo_fim: 'Fim Intervalo',
}

const TIPO_AUSENCIA_COLOR = {
  ferias:   { color: L.blue,   bg: L.blueBg,   label: 'Férias' },
  folga:    { color: L.green,  bg: L.greenBg,  label: 'Folga' },
  atestado: { color: L.yellow, bg: L.yellowBg, label: 'Atestado' },
  licenca:  { color: L.purple, bg: L.purpleBg, label: 'Licença' },
}

const STATUS_AUSENCIA_COLOR = {
  aprovado: { color: L.green,  bg: L.greenBg  },
  pendente: { color: L.yellow, bg: L.yellowBg },
  negado:   { color: L.red,    bg: L.redBg    },
}

// ─── shared UI ──────────────────────────────────────────────────────────────

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
      }}>{label}</label>
      {children}
    </div>
  )
}

function Badge({ color, bg, children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 9px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, color, background: bg,
    }}>{children}</span>
  )
}

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: L.bg,
        borderRadius: '16px 16px 0 0',
        width: '100%',
        maxWidth: wide ? 700 : 520,
        maxHeight: '92vh',
        overflowY: 'auto',
        animation: 'up 0.25s ease',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.14)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 22, color: L.t3, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

function BtnPrimary({ onClick, disabled, children, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? L.line : L.teal,
        color: L.white,
        fontWeight: 600,
        fontSize: 14,
        padding: '10px 20px',
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: 'none',
        transition: 'background 0.15s',
        ...style,
      }}
    >{children}</button>
  )
}

function Spinner() {
  return <span style={{ display: 'inline-block', width: 16, height: 16, border: `2px solid ${L.line}`, borderTopColor: L.teal, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
}

function KPICard({ label, value, sub }) {
  return (
    <div style={{
      background: L.surface,
      border: `1px solid ${L.line}`,
      borderRadius: 12,
      padding: '18px 20px',
      flex: 1,
      minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: L.t1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: L.t4, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ─── main component ─────────────────────────────────────────────────────────

export default function PageRH({ profile }) {
  const clinicaId = profile?.clinica_id
  const [tab, setTab] = useState(0)

  // shared data
  const [funcionarios, setFuncionarios] = useState([])
  const [usuarios, setUsuarios]         = useState([])
  const [loadingFuncs, setLoadingFuncs] = useState(true)

  useEffect(() => { if (clinicaId) loadFuncionarios() }, [clinicaId])
  useEffect(() => { if (clinicaId) loadUsuarios() }, [clinicaId])

  async function loadFuncionarios() {
    setLoadingFuncs(true)
    const { data } = await supabase
      .from('funcionarios_rh')
      .select('*')
      .eq('clinica_id', clinicaId)
      .order('nome')
    setFuncionarios(data || [])
    setLoadingFuncs(false)
  }

  async function loadUsuarios() {
    const { data } = await supabase
      .from('usuarios')
      .select('id, nome, email')
      .eq('clinica_id', clinicaId)
      .order('nome')
    setUsuarios(data || [])
  }

  const ativos = funcionarios.filter(f => f.ativo)

  const TABS = ['Funcionários', 'Controle de Ponto', 'Escalas', 'Férias e Afastamentos']

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        @keyframes up   { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { to   { transform: rotate(360deg); } }
      `}</style>

      {/* header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: L.t1, margin: 0 }}>Recursos Humanos</h1>
        <p style={{ fontSize: 13, color: L.t4, margin: '4px 0 0' }}>Gestão de funcionários, ponto e escalas</p>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${L.line}`, marginBottom: 24 }}>
        {TABS.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: tab === i ? 700 : 500,
              color: tab === i ? L.teal : L.t3,
              borderBottom: tab === i ? `2px solid ${L.teal}` : '2px solid transparent',
              background: 'none', border: 'none', cursor: 'pointer',
              marginBottom: -1,
            }}
          >{t}</button>
        ))}
      </div>

      {tab === 0 && (
        <TabFuncionarios
          clinicaId={clinicaId}
          funcionarios={funcionarios}
          usuarios={usuarios}
          loading={loadingFuncs}
          reload={loadFuncionarios}
        />
      )}
      {tab === 1 && (
        <TabPonto clinicaId={clinicaId} ativos={ativos} />
      )}
      {tab === 2 && (
        <TabEscalas clinicaId={clinicaId} ativos={ativos} />
      )}
      {tab === 3 && (
        <TabFerias clinicaId={clinicaId} ativos={ativos} />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 1 — FUNCIONÁRIOS
// ════════════════════════════════════════════════════════════════════════════

function TabFuncionarios({ clinicaId, funcionarios, usuarios, loading, reload }) {
  const [modal, setModal]   = useState(null) // 'novo' | { ...edit }
  const [form, setForm]     = useState({})
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const ativos = funcionarios.filter(f => f.ativo)
  const deptos = [...new Set(funcionarios.map(f => f.departamento).filter(Boolean))]
  const folha  = ativos.reduce((s, f) => s + Number(f.salario_base || 0), 0)

  function openNovo() {
    setForm({ carga_horaria_semanal: 40, ativo: true })
    setErr('')
    setModal('novo')
  }

  function openEdit(f) {
    setForm({ ...f })
    setErr('')
    setModal('edit')
  }

  async function save() {
    if (!form.nome?.trim()) { setErr('Nome é obrigatório.'); return }
    setSaving(true)
    setErr('')
    const payload = {
      clinica_id: clinicaId,
      nome: form.nome.trim(),
      cargo: form.cargo || null,
      departamento: form.departamento || null,
      salario_base: form.salario_base ? Number(form.salario_base) : null,
      carga_horaria_semanal: form.carga_horaria_semanal ? Number(form.carga_horaria_semanal) : 40,
      data_admissao: form.data_admissao || null,
      usuario_id: form.usuario_id || null,
      ativo: form.ativo !== false,
    }
    let error
    if (modal === 'novo') {
      ;({ error } = await supabase.from('funcionarios_rh').insert(payload))
    } else {
      ;({ error } = await supabase.from('funcionarios_rh').update(payload).eq('id', form.id))
    }
    setSaving(false)
    if (error) { setErr(error.message); return }
    setModal(null)
    reload()
  }

  async function toggleAtivo(f) {
    await supabase.from('funcionarios_rh').update({ ativo: !f.ativo }).eq('id', f.id)
    reload()
  }

  function exportCSV() {
    const mes = new Date().toISOString().slice(0, 7)
    const header = 'Nome,Cargo,Departamento,Admissão,Salário Base,Carga Horária'
    const rows = funcionarios.filter(f => f.ativo).map(f =>
      [f.nome, f.cargo, f.departamento, fmtDate(f.data_admissao), f.salario_base, f.carga_horaria_semanal].map(v => `"${v || ''}"`).join(',')
    )
    const csv = [header, ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `folha_${mes}.csv`
    a.click()
  }

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <KPICard label="TOTAL ATIVOS"        value={ativos.length} />
        <KPICard label="DEPARTAMENTOS"       value={deptos.length} />
        <KPICard label="FOLHA ESTIMADA"      value={fmtBRL(folha)} sub="funcionários ativos" />
      </div>

      {/* actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: L.t1, margin: 0 }}>
          Funcionários ({funcionarios.length})
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={exportCSV}
            style={{
              padding: '8px 14px', fontSize: 13, borderRadius: 8,
              border: `1.5px solid ${L.line}`, background: L.surface, color: L.t2, cursor: 'pointer',
            }}
          >⬇ Exportar Folha CSV</button>
          <BtnPrimary onClick={openNovo}>+ Novo Funcionário</BtnPrimary>
        </div>
      </div>

      {/* table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${L.line}` }}>
                {['Nome', 'Cargo', 'Departamento', 'Salário', 'Carga Horária', 'Admissão', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: L.t4, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {funcionarios.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: L.t4 }}>Nenhum funcionário cadastrado</td></tr>
              )}
              {funcionarios.map(f => (
                <tr key={f.id} style={{ borderBottom: `1px solid ${L.lineSoft}` }}>
                  <td style={{ padding: '10px 10px', color: L.t1, fontWeight: 500 }}>{f.nome}</td>
                  <td style={{ padding: '10px 10px', color: L.t2 }}>{f.cargo || '—'}</td>
                  <td style={{ padding: '10px 10px', color: L.t2 }}>{f.departamento || '—'}</td>
                  <td style={{ padding: '10px 10px', color: L.t2 }}>{f.salario_base ? fmtBRL(f.salario_base) : '—'}</td>
                  <td style={{ padding: '10px 10px', color: L.t2 }}>{f.carga_horaria_semanal ? `${f.carga_horaria_semanal}h/sem` : '—'}</td>
                  <td style={{ padding: '10px 10px', color: L.t2 }}>{fmtDate(f.data_admissao)}</td>
                  <td style={{ padding: '10px 10px' }}>
                    {f.ativo
                      ? <Badge color={L.green}  bg={L.greenBg}>Ativo</Badge>
                      : <Badge color={L.red}    bg={L.redBg}>Inativo</Badge>}
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => openEdit(f)}
                        style={{ fontSize: 12, color: L.teal, padding: '3px 8px', borderRadius: 6, border: `1px solid ${L.teal}`, background: 'none', cursor: 'pointer' }}
                      >Editar</button>
                      <button
                        onClick={() => toggleAtivo(f)}
                        style={{ fontSize: 12, color: f.ativo ? L.red : L.green, padding: '3px 8px', borderRadius: 6, border: `1px solid ${f.ativo ? L.red : L.green}`, background: 'none', cursor: 'pointer' }}
                      >{f.ativo ? 'Desativar' : 'Ativar'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* modal */}
      {modal && (
        <Modal title={modal === 'novo' ? 'Novo Funcionário' : 'Editar Funcionário'} onClose={() => setModal(null)}>
          <Field label="NOME *">
            <input style={inp} value={form.nome || ''} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="CARGO">
              <input style={inp} value={form.cargo || ''} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))} placeholder="Ex: Recepcionista" />
            </Field>
            <Field label="DEPARTAMENTO">
              <input style={inp} value={form.departamento || ''} onChange={e => setForm(p => ({ ...p, departamento: e.target.value }))} placeholder="Ex: Administrativo" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="SALÁRIO BASE (R$)">
              <input style={inp} type="number" min="0" step="0.01" value={form.salario_base || ''} onChange={e => setForm(p => ({ ...p, salario_base: e.target.value }))} placeholder="0,00" />
            </Field>
            <Field label="CARGA HORÁRIA SEMANAL (h)">
              <input style={inp} type="number" min="0" max="168" value={form.carga_horaria_semanal || 40} onChange={e => setForm(p => ({ ...p, carga_horaria_semanal: e.target.value }))} />
            </Field>
          </div>
          <Field label="DATA DE ADMISSÃO">
            <input style={inp} type="date" value={form.data_admissao || ''} onChange={e => setForm(p => ({ ...p, data_admissao: e.target.value }))} />
          </Field>
          <Field label="VINCULAR USUÁRIO (opcional)">
            <select style={inp} value={form.usuario_id || ''} onChange={e => setForm(p => ({ ...p, usuario_id: e.target.value }))}>
              <option value="">— Sem vínculo —</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome} ({u.email})</option>)}
            </select>
          </Field>
          {err && <p style={{ color: L.red, fontSize: 12, marginBottom: 12 }}>{err}</p>}
          <BtnPrimary onClick={save} disabled={saving} style={{ width: '100%' }}>
            {saving ? <Spinner /> : (modal === 'novo' ? 'Cadastrar Funcionário' : 'Salvar Alterações')}
          </BtnPrimary>
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — CONTROLE DE PONTO
// ════════════════════════════════════════════════════════════════════════════

function TabPonto({ clinicaId, ativos }) {
  const [data, setData]           = useState(today())
  const [registros, setRegistros] = useState([])
  const [loading, setLoading]     = useState(false)
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState({})
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')
  const [detalhe, setDetalhe]     = useState(null) // funcionário selecionado para ver pontos

  const loadRegistros = useCallback(async () => {
    setLoading(true)
    const { data: rows } = await supabase
      .from('registros_ponto')
      .select('*')
      .eq('clinica_id', clinicaId)
      .gte('data_hora', `${data}T00:00:00`)
      .lte('data_hora', `${data}T23:59:59`)
      .order('data_hora')
    setRegistros(rows || [])
    setLoading(false)
  }, [clinicaId, data])

  useEffect(() => { if (clinicaId) loadRegistros() }, [loadRegistros])

  function openModal() {
    setForm({ tipo: 'entrada', data_hora: nowLocal() })
    setErr('')
    setModal(true)
  }

  async function saveRegistro() {
    if (!form.funcionario_id) { setErr('Selecione um funcionário.'); return }
    if (!form.tipo)           { setErr('Selecione o tipo.'); return }
    if (!form.data_hora)      { setErr('Informe data/hora.'); return }
    setSaving(true)
    setErr('')
    const { error } = await supabase.from('registros_ponto').insert({
      clinica_id:    clinicaId,
      funcionario_id: form.funcionario_id,
      tipo:          form.tipo,
      data_hora:     new Date(form.data_hora).toISOString(),
      observacao:    form.observacao || null,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setModal(false)
    loadRegistros()
  }

  // Build summary per active employee
  const summary = ativos.map(func => {
    const pontos = registros.filter(r => r.funcionario_id === func.id)
    const horas  = calcHorasTrab(pontos)
    const tipos  = pontos.map(p => p.tipo)
    const all4   = ['entrada', 'saida', 'intervalo_inicio', 'intervalo_fim'].every(t => tipos.includes(t))
    const hasEnt = tipos.includes('entrada')
    let status, statusColor, statusBg
    if (all4)     { status = 'Completo';    statusColor = L.green;  statusBg = L.greenBg }
    else if (hasEnt) { status = 'Incompleto'; statusColor = L.yellow; statusBg = L.yellowBg }
    else           { status = 'Ausente';    statusColor = L.red;    statusBg = L.redBg }
    return { func, pontos, horas, status, statusColor, statusBg }
  })

  const detalhePontos = detalhe ? registros.filter(r => r.funcionario_id === detalhe.id) : []

  return (
    <div>
      {/* controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: L.t3 }}>Data:</span>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            style={{ ...inp, width: 160 }}
          />
        </div>
        <BtnPrimary onClick={openModal}>+ Registrar Ponto</BtnPrimary>
      </div>

      {/* summary table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${L.line}` }}>
                {['Nome', 'Entrada', 'Iní. Intervalo', 'Fim Intervalo', 'Saída', 'Horas Trabalhadas', 'Status'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: L.t4, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: L.t4 }}>Nenhum funcionário ativo</td></tr>
              )}
              {summary.map(({ func, pontos, horas, status, statusColor, statusBg }) => {
                const get = tipo => pontos.find(p => p.tipo === tipo)?.data_hora
                return (
                  <tr
                    key={func.id}
                    style={{ borderBottom: `1px solid ${L.lineSoft}`, cursor: 'pointer' }}
                    onClick={() => setDetalhe(detalhe?.id === func.id ? null : func)}
                  >
                    <td style={{ padding: '10px 10px', color: L.t1, fontWeight: 500 }}>{func.nome}</td>
                    <td style={{ padding: '10px 10px', color: L.t2 }}>{fmtHora(get('entrada'))}</td>
                    <td style={{ padding: '10px 10px', color: L.t2 }}>{fmtHora(get('intervalo_inicio'))}</td>
                    <td style={{ padding: '10px 10px', color: L.t2 }}>{fmtHora(get('intervalo_fim'))}</td>
                    <td style={{ padding: '10px 10px', color: L.t2 }}>{fmtHora(get('saida'))}</td>
                    <td style={{ padding: '10px 10px', color: L.t2 }}>
                      {horas !== null ? `${horas.toFixed(1)}h` : '—'}
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <Badge color={statusColor} bg={statusBg}>{status}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* detalhe pontos */}
      {detalhe && (
        <div style={{
          marginTop: 16,
          background: L.surface,
          border: `1px solid ${L.line}`,
          borderRadius: 10,
          padding: '16px 20px',
        }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, marginBottom: 12 }}>
            Registros de {detalhe.nome} em {fmtDate(data)}
          </div>
          {detalhePontos.length === 0 ? (
            <p style={{ color: L.t4, fontSize: 13 }}>Nenhum registro para esta data.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Tipo', 'Hora', 'Observação'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, color: L.t4, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detalhePontos.map(p => (
                  <tr key={p.id} style={{ borderTop: `1px solid ${L.lineSoft}` }}>
                    <td style={{ padding: '8px 10px' }}><Badge color={L.teal} bg={L.tealBg}>{TIPO_PONTO_LABELS[p.tipo] || p.tipo}</Badge></td>
                    <td style={{ padding: '8px 10px', color: L.t2 }}>{fmtHora(p.data_hora)}</td>
                    <td style={{ padding: '8px 10px', color: L.t3 }}>{p.observacao || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* modal registrar ponto */}
      {modal && (
        <Modal title="Registrar Ponto" onClose={() => setModal(false)}>
          <Field label="FUNCIONÁRIO *">
            <select style={inp} value={form.funcionario_id || ''} onChange={e => setForm(p => ({ ...p, funcionario_id: e.target.value }))}>
              <option value="">— Selecione —</option>
              {ativos.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </Field>
          <Field label="TIPO *">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(TIPO_PONTO_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setForm(p => ({ ...p, tipo: key }))}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: form.tipo === key ? 700 : 500,
                    background: form.tipo === key ? L.teal : L.surface,
                    color: form.tipo === key ? L.white : L.t2,
                    border: `1.5px solid ${form.tipo === key ? L.teal : L.line}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >{label}</button>
              ))}
            </div>
          </Field>
          <Field label="DATA / HORA *">
            <input style={inp} type="datetime-local" value={form.data_hora || ''} onChange={e => setForm(p => ({ ...p, data_hora: e.target.value }))} />
          </Field>
          <Field label="OBSERVAÇÃO">
            <input style={inp} value={form.observacao || ''} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} placeholder="Opcional" />
          </Field>
          {err && <p style={{ color: L.red, fontSize: 12, marginBottom: 12 }}>{err}</p>}
          <BtnPrimary onClick={saveRegistro} disabled={saving} style={{ width: '100%' }}>
            {saving ? <Spinner /> : 'Registrar Ponto'}
          </BtnPrimary>
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 3 — ESCALAS
// ════════════════════════════════════════════════════════════════════════════

function TabEscalas({ clinicaId, ativos }) {
  const now   = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed
  const [escalas, setEscalas] = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal]     = useState(null) // { data } | null
  const [form, setForm]       = useState({})
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const [filtroFunc, setFiltroFunc] = useState('')

  const loadEscalas = useCallback(async () => {
    setLoading(true)
    const inicio = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const fim    = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const { data } = await supabase
      .from('escalas_trabalho')
      .select('*, funcionarios_rh(nome)')
      .eq('clinica_id', clinicaId)
      .gte('data', inicio)
      .lte('data', fim)
      .order('data')
    setEscalas(data || [])
    setLoading(false)
  }, [clinicaId, year, month])

  useEffect(() => { if (clinicaId) loadEscalas() }, [loadEscalas])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function openAdd(data) {
    setForm({ data, hora_entrada: '08:00', hora_saida: '17:00' })
    setErr('')
    setModal({ data })
  }

  async function saveEscala() {
    if (!form.funcionario_id) { setErr('Selecione um funcionário.'); return }
    if (!form.hora_entrada || !form.hora_saida) { setErr('Informe os horários.'); return }
    setSaving(true)
    setErr('')
    const { error } = await supabase.from('escalas_trabalho').insert({
      clinica_id:    clinicaId,
      funcionario_id: form.funcionario_id,
      data:          form.data,
      hora_entrada:  form.hora_entrada,
      hora_saida:    form.hora_saida,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setModal(null)
    loadEscalas()
  }

  async function deleteEscala(id) {
    await supabase.from('escalas_trabalho').delete().eq('id', id)
    loadEscalas()
  }

  // Calendar
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const MONTHS   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  const escalasByDay = {}
  escalas.forEach(e => {
    const d = e.data
    if (!escalasByDay[d]) escalasByDay[d] = []
    escalasByDay[d].push(e)
  })

  const filteredEscalas = filtroFunc
    ? escalas.filter(e => e.funcionario_id === filtroFunc)
    : escalas

  return (
    <div>
      {/* month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={prevMonth} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${L.line}`, background: L.surface, cursor: 'pointer', color: L.t2, fontSize: 16 }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 15, color: L.t1, minWidth: 140, textAlign: 'center' }}>{MONTHS[month]} {year}</span>
        <button onClick={nextMonth} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${L.line}`, background: L.surface, cursor: 'pointer', color: L.t2, fontSize: 16 }}>›</button>
      </div>

      {/* calendar */}
      <div style={{
        background: L.surface, border: `1px solid ${L.line}`,
        borderRadius: 12, padding: 16, marginBottom: 24,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
          {WEEKDAYS.map(w => (
            <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: L.t4, fontFamily: "'JetBrains Mono', monospace", padding: '4px 0' }}>{w}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day  = i + 1
            const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const list = escalasByDay[dStr] || []
            const isTd = dStr === today()
            return (
              <div
                key={day}
                style={{
                  minHeight: 60,
                  borderRadius: 8,
                  border: `1px solid ${isTd ? L.teal : L.line}`,
                  background: isTd ? L.tealBg : L.bg,
                  padding: '4px 4px 4px',
                  position: 'relative',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: isTd ? L.teal : L.t3, marginBottom: 2 }}>{day}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {list.slice(0, 4).map(e => (
                    <span key={e.id} title={e.funcionarios_rh?.nome} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 22, height: 22,
                      borderRadius: '50%', background: L.teal, color: L.white,
                      fontSize: 9, fontWeight: 700,
                    }}>
                      {initials(e.funcionarios_rh?.nome)}
                    </span>
                  ))}
                  {list.length > 4 && <span style={{ fontSize: 10, color: L.t4 }}>+{list.length - 4}</span>}
                </div>
                <button
                  onClick={() => openAdd(dStr)}
                  style={{
                    position: 'absolute', bottom: 2, right: 2,
                    width: 16, height: 16, borderRadius: '50%',
                    background: L.teal, color: L.white,
                    fontSize: 12, lineHeight: '16px', textAlign: 'center',
                    border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >+</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* list view */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: L.t1, margin: 0 }}>Escalas do mês</h2>
        <select style={{ ...inp, width: 200 }} value={filtroFunc} onChange={e => setFiltroFunc(e.target.value)}>
          <option value="">Todos os funcionários</option>
          {ativos.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20 }}><Spinner /></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${L.line}` }}>
                {['Data', 'Funcionário', 'Entrada', 'Saída', 'Ação'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: L.t4, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEscalas.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: L.t4 }}>Nenhuma escala para este período</td></tr>
              )}
              {filteredEscalas.map(e => (
                <tr key={e.id} style={{ borderBottom: `1px solid ${L.lineSoft}` }}>
                  <td style={{ padding: '9px 10px', color: L.t2 }}>{fmtDate(e.data)}</td>
                  <td style={{ padding: '9px 10px', color: L.t1, fontWeight: 500 }}>{e.funcionarios_rh?.nome || '—'}</td>
                  <td style={{ padding: '9px 10px', color: L.t2 }}>{e.hora_entrada || '—'}</td>
                  <td style={{ padding: '9px 10px', color: L.t2 }}>{e.hora_saida || '—'}</td>
                  <td style={{ padding: '9px 10px' }}>
                    <button
                      onClick={() => deleteEscala(e.id)}
                      style={{ fontSize: 12, color: L.red, padding: '3px 8px', borderRadius: 6, border: `1px solid ${L.red}`, background: 'none', cursor: 'pointer' }}
                    >Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* modal add escala */}
      {modal && (
        <Modal title={`Escala — ${fmtDate(modal.data)}`} onClose={() => setModal(null)}>
          <Field label="FUNCIONÁRIO *">
            <select style={inp} value={form.funcionario_id || ''} onChange={e => setForm(p => ({ ...p, funcionario_id: e.target.value }))}>
              <option value="">— Selecione —</option>
              {ativos.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="HORA ENTRADA">
              <input style={inp} type="time" value={form.hora_entrada || ''} onChange={e => setForm(p => ({ ...p, hora_entrada: e.target.value }))} />
            </Field>
            <Field label="HORA SAÍDA">
              <input style={inp} type="time" value={form.hora_saida || ''} onChange={e => setForm(p => ({ ...p, hora_saida: e.target.value }))} />
            </Field>
          </div>
          {err && <p style={{ color: L.red, fontSize: 12, marginBottom: 12 }}>{err}</p>}
          <BtnPrimary onClick={saveEscala} disabled={saving} style={{ width: '100%' }}>
            {saving ? <Spinner /> : 'Adicionar Escala'}
          </BtnPrimary>
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 4 — FÉRIAS E AFASTAMENTOS
// ════════════════════════════════════════════════════════════════════════════

function TabFerias({ clinicaId, ativos }) {
  const [ferias, setFerias]   = useState([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState({})
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')

  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth()
  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  const loadFerias = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ferias_funcionarios')
      .select('*, funcionarios_rh(nome)')
      .eq('clinica_id', clinicaId)
      .order('data_inicio', { ascending: false })
    setFerias(data || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { if (clinicaId) loadFerias() }, [loadFerias])

  function openNovo() {
    setForm({ status: 'aprovado', tipo: 'ferias', data_inicio: today(), data_fim: today() })
    setErr('')
    setModal(true)
  }

  async function saveAusencia() {
    if (!form.funcionario_id) { setErr('Selecione um funcionário.'); return }
    if (!form.tipo)           { setErr('Selecione o tipo.'); return }
    if (!form.data_inicio || !form.data_fim) { setErr('Informe as datas.'); return }
    setSaving(true)
    setErr('')
    const { error } = await supabase.from('ferias_funcionarios').insert({
      clinica_id:    clinicaId,
      funcionario_id: form.funcionario_id,
      tipo:          form.tipo,
      data_inicio:   form.data_inicio,
      data_fim:      form.data_fim,
      status:        form.status || 'aprovado',
      observacoes:   form.observacoes || null,
    })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setModal(false)
    loadFerias()
  }

  async function updateStatus(id, status) {
    await supabase.from('ferias_funcionarios').update({ status }).eq('id', id)
    loadFerias()
  }

  async function deleteFerias(id) {
    await supabase.from('ferias_funcionarios').delete().eq('id', id)
    loadFerias()
  }

  function diasEntre(a, b) {
    const d1 = new Date(a + 'T12:00:00')
    const d2 = new Date(b + 'T12:00:00')
    return Math.max(0, Math.round((d2 - d1) / 86400000) + 1)
  }

  // Calendar for current month
  const firstDay   = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  // For each day of month, collect absences
  function absenceDotsForDay(day) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return ferias.filter(f => f.data_inicio <= dStr && f.data_fim >= dStr)
  }

  return (
    <div>
      {/* mini calendar */}
      <div style={{
        background: L.surface, border: `1px solid ${L.line}`,
        borderRadius: 12, padding: 16, marginBottom: 24,
      }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: L.t1, marginBottom: 12 }}>{MONTHS[month]} {year}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
          {WEEKDAYS.map(w => (
            <div key={w} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: L.t4, fontFamily: "'JetBrains Mono', monospace" }}>{w}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day  = i + 1
            const abs  = absenceDotsForDay(day)
            const isTd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` === today()
            return (
              <div key={day} style={{
                minHeight: 44,
                borderRadius: 6,
                border: `1px solid ${isTd ? L.teal : L.line}`,
                background: isTd ? L.tealBg : L.bg,
                padding: '2px 3px',
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: isTd ? L.teal : L.t3 }}>{day}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 2 }}>
                  {abs.slice(0, 3).map(a => {
                    const tc = TIPO_AUSENCIA_COLOR[a.tipo] || { color: L.t3, bg: L.surface }
                    return <span key={a.id} style={{ width: 8, height: 8, borderRadius: '50%', background: tc.color, display: 'inline-block' }} title={a.funcionarios_rh?.nome} />
                  })}
                  {abs.length > 3 && <span style={{ fontSize: 8, color: L.t4 }}>+{abs.length - 3}</span>}
                </div>
              </div>
            )
          })}
        </div>
        {/* legend */}
        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          {Object.entries(TIPO_AUSENCIA_COLOR).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: val.color, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: L.t4 }}>{val.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: L.t1, margin: 0 }}>Férias e Afastamentos</h2>
        <BtnPrimary onClick={openNovo}>+ Registrar Ausência</BtnPrimary>
      </div>

      {/* table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${L.line}` }}>
                {['Funcionário', 'Tipo', 'Data Início', 'Data Fim', 'Dias', 'Status', 'Observações', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, color: L.t4, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ferias.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: L.t4 }}>Nenhum registro de ausência</td></tr>
              )}
              {ferias.map(f => {
                const tc = TIPO_AUSENCIA_COLOR[f.tipo] || { color: L.t3, bg: L.surface, label: f.tipo }
                const sc = STATUS_AUSENCIA_COLOR[f.status] || { color: L.t3, bg: L.surface }
                return (
                  <tr key={f.id} style={{ borderBottom: `1px solid ${L.lineSoft}` }}>
                    <td style={{ padding: '10px 10px', color: L.t1, fontWeight: 500 }}>{f.funcionarios_rh?.nome || '—'}</td>
                    <td style={{ padding: '10px 10px' }}><Badge color={tc.color} bg={tc.bg}>{tc.label}</Badge></td>
                    <td style={{ padding: '10px 10px', color: L.t2 }}>{fmtDate(f.data_inicio)}</td>
                    <td style={{ padding: '10px 10px', color: L.t2 }}>{fmtDate(f.data_fim)}</td>
                    <td style={{ padding: '10px 10px', color: L.t2 }}>{diasEntre(f.data_inicio, f.data_fim)}</td>
                    <td style={{ padding: '10px 10px' }}><Badge color={sc.color} bg={sc.bg}>{f.status}</Badge></td>
                    <td style={{ padding: '10px 10px', color: L.t3, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.observacoes || '—'}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                        {f.status === 'pendente' && (
                          <>
                            <button
                              onClick={() => updateStatus(f.id, 'aprovado')}
                              style={{ fontSize: 11, color: L.green, padding: '3px 7px', borderRadius: 6, border: `1px solid ${L.green}`, background: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >Aprovar</button>
                            <button
                              onClick={() => updateStatus(f.id, 'negado')}
                              style={{ fontSize: 11, color: L.red, padding: '3px 7px', borderRadius: 6, border: `1px solid ${L.red}`, background: 'none', cursor: 'pointer' }}
                            >Negar</button>
                          </>
                        )}
                        <button
                          onClick={() => deleteFerias(f.id)}
                          style={{ fontSize: 11, color: L.t4, padding: '3px 7px', borderRadius: 6, border: `1px solid ${L.line}`, background: 'none', cursor: 'pointer' }}
                        >Excluir</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* modal */}
      {modal && (
        <Modal title="Registrar Ausência" onClose={() => setModal(false)}>
          <Field label="FUNCIONÁRIO *">
            <select style={inp} value={form.funcionario_id || ''} onChange={e => setForm(p => ({ ...p, funcionario_id: e.target.value }))}>
              <option value="">— Selecione —</option>
              {ativos.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </Field>
          <Field label="TIPO *">
            <select style={inp} value={form.tipo || 'ferias'} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
              <option value="ferias">Férias</option>
              <option value="folga">Folga</option>
              <option value="atestado">Atestado</option>
              <option value="licenca">Licença</option>
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="DATA INÍCIO *">
              <input style={inp} type="date" value={form.data_inicio || ''} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))} />
            </Field>
            <Field label="DATA FIM *">
              <input style={inp} type="date" value={form.data_fim || ''} onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))} />
            </Field>
          </div>
          <Field label="STATUS">
            <select style={inp} value={form.status || 'aprovado'} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <option value="aprovado">Aprovado</option>
              <option value="pendente">Pendente</option>
              <option value="negado">Negado</option>
            </select>
          </Field>
          <Field label="OBSERVAÇÕES">
            <textarea
              style={{ ...inp, resize: 'vertical', minHeight: 70 }}
              value={form.observacoes || ''}
              onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
              placeholder="Opcional"
            />
          </Field>
          {err && <p style={{ color: L.red, fontSize: 12, marginBottom: 12 }}>{err}</p>}
          <BtnPrimary onClick={saveAusencia} disabled={saving} style={{ width: '100%' }}>
            {saving ? <Spinner /> : 'Registrar Ausência'}
          </BtnPrimary>
        </Modal>
      )}
    </div>
  )
}
