import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/* ─── helpers ──────────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('pt-BR')
}
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function isPast(iso) {
  if (!iso) return false
  return new Date(iso) < new Date()
}

/* ─── design tokens ─────────────────────────────────────────────── */
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none', boxSizing: 'border-box',
}
const btnPrimary = {
  background: L.teal, color: L.white, border: 'none', borderRadius: 8,
  padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
}
const btnGhost = {
  background: 'none', color: L.t2, border: `1.5px solid ${L.line}`,
  borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
}
function focus(e) { e.target.style.borderColor = L.teal }
function blur(e)  { e.target.style.borderColor = L.line }

/* ─── conformidade colors ───────────────────────────────────────── */
const CONF_MAP = {
  conforme:               { label: 'Conforme',               color: L.green,  bg: L.greenBg  },
  parcialmente_conforme:  { label: 'Parcialmente Conforme',  color: L.yellow, bg: L.yellowBg },
  nao_conforme:           { label: 'Não Conforme',           color: L.red,    bg: L.redBg    },
  nao_aplicavel:          { label: 'Não Aplicável',          color: L.t3,     bg: L.surface  },
}
const STATUS_PLANO = {
  pendente:     { label: 'Pendente',     color: L.yellow, bg: L.yellowBg },
  em_andamento: { label: 'Em Andamento', color: L.blue,   bg: L.blueBg   },
  concluido:    { label: 'Concluído',    color: L.green,  bg: L.greenBg  },
  atrasado:     { label: 'Atrasado',     color: L.red,    bg: L.redBg    },
}

/* ─── ONA seed data ─────────────────────────────────────────────── */
const ONA_SEED_SECOES = [
  { codigo: 'GL', nome: 'Gestão de Liderança', descricao: 'Liderança e governança institucional', peso: 20 },
  { codigo: 'AP', nome: 'Atenção ao Paciente', descricao: 'Processos assistenciais e segurança do paciente', peso: 30 },
  { codigo: 'GI', nome: 'Gestão de Informação', descricao: 'Gestão de prontuários e sistemas de informação', peso: 15 },
  { codigo: 'RH', nome: 'Gestão de Recursos Humanos', descricao: 'Competências, treinamentos e saúde ocupacional', peso: 20 },
  { codigo: 'PI', nome: 'Prevenção e Controle de Infecções', descricao: 'CCIH, higienização e biossegurança', peso: 15 },
]

const ONA_SEED_CRITERIOS = {
  GL: [
    { codigo: 'GL.01', descricao: 'Missão, visão e valores formalmente definidos e comunicados', evidencia_requerida: 'Documento de missão, visão e valores; atas de reunião' },
    { codigo: 'GL.02', descricao: 'Estrutura organizacional com responsabilidades definidas', evidencia_requerida: 'Organograma atualizado; descrição de cargos' },
    { codigo: 'GL.03', descricao: 'Planejamento estratégico anual documentado', evidencia_requerida: 'Plano estratégico; indicadores de resultado' },
    { codigo: 'GL.04', descricao: 'Política de segurança do paciente implementada', evidencia_requerida: 'Política aprovada; NSP ativo; registros de eventos adversos' },
  ],
  AP: [
    { codigo: 'AP.01', descricao: 'Protocolo de identificação do paciente implementado', evidencia_requerida: 'POP de identificação; pulseiras; auditorias periódicas' },
    { codigo: 'AP.02', descricao: 'Protocolo de comunicação efetiva entre profissionais', evidencia_requerida: 'Formulários de passagem de plantão; SBAR; registros' },
    { codigo: 'AP.03', descricao: 'Gestão de medicamentos de alta vigilância', evidencia_requerida: 'Lista de medicamentos; sinalização; protocolos específicos' },
    { codigo: 'AP.04', descricao: 'Prevenção de quedas implementada', evidencia_requerida: 'Escala de avaliação de risco; intervenções documentadas' },
    { codigo: 'AP.05', descricao: 'Prevenção de lesões por pressão com protocolo ativo', evidencia_requerida: 'Escala Braden; POPs de curativo; registros de incidência' },
    { codigo: 'AP.06', descricao: 'Consentimento informado obtido para procedimentos', evidencia_requerida: 'Formulários de consentimento; registros em prontuário' },
  ],
  GI: [
    { codigo: 'GI.01', descricao: 'Prontuário do paciente completo e legível', evidencia_requerida: 'Auditoria de prontuários; itens mínimos obrigatórios' },
    { codigo: 'GI.02', descricao: 'Política de privacidade e confidencialidade de dados', evidencia_requerida: 'LGPD: política documentada; treinamentos realizados' },
    { codigo: 'GI.03', descricao: 'Backup e continuidade de sistemas de informação', evidencia_requerida: 'Política de backup; testes de restauração; registros' },
    { codigo: 'GI.04', descricao: 'Indicadores assistenciais monitorados mensalmente', evidencia_requerida: 'Dashboard de indicadores; reuniões de análise' },
  ],
  RH: [
    { codigo: 'RH.01', descricao: 'Dimensionamento de pessoal adequado por setor', evidencia_requerida: 'Escalas; relatórios de cobertura; política de dimensionamento' },
    { codigo: 'RH.02', descricao: 'Programa de educação continuada ativo', evidencia_requerida: 'Calendário de treinamentos; listas de presença; avaliações' },
    { codigo: 'RH.03', descricao: 'Avaliação de desempenho realizada anualmente', evidencia_requerida: 'Formulários de avaliação; resultados; planos de desenvolvimento' },
  ],
  PI: [
    { codigo: 'PI.01', descricao: 'Higienização das mãos com taxas de adesão monitoradas', evidencia_requerida: 'Auditorias de HM; taxa de adesão ≥80%; dispensadores de álcool' },
    { codigo: 'PI.02', descricao: 'CCIH ativa com reuniões regulares e relatórios', evidencia_requerida: 'Atas de reunião; relatórios mensais de IRAS; indicadores' },
    { codigo: 'PI.03', descricao: 'Gerenciamento de resíduos conforme legislação', evidencia_requerida: 'PGRSS; contratos de transporte; registros de destinação' },
  ],
}

/* ─── shared components ─────────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, color: L.t4, marginBottom: 5,
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px',
      }}>{label}</label>
      {children}
    </div>
  )
}

function Badge({ conf }) {
  const m = CONF_MAP[conf]
  if (!m) return null
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
      color: m.color, background: m.bg, whiteSpace: 'nowrap',
    }}>{m.label}</span>
  )
}

function StatusBadge({ status }) {
  const m = STATUS_PLANO[status]
  if (!m) return null
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
      color: m.color, background: m.bg, whiteSpace: 'nowrap',
    }}>{m.label}</span>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 16, height: 16,
      border: `2px solid ${L.line}`, borderTopColor: L.teal,
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  )
}

function Modal({ title, onClose, wide, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: L.bg, borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: wide ? 820 : 580,
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: `1px solid ${L.line}`,
          position: 'sticky', top: 0, background: L.bg, zIndex: 1,
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{
            fontSize: 22, color: L.t3, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

/* ─── circular gauge ─────────────────────────────────────────────── */
function CircularGauge({ pct, size = 140 }) {
  const r = (size - 20) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 80 ? L.green : pct >= 60 ? L.yellow : L.red

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={L.line} strokeWidth={12} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={12}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 10, color: L.t4, marginTop: 2 }}>conformidade</span>
      </div>
    </div>
  )
}

/* ─── progress bar ───────────────────────────────────────────────── */
function ProgressBar({ pct }) {
  const color = pct >= 80 ? L.green : pct >= 60 ? L.yellow : L.red
  return (
    <div style={{ background: L.line, borderRadius: 999, height: 7, width: '100%' }}>
      <div style={{
        background: color, borderRadius: 999, height: 7,
        width: `${pct}%`, transition: 'width 0.5s ease',
      }} />
    </div>
  )
}

/* ─── seed ONA data ──────────────────────────────────────────────── */
async function seedONAData(clinicaId) {
  const { count } = await supabase
    .from('acreditacao_secoes')
    .select('id', { count: 'exact', head: true })
    .eq('clinica_id', clinicaId)
    .eq('padrao', 'ONA1')

  if (count > 0) return

  for (const sec of ONA_SEED_SECOES) {
    const { data: secRow, error } = await supabase
      .from('acreditacao_secoes')
      .insert({ clinica_id: clinicaId, padrao: 'ONA1', ...sec })
      .select()
      .single()
    if (error || !secRow) continue

    const crit = ONA_SEED_CRITERIOS[sec.codigo] || []
    if (crit.length > 0) {
      await supabase.from('acreditacao_criterios').insert(
        crit.map(c => ({ ...c, clinica_id: clinicaId, secao_id: secRow.id }))
      )
    }
  }
}

/* ══════════════════════════════════════════════════════════════════
   TAB 0 — Painel de Conformidade
══════════════════════════════════════════════════════════════════ */
function PainelConformidade({ clinicaId }) {
  const [padrao, setPadrao] = useState('ONA1')
  const [secoes, setSecoes] = useState([])
  const [criterios, setCriterios] = useState([])
  const [avaliacoes, setAvaliacoes] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: secs }, { data: crits }, { data: avs }] = await Promise.all([
      supabase.from('acreditacao_secoes').select('*').eq('clinica_id', clinicaId).eq('padrao', padrao).order('codigo'),
      supabase.from('acreditacao_criterios').select('*').eq('clinica_id', clinicaId).order('codigo'),
      supabase.from('acreditacao_avaliacoes').select('*').eq('clinica_id', clinicaId).order('data_avaliacao', { ascending: false }),
    ])
    setSecoes(secs || [])
    setCriterios(crits || [])
    setAvaliacoes(avs || [])
    setLoading(false)
  }, [clinicaId, padrao])

  useEffect(() => { load() }, [load])

  async function handleSeed() {
    setSeeding(true)
    await seedONAData(clinicaId)
    await load()
    setSeeding(false)
  }

  // latest avaliacao per criterio
  function latestConf(criterioId) {
    const avs = avaliacoes.filter(a => a.criterio_id === criterioId)
    return avs[0]?.conformidade || null
  }

  // compute stats per secao
  function secStats(secId) {
    const crits = criterios.filter(c => c.secao_id === secId)
    const applicable = crits.filter(c => latestConf(c.id) !== 'nao_aplicavel')
    const conforme = crits.filter(c => latestConf(c.id) === 'conforme')
    const total = applicable.length || crits.length
    const pct = total === 0 ? 0 : Math.round((conforme.length / total) * 100)
    return { crits, conforme: conforme.length, total, pct }
  }

  // overall score
  function overallPct() {
    const filteredCrits = criterios.filter(c =>
      secoes.some(s => s.id === c.secao_id)
    )
    const applicable = filteredCrits.filter(c => latestConf(c.id) !== 'nao_aplicavel')
    const conforme = filteredCrits.filter(c => latestConf(c.id) === 'conforme')
    if (applicable.length === 0) return 0
    return Math.round((conforme.length / applicable.length) * 100)
  }

  const PADROES = ['ONA1', 'ONA2', 'ONA3', 'JCI']

  return (
    <div>
      {/* Standard selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {PADROES.map(p => (
          <button key={p} onClick={() => setPadrao(p)} style={{
            padding: '7px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: `1.5px solid ${padrao === p ? L.teal : L.line}`,
            background: padrao === p ? L.tealBg : 'none',
            color: padrao === p ? L.teal : L.t2,
          }}>{p}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : secoes.length === 0 ? (
        <div style={{
          background: L.surface, border: `1px solid ${L.line}`, borderRadius: 14,
          padding: 40, textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: L.t1, marginBottom: 8 }}>
            Nenhuma seção encontrada para {padrao}
          </div>
          <div style={{ fontSize: 13, color: L.t3, marginBottom: 20 }}>
            {padrao === 'ONA1' ? 'Deseja carregar os critérios padrão ONA1?' : 'Cadastre seções pelo módulo de configuração.'}
          </div>
          {padrao === 'ONA1' && (
            <button onClick={handleSeed} style={btnPrimary} disabled={seeding}>
              {seeding ? <Spinner /> : null}
              {seeding ? 'Carregando...' : 'Carregar Dados ONA1'}
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {/* Gauge */}
          <div style={{
            background: L.surface, border: `1px solid ${L.line}`, borderRadius: 14,
            padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 12, minWidth: 180,
          }}>
            <CircularGauge pct={overallPct()} />
            <div style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>Conformidade Global</div>
            <div style={{ fontSize: 12, color: L.t3 }}>{padrao}</div>
          </div>

          {/* Section breakdown */}
          <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {secoes.map(sec => {
              const stats = secStats(sec.id)
              const isExpanded = expanded === sec.id
              const secCrits = criterios.filter(c => c.secao_id === sec.id)
              return (
                <div key={sec.id} style={{
                  background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
                  overflow: 'hidden',
                }}>
                  <button onClick={() => setExpanded(isExpanded ? null : sec.id)} style={{
                    width: '100%', padding: '14px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: L.tealBg, color: L.teal, fontFamily: "'JetBrains Mono', monospace",
                      }}>{sec.codigo}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: L.t1 }}>{sec.nome}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: L.t3 }}>
                        {stats.conforme}/{stats.total} · {stats.pct}%
                      </span>
                      <span style={{ fontSize: 16, color: L.t3 }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                    <ProgressBar pct={stats.pct} />
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${L.line}`, padding: '8px 16px 16px' }}>
                      {secCrits.length === 0 ? (
                        <div style={{ fontSize: 13, color: L.t3, padding: '12px 0', textAlign: 'center' }}>
                          Nenhum critério cadastrado
                        </div>
                      ) : (
                        secCrits.map(c => {
                          const conf = latestConf(c.id)
                          return (
                            <div key={c.id} style={{
                              display: 'flex', alignItems: 'flex-start', gap: 10,
                              padding: '10px 0', borderBottom: `1px solid ${L.line}`,
                            }}>
                              <span style={{
                                fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                                color: L.t4, whiteSpace: 'nowrap', paddingTop: 2,
                              }}>{c.codigo}</span>
                              <span style={{ fontSize: 13, color: L.t2, flex: 1 }}>{c.descricao}</span>
                              {conf ? <Badge conf={conf} /> : (
                                <span style={{
                                  fontSize: 11, color: L.t4, background: L.surface,
                                  padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap',
                                }}>Não auditado</span>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   TAB 1 — Auditoria Interna
══════════════════════════════════════════════════════════════════ */
function AuditoriaModal({ criterio, onClose, onSaved }) {
  const [form, setForm] = useState({
    conformidade: 'conforme',
    evidencia_encontrada: '',
    auditor: '',
    data_avaliacao: todayISO(),
    proxima_avaliacao: '',
  })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase.from('acreditacao_avaliacoes').insert({
      clinica_id: criterio.clinica_id,
      criterio_id: criterio.id,
      ...form,
    })
    setSaving(false)
    if (!error) { onSaved(); onClose() }
  }

  return (
    <Modal title={`Avaliar — ${criterio.codigo}`} onClose={onClose} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{
          background: L.surface, borderRadius: 10, padding: 14,
          fontSize: 13, color: L.t2, borderLeft: `3px solid ${L.teal}`,
        }}>
          <div style={{ fontWeight: 600, color: L.t1, marginBottom: 4 }}>{criterio.descricao}</div>
          {criterio.evidencia_requerida && (
            <div style={{ fontSize: 12, color: L.t3 }}>
              <b>Evidência requerida:</b> {criterio.evidencia_requerida}
            </div>
          )}
        </div>

        <Field label="CONFORMIDADE">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {Object.entries(CONF_MAP).map(([val, meta]) => (
              <label key={val} style={{
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                padding: '10px 14px', borderRadius: 8,
                border: `1.5px solid ${form.conformidade === val ? meta.color : L.line}`,
                background: form.conformidade === val ? meta.bg : 'none',
              }}>
                <input
                  type="radio" name="conformidade" value={val}
                  checked={form.conformidade === val}
                  onChange={set('conformidade')}
                  style={{ accentColor: meta.color }}
                />
                <span style={{
                  fontSize: 13, fontWeight: form.conformidade === val ? 600 : 400,
                  color: form.conformidade === val ? meta.color : L.t2,
                }}>{meta.label}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="EVIDÊNCIA ENCONTRADA">
          <textarea
            value={form.evidencia_encontrada}
            onChange={set('evidencia_encontrada')}
            onFocus={focus} onBlur={blur}
            rows={4} style={{ ...inp, resize: 'vertical' }}
            placeholder="Descreva as evidências observadas..."
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="AUDITOR">
            <input value={form.auditor} onChange={set('auditor')}
              onFocus={focus} onBlur={blur} style={inp} placeholder="Nome do auditor" />
          </Field>
          <Field label="DATA DA AVALIAÇÃO">
            <input type="date" value={form.data_avaliacao} onChange={set('data_avaliacao')}
              onFocus={focus} onBlur={blur} style={inp} />
          </Field>
        </div>

        <Field label="PRÓXIMA AVALIAÇÃO">
          <input type="date" value={form.proxima_avaliacao} onChange={set('proxima_avaliacao')}
            onFocus={focus} onBlur={blur} style={inp} />
        </Field>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          <button onClick={handleSave} style={btnPrimary} disabled={saving}>
            {saving ? <Spinner /> : null}
            {saving ? 'Salvando...' : 'Salvar Avaliação'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function WizardAuditoria({ criterios, clinicaId, onClose, onDone }) {
  const [idx, setIdx] = useState(0)
  const [form, setForm] = useState({
    conformidade: 'conforme',
    evidencia_encontrada: '',
    auditor: '',
    data_avaliacao: todayISO(),
    proxima_avaliacao: '',
  })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const crit = criterios[idx]

  async function handleNext() {
    setSaving(true)
    await supabase.from('acreditacao_avaliacoes').insert({
      clinica_id: clinicaId,
      criterio_id: crit.id,
      ...form,
    })
    setSaving(false)
    setForm({
      conformidade: 'conforme', evidencia_encontrada: '',
      auditor: form.auditor, data_avaliacao: todayISO(), proxima_avaliacao: '',
    })
    if (idx + 1 >= criterios.length) { onDone(); onClose() }
    else setIdx(i => i + 1)
  }

  return (
    <Modal title={`Auditoria Completa — ${idx + 1}/${criterios.length}`} onClose={onClose} wide>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: L.t3, marginBottom: 6 }}>
          <span>Progresso</span><span>{idx}/{criterios.length} concluídos</span>
        </div>
        <div style={{ background: L.line, borderRadius: 999, height: 6 }}>
          <div style={{
            background: L.teal, borderRadius: 999, height: 6,
            width: `${(idx / criterios.length) * 100}%`, transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      <div style={{
        background: L.surface, borderRadius: 10, padding: 14, marginBottom: 18,
        fontSize: 13, color: L.t2, borderLeft: `3px solid ${L.teal}`,
      }}>
        <div style={{ fontWeight: 600, color: L.t1, marginBottom: 4 }}>
          [{crit.codigo}] {crit.descricao}
        </div>
        {crit.evidencia_requerida && (
          <div style={{ fontSize: 12, color: L.t3 }}>
            <b>Evidência requerida:</b> {crit.evidencia_requerida}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="CONFORMIDADE">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {Object.entries(CONF_MAP).map(([val, meta]) => (
              <label key={val} style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                padding: '8px 14px', borderRadius: 8, flex: '1 1 calc(50% - 4px)',
                border: `1.5px solid ${form.conformidade === val ? meta.color : L.line}`,
                background: form.conformidade === val ? meta.bg : 'none',
              }}>
                <input type="radio" name="wiz_conf" value={val}
                  checked={form.conformidade === val} onChange={set('conformidade')}
                  style={{ accentColor: meta.color }} />
                <span style={{
                  fontSize: 12, fontWeight: form.conformidade === val ? 600 : 400,
                  color: form.conformidade === val ? meta.color : L.t2,
                }}>{meta.label}</span>
              </label>
            ))}
          </div>
        </Field>

        <Field label="EVIDÊNCIA ENCONTRADA">
          <textarea value={form.evidencia_encontrada} onChange={set('evidencia_encontrada')}
            onFocus={focus} onBlur={blur} rows={3}
            style={{ ...inp, resize: 'vertical' }} placeholder="Descreva as evidências observadas..." />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="AUDITOR">
            <input value={form.auditor} onChange={set('auditor')}
              onFocus={focus} onBlur={blur} style={inp} placeholder="Nome do auditor" />
          </Field>
          <Field label="PRÓXIMA AVALIAÇÃO">
            <input type="date" value={form.proxima_avaliacao} onChange={set('proxima_avaliacao')}
              onFocus={focus} onBlur={blur} style={inp} />
          </Field>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button onClick={onClose} style={btnGhost}>Cancelar Auditoria</button>
          <button onClick={handleNext} style={btnPrimary} disabled={saving}>
            {saving ? <Spinner /> : null}
            {saving ? 'Salvando...' : idx + 1 >= criterios.length ? 'Concluir Auditoria' : 'Próximo Critério →'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function AuditoriaInterna({ clinicaId }) {
  const [secoes, setSecoes] = useState([])
  const [criterios, setCriterios] = useState([])
  const [avaliacoes, setAvaliacoes] = useState([])
  const [selectedSec, setSelectedSec] = useState('')
  const [loading, setLoading] = useState(true)
  const [avaliarCrit, setAvaliarCrit] = useState(null)
  const [wizardOpen, setWizardOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: secs }, { data: crits }, { data: avs }] = await Promise.all([
      supabase.from('acreditacao_secoes').select('*').eq('clinica_id', clinicaId).order('codigo'),
      supabase.from('acreditacao_criterios').select('*').eq('clinica_id', clinicaId).order('codigo'),
      supabase.from('acreditacao_avaliacoes').select('*').eq('clinica_id', clinicaId).order('data_avaliacao', { ascending: false }),
    ])
    setSecoes(secs || [])
    setCriterios(crits || [])
    setAvaliacoes(avs || [])
    if (secs?.length > 0 && !selectedSec) setSelectedSec(secs[0].id)
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  function latestAv(criterioId) {
    return avaliacoes.find(a => a.criterio_id === criterioId) || null
  }

  const filteredCrits = criterios.filter(c => c.secao_id === selectedSec)
  const selectedSecObj = secoes.find(s => s.id === selectedSec)

  return (
    <div>
      <style>{`
        @keyframes up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Section selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <Field label="SEÇÃO / PADRÃO">
            <select value={selectedSec} onChange={e => setSelectedSec(e.target.value)}
              onFocus={focus} onBlur={blur} style={inp}>
              {secoes.map(s => (
                <option key={s.id} value={s.id}>[{s.padrao}] {s.codigo} — {s.nome}</option>
              ))}
            </select>
          </Field>
        </div>
        {filteredCrits.length > 0 && (
          <button onClick={() => setWizardOpen(true)} style={{ ...btnPrimary, marginTop: 16 }}>
            ▶ Iniciar Auditoria Completa
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : filteredCrits.length === 0 ? (
        <div style={{
          background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12,
          padding: 32, textAlign: 'center', fontSize: 13, color: L.t3,
        }}>
          {secoes.length === 0 ? 'Nenhuma seção cadastrada. Use o Painel para carregar dados ONA1.' : 'Nenhum critério para esta seção.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {selectedSecObj && (
            <div style={{
              background: L.tealBg, border: `1px solid ${L.teal}20`, borderRadius: 10,
              padding: '10px 16px', fontSize: 12, color: L.teal, marginBottom: 4,
            }}>
              <b>{selectedSecObj.codigo} — {selectedSecObj.nome}</b>
              {selectedSecObj.descricao && <span style={{ color: L.t3 }}> · {selectedSecObj.descricao}</span>}
            </div>
          )}
          {filteredCrits.map(c => {
            const av = latestAv(c.id)
            return (
              <div key={c.id} style={{
                background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12,
                padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700, color: L.teal, background: L.tealBg,
                      padding: '2px 8px', borderRadius: 6,
                    }}>{c.codigo}</span>
                    {av ? <Badge conf={av.conformidade} /> : (
                      <span style={{
                        fontSize: 11, color: L.t4, background: L.surface,
                        padding: '3px 8px', borderRadius: 20,
                      }}>Não auditado</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: L.t1, fontWeight: 500, marginBottom: 4 }}>{c.descricao}</div>
                  {c.evidencia_requerida && (
                    <div style={{ fontSize: 11, color: L.t3 }}>
                      Evidência: {c.evidencia_requerida}
                    </div>
                  )}
                  {av && (
                    <div style={{ fontSize: 11, color: L.t4, marginTop: 4 }}>
                      Última auditoria: {fmtDate(av.data_avaliacao)}
                      {av.auditor && ` · ${av.auditor}`}
                      {av.proxima_avaliacao && ` · Próx: ${fmtDate(av.proxima_avaliacao)}`}
                    </div>
                  )}
                </div>
                <button onClick={() => setAvaliarCrit(c)} style={{ ...btnPrimary, marginTop: 2 }}>
                  Avaliar
                </button>
              </div>
            )
          })}
        </div>
      )}

      {avaliarCrit && (
        <AuditoriaModal
          criterio={avaliarCrit}
          onClose={() => setAvaliarCrit(null)}
          onSaved={load}
        />
      )}

      {wizardOpen && filteredCrits.length > 0 && (
        <WizardAuditoria
          criterios={filteredCrits}
          clinicaId={clinicaId}
          onClose={() => setWizardOpen(false)}
          onDone={load}
        />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   TAB 2 — Plano de Ação
══════════════════════════════════════════════════════════════════ */
function NovoPlanModal({ clinicaId, criteriosNC, avaliacoes, onClose, onSaved }) {
  const [form, setForm] = useState({
    criterio_id: '',
    avaliacao_id: '',
    acao: '',
    responsavel: '',
    prazo: '',
    status: 'pendente',
    evidencia_conclusao: '',
  })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // when criterio changes, pre-select latest avaliacao
  function handleCriterioChange(e) {
    const critId = e.target.value
    const av = avaliacoes.find(a => a.criterio_id === critId)
    setForm(f => ({ ...f, criterio_id: critId, avaliacao_id: av?.id || '' }))
  }

  async function handleSave() {
    if (!form.criterio_id || !form.acao || !form.responsavel || !form.prazo) return
    setSaving(true)
    const { error } = await supabase.from('acreditacao_planos').insert({
      clinica_id: clinicaId,
      ...form,
      avaliacao_id: form.avaliacao_id || null,
    })
    setSaving(false)
    if (!error) { onSaved(); onClose() }
  }

  return (
    <Modal title="Novo Plano de Ação" onClose={onClose} wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="CRITÉRIO NÃO CONFORME">
          <select value={form.criterio_id} onChange={handleCriterioChange}
            onFocus={focus} onBlur={blur} style={inp}>
            <option value="">Selecionar critério...</option>
            {criteriosNC.map(c => (
              <option key={c.id} value={c.id}>[{c.codigo}] {c.descricao}</option>
            ))}
          </select>
        </Field>

        <Field label="AÇÃO CORRETIVA / PREVENTIVA">
          <textarea value={form.acao} onChange={set('acao')}
            onFocus={focus} onBlur={blur} rows={3}
            style={{ ...inp, resize: 'vertical' }}
            placeholder="Descreva a ação a ser realizada..." />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="RESPONSÁVEL">
            <input value={form.responsavel} onChange={set('responsavel')}
              onFocus={focus} onBlur={blur} style={inp} placeholder="Nome do responsável" />
          </Field>
          <Field label="PRAZO">
            <input type="date" value={form.prazo} onChange={set('prazo')}
              onFocus={focus} onBlur={blur} style={inp} />
          </Field>
        </div>

        <Field label="STATUS INICIAL">
          <select value={form.status} onChange={set('status')}
            onFocus={focus} onBlur={blur} style={inp}>
            {Object.entries(STATUS_PLANO).map(([v, m]) => (
              <option key={v} value={v}>{m.label}</option>
            ))}
          </select>
        </Field>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          <button onClick={handleSave} style={btnPrimary} disabled={saving || !form.criterio_id || !form.acao}>
            {saving ? <Spinner /> : null}
            {saving ? 'Salvando...' : 'Criar Plano de Ação'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function UpdatePlanoModal({ plano, criterio, onClose, onSaved }) {
  const [form, setForm] = useState({
    status: plano.status || 'pendente',
    evidencia_conclusao: plano.evidencia_conclusao || '',
  })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase.from('acreditacao_planos')
      .update({ status: form.status, evidencia_conclusao: form.evidencia_conclusao })
      .eq('id', plano.id)
    setSaving(false)
    if (!error) { onSaved(); onClose() }
  }

  return (
    <Modal title="Atualizar Plano de Ação" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {criterio && (
          <div style={{
            background: L.surface, borderRadius: 10, padding: 12,
            fontSize: 13, color: L.t2, borderLeft: `3px solid ${L.teal}`,
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: L.teal }}>{criterio.codigo}</span>
            <div style={{ fontWeight: 500, marginTop: 4 }}>{criterio.descricao}</div>
          </div>
        )}

        <div style={{
          background: L.surface, borderRadius: 10, padding: 12, fontSize: 13, color: L.t2,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Ação:</div>
          <div>{plano.acao}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: L.t3 }}>
            Responsável: {plano.responsavel} · Prazo: {fmtDate(plano.prazo)}
          </div>
        </div>

        <Field label="STATUS">
          <select value={form.status} onChange={set('status')}
            onFocus={focus} onBlur={blur} style={inp}>
            {Object.entries(STATUS_PLANO).map(([v, m]) => (
              <option key={v} value={v}>{m.label}</option>
            ))}
          </select>
        </Field>

        <Field label="EVIDÊNCIA DE CONCLUSÃO">
          <textarea value={form.evidencia_conclusao} onChange={set('evidencia_conclusao')}
            onFocus={focus} onBlur={blur} rows={3}
            style={{ ...inp, resize: 'vertical' }}
            placeholder="Descreva a evidência de conclusão da ação..." />
        </Field>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          <button onClick={handleSave} style={btnPrimary} disabled={saving}>
            {saving ? <Spinner /> : null}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function PlanoAcao({ clinicaId }) {
  const [planos, setPlanos] = useState([])
  const [criterios, setCriterios] = useState([])
  const [avaliacoes, setAvaliacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterResp, setFilterResp] = useState('')
  const [filterPrazo, setFilterPrazo] = useState('')
  const [novoModal, setNovoModal] = useState(false)
  const [updatePlano, setUpdatePlano] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: pl }, { data: cr }, { data: av }] = await Promise.all([
      supabase.from('acreditacao_planos').select('*').eq('clinica_id', clinicaId).order('criado_em', { ascending: false }),
      supabase.from('acreditacao_criterios').select('*').eq('clinica_id', clinicaId),
      supabase.from('acreditacao_avaliacoes').select('*').eq('clinica_id', clinicaId).order('data_avaliacao', { ascending: false }),
    ])
    setPlanos(pl || [])
    setCriterios(cr || [])
    setAvaliacoes(av || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  // criterios with non-conforme latest avaliacao
  const criteriosNC = criterios.filter(c => {
    const av = avaliacoes.find(a => a.criterio_id === c.id)
    return !av || av.conformidade === 'nao_conforme' || av.conformidade === 'parcialmente_conforme'
  })

  function getCriterio(id) { return criterios.find(c => c.id === id) }

  // filter
  const filtered = planos.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false
    if (filterResp && !p.responsavel?.toLowerCase().includes(filterResp.toLowerCase())) return false
    if (filterPrazo === 'atrasado' && !isPast(p.prazo)) return false
    if (filterPrazo === 'ok' && isPast(p.prazo)) return false
    return true
  })

  // KPIs
  const total = planos.length
  const concluidas = planos.filter(p => p.status === 'concluido').length
  const atrasadas = planos.filter(p => isPast(p.prazo) && p.status !== 'concluido').length
  const projPct = (() => {
    if (criterios.length === 0) return 0
    const withPlano = new Set(planos.filter(p => p.status === 'concluido').map(p => p.criterio_id))
    const conforme = criterios.filter(c => {
      const av = avaliacoes.find(a => a.criterio_id === c.id)
      return av?.conformidade === 'conforme' || withPlano.has(c.id)
    })
    return Math.round((conforme.length / criterios.length) * 100)
  })()

  function kpiColor(label, val) {
    if (label === 'Atrasadas') return val > 0 ? L.red : L.green
    if (label === 'Concluídas') return L.green
    if (label === '% Proj.') return val >= 80 ? L.green : val >= 60 ? L.yellow : L.red
    return L.t1
  }

  const kpis = [
    { label: 'Total Ações', value: total },
    { label: 'Concluídas', value: concluidas },
    { label: 'Atrasadas', value: atrasadas },
    { label: '% Proj.', value: `${projPct}%` },
  ]

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12,
            padding: '14px 20px', flex: 1, minWidth: 110,
          }}>
            <div style={{
              fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 4, letterSpacing: '0.3px',
            }}>{k.label}</div>
            <div style={{
              fontSize: 24, fontWeight: 700, color: kpiColor(k.label, typeof k.value === 'string' ? parseInt(k.value) : k.value),
            }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters + action */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 160 }}>
          <Field label="FILTRAR STATUS">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              onFocus={focus} onBlur={blur} style={inp}>
              <option value="">Todos</option>
              {Object.entries(STATUS_PLANO).map(([v, m]) => (
                <option key={v} value={v}>{m.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div style={{ minWidth: 160 }}>
          <Field label="RESPONSÁVEL">
            <input value={filterResp} onChange={e => setFilterResp(e.target.value)}
              onFocus={focus} onBlur={blur} style={inp} placeholder="Buscar..." />
          </Field>
        </div>
        <div style={{ minWidth: 140 }}>
          <Field label="PRAZO">
            <select value={filterPrazo} onChange={e => setFilterPrazo(e.target.value)}
              onFocus={focus} onBlur={blur} style={inp}>
              <option value="">Todos</option>
              <option value="atrasado">Atrasados</option>
              <option value="ok">No prazo</option>
            </select>
          </Field>
        </div>
        <button onClick={() => setNovoModal(true)} style={{ ...btnPrimary, marginTop: 16 }}>
          + Novo Plano de Ação
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{
          background: L.surface, border: `1px solid ${L.line}`, borderRadius: 12,
          padding: 32, textAlign: 'center', fontSize: 13, color: L.t3,
        }}>
          {planos.length === 0 ? 'Nenhum plano de ação cadastrado.' : 'Nenhum plano corresponde ao filtro.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: L.surface }}>
                {['Critério', 'Ação', 'Responsável', 'Prazo', 'Status', 'Evidência', 'Ações'].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600,
                    color: L.t3, borderBottom: `1px solid ${L.line}`,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const crit = getCriterio(p.criterio_id)
                const past = isPast(p.prazo) && p.status !== 'concluido'
                return (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${L.line}` }}>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      {crit ? (
                        <div>
                          <span style={{
                            fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                            color: L.teal, fontWeight: 700,
                          }}>{crit.codigo}</span>
                          <div style={{ fontSize: 11, color: L.t3, maxWidth: 180 }}>{crit.descricao}</div>
                        </div>
                      ) : <span style={{ color: L.t4, fontSize: 11 }}>-</span>}
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', maxWidth: 220 }}>
                      <span style={{ fontSize: 13, color: L.t1 }}>{p.acao}</span>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      <span style={{ color: L.t2 }}>{p.responsavel || '-'}</span>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                      <span style={{ color: past ? L.red : L.t2, fontWeight: past ? 600 : 400 }}>
                        {fmtDate(p.prazo)}{past ? ' ⚠' : ''}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <StatusBadge status={p.status} />
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top', maxWidth: 160 }}>
                      <span style={{ fontSize: 12, color: L.t3 }}>
                        {p.evidencia_conclusao ? p.evidencia_conclusao.slice(0, 60) + (p.evidencia_conclusao.length > 60 ? '…' : '') : '-'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <button onClick={() => setUpdatePlano(p)} style={{
                        fontSize: 12, color: L.teal, background: L.tealBg,
                        border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontWeight: 600,
                      }}>Atualizar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {novoModal && (
        <NovoPlanModal
          clinicaId={clinicaId}
          criteriosNC={criteriosNC}
          avaliacoes={avaliacoes}
          onClose={() => setNovoModal(false)}
          onSaved={load}
        />
      )}

      {updatePlano && (
        <UpdatePlanoModal
          plano={updatePlano}
          criterio={getCriterio(updatePlano.criterio_id)}
          onClose={() => setUpdatePlano(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
export default function PageAcreditacao({ profile }) {
  const clinicaId = profile?.clinica_id
  const [tab, setTab] = useState(0)

  const TABS = [
    { label: 'Painel de Conformidade', icon: '📊' },
    { label: 'Auditoria Interna', icon: '🔍' },
    { label: 'Plano de Ação', icon: '📋' },
  ]

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        @keyframes up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: L.tealBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>🏥</div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: L.t1, lineHeight: 1.2 }}>
              Acreditação Hospitalar
            </h1>
            <div style={{ fontSize: 12, color: L.t3 }}>
              ONA / JCI — Checklists, auditorias internas e planos de ação
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: `2px solid ${L.line}`,
        marginBottom: 28, overflowX: 'auto',
      }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding: '10px 20px', fontSize: 13, fontWeight: tab === i ? 600 : 500,
            color: tab === i ? L.teal : L.t3,
            background: 'none', border: 'none', borderBottom: `2px solid ${tab === i ? L.teal : 'transparent'}`,
            marginBottom: -2, cursor: 'pointer', display: 'flex', gap: 7, alignItems: 'center',
            whiteSpace: 'nowrap', transition: 'color 0.15s',
          }}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ animation: 'up 0.2s ease' }} key={tab}>
        {tab === 0 && <PainelConformidade clinicaId={clinicaId} />}
        {tab === 1 && <AuditoriaInterna clinicaId={clinicaId} />}
        {tab === 2 && <PlanoAcao clinicaId={clinicaId} />}
      </div>
    </div>
  )
}
