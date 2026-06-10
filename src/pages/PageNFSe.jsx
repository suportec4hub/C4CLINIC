import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: `1.5px solid ${L.line}`, borderRadius: 8,
  background: L.bg, color: L.t1, outline: 'none',
}
const ta = { ...inp, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }

function focus(e) { e.target.style.borderColor = L.teal }
function blur(e) { e.target.style.borderColor = L.line }

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, color: L.t4, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px' }}>{label}</label>
      {children}
    </div>
  )
}

function Modal({ title, onClose, wide, children }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: L.bg, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: wide ? 760 : 560, maxHeight: '92vh', overflowY: 'auto', animation: 'up 0.25s ease', boxShadow: '0 -8px 40px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${L.line}`, position: 'sticky', top: 0, background: L.bg, zIndex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: L.t1 }}>{title}</div>
          <button onClick={onClose} style={{ fontSize: 20, color: L.t3, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    pendente:  { bg: L.yellowBg, color: L.yellow, label: 'Pendente' },
    emitida:   { bg: L.greenBg,  color: L.green,  label: 'Emitida' },
    cancelada: { bg: L.redBg,    color: L.red,     label: 'Cancelada' },
    rejeitada: { bg: L.redBg,    color: L.red,     label: 'Rejeitada' },
  }
  const s = map[status] || map.pendente
  return (
    <span style={{ padding: '2px 9px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
  )
}

const CODIGOS_SERVICO = [
  { codigo: '8630', descricao: 'Serviços de saúde humana' },
  { codigo: '8011', descricao: 'Análises clínicas e exames laboratoriais' },
  { codigo: '7319', descricao: 'Outros serviços de publicidade' },
  { codigo: '8020', descricao: 'Serviços de psicologia e psicanálise' },
  { codigo: '8219', descricao: 'Serviços de enfermagem, parto e outros' },
]

function gerarXmlNFSe(nf, clinica) {
  const now = new Date()
  return `<?xml version="1.0" encoding="UTF-8"?>
<ConsultarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Pedido>
    <InfPedido Id="Pedido${nf.numero_nf || '001'}">
      <IdentificacaoRps>
        <Numero>${nf.numero_nf || '001'}</Numero>
        <Serie>${nf.serie || '1'}</Serie>
        <Tipo>1</Tipo>
      </IdentificacaoRps>
      <DataEmissao>${nf.data_emissao || now.toISOString().split('T')[0]}</DataEmissao>
      <NaturezaOperacao>1</NaturezaOperacao>
      <RegimeEspecialTributacao>6</RegimeEspecialTributacao>
      <OptanteSimplesNacional>1</OptanteSimplesNacional>
      <Servico>
        <Valores>
          <ValorServicos>${Number(nf.valor_servico).toFixed(2)}</ValorServicos>
          <ValorDeducoes>0.00</ValorDeducoes>
          <Aliquota>0.0500</Aliquota>
        </Valores>
        <ItemListaServico>${nf.codigo_servico || '8630'}</ItemListaServico>
        <Discriminacao>${nf.descricao || 'Prestação de serviços médicos'}</Discriminacao>
        <CodigoMunicipio>3550308</CodigoMunicipio>
      </Servico>
      <Prestador>
        <CpfCnpj><Cnpj>${(clinica?.cnpj || '00000000000000').replace(/\D/g, '')}</Cnpj></CpfCnpj>
        <RazaoSocial>${clinica?.nome || 'Clinica'}</RazaoSocial>
      </Prestador>
    </InfPedido>
  </Pedido>
</ConsultarNfseEnvio>`
}

export default function PageNFSe({ profile }) {
  const [notas, setNotas] = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [clinica, setClinica] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [xmlModal, setXmlModal] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  const clinicaId = profile?.clinica_id

  useEffect(() => { if (clinicaId) load() }, [clinicaId])

  async function load() {
    setLoading(true)
    const [nfs, lcs, pacs, clin] = await Promise.all([
      supabase.from('notas_fiscais')
        .select('*, pacientes(nome)')
        .eq('clinica_id', clinicaId)
        .order('criado_em', { ascending: false })
        .limit(200),
      supabase.from('financeiro_lancamentos')
        .select('id, descricao, valor, data_vencimento, paciente_id, pacientes(nome)')
        .eq('clinica_id', clinicaId)
        .eq('tipo', 'receita')
        .eq('status', 'pago')
        .order('data_vencimento', { ascending: false })
        .limit(100),
      supabase.from('pacientes').select('id, nome').eq('clinica_id', clinicaId).order('nome'),
      supabase.from('clinicas').select('nome, cnpj, endereco, telefone').eq('id', clinicaId).single(),
    ])
    setNotas(nfs.data || [])
    setLancamentos(lcs.data || [])
    setPacientes(pacs.data || [])
    setClinica(clin.data)
    setLoading(false)
  }

  function abrirNovo(lanc = null) {
    const base = {
      clinica_id: clinicaId,
      serie: '1',
      data_emissao: new Date().toISOString().slice(0, 10),
      codigo_servico: '8630',
      status: 'pendente',
    }
    if (lanc) {
      setForm({
        ...base,
        lancamento_id: lanc.id,
        paciente_id: lanc.paciente_id,
        valor_servico: lanc.valor,
        descricao: lanc.descricao || 'Prestação de serviços médicos',
      })
    } else {
      setForm(base)
    }
    setModal('form')
  }

  async function salvar() {
    if (!form.valor_servico) return
    setSaving(true)
    const { pacientes: _, ...data } = form
    if (data.id) {
      const { id, ...rest } = data
      await supabase.from('notas_fiscais').update(rest).eq('id', id)
    } else {
      // Auto number
      const numero = `NF-${Date.now().toString().slice(-6)}`
      await supabase.from('notas_fiscais').insert({ ...data, numero_nf: numero })
    }
    setSaving(false)
    setModal(null)
    load()
  }

  function gerarXml(nf) {
    const xml = gerarXmlNFSe(nf, clinica)
    setXmlModal({ xml, nf })
    // Also save to record
    supabase.from('notas_fiscais').update({ xml, status: 'emitida' }).eq('id', nf.id).then(() => load())
  }

  function downloadXml(xml, nf) {
    const blob = new Blob([xml], { type: 'text/xml;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `nfse_${nf.numero_nf || nf.id}.xml`; a.click()
    URL.revokeObjectURL(url)
  }

  async function cancelar(id) {
    await supabase.from('notas_fiscais').update({ status: 'cancelada' }).eq('id', id)
    load()
  }

  const fmt = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtDt = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const filtradas = notas.filter(n => {
    const matchBusca = !busca || n.pacientes?.nome?.toLowerCase().includes(busca.toLowerCase()) || n.numero_nf?.includes(busca)
    const matchStatus = !filtroStatus || n.status === filtroStatus
    return matchBusca && matchStatus
  })

  const kpis = {
    total: notas.length,
    emitidas: notas.filter(n => n.status === 'emitida').length,
    pendentes: notas.filter(n => n.status === 'pendente').length,
    valorTotal: notas.filter(n => n.status === 'emitida').reduce((s, n) => s + Number(n.valor_servico || 0), 0),
  }

  // Lancamentos without NF
  const lancSemNF = lancamentos.filter(l => !notas.some(n => n.lancamento_id === l.id))

  return (
    <div style={{ padding: '24px 28px' }}>
      <style>{`@keyframes up{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'TOTAL NF-e', value: kpis.total, color: L.teal },
          { label: 'EMITIDAS', value: kpis.emitidas, color: L.green },
          { label: 'PENDENTES', value: kpis.pendentes, color: L.yellow },
          { label: 'VALOR EMITIDO', value: fmt(kpis.valorTotal), color: L.teal },
        ].map(k => (
          <div key={k.label} style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: k.color, fontFamily: "'Outfit', sans-serif" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Alerta lançamentos sem NF */}
      {lancSemNF.length > 0 && (
        <div style={{ background: L.tealBg, border: `1px solid ${L.teal}30`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: L.teal }}>
            <strong>{lancSemNF.length}</strong> lançamento(s) pago(s) sem NFS-e emitida
          </div>
          <button onClick={() => setModal('importar')} style={{ padding: '6px 14px', background: L.teal, color: L.white, border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Emitir NFS-e
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <input placeholder="Buscar por paciente ou número..." value={busca} onChange={e => setBusca(e.target.value)}
          style={{ flex: 1, maxWidth: 300, ...inp, width: 'auto' }} onFocus={focus} onBlur={blur} />
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
          style={{ ...inp, width: 'auto', appearance: 'none' }}>
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="emitida">Emitida</option>
          <option value="cancelada">Cancelada</option>
          <option value="rejeitada">Rejeitada</option>
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: L.t3 }}>{filtradas.length} notas</div>
        <button onClick={() => abrirNovo()} style={{ padding: '9px 18px', background: L.teal, color: L.white, borderRadius: 8, fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
          + Nova NFS-e
        </button>
      </div>

      {/* Table */}
      <div style={{ background: L.bg, border: `1px solid ${L.line}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 100px 100px 140px', padding: '10px 16px', fontSize: 11, color: L.t4, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.3px', borderBottom: `1px solid ${L.line}`, background: L.surface }}>
          <span>NÚMERO</span><span>PACIENTE / DESCRIÇÃO</span><span>VALOR</span><span>DATA</span><span>STATUS</span><span>AÇÕES</span>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ width: 24, height: 24, border: `3px solid ${L.line}`, borderTop: `3px solid ${L.teal}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
          </div>
        ) : filtradas.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: L.t4, fontSize: 14 }}>
            Nenhuma NFS-e encontrada
          </div>
        ) : filtradas.map((nf, i) => (
          <div key={nf.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 100px 100px 140px', padding: '12px 16px', alignItems: 'center', fontSize: 13, borderBottom: `1px solid ${L.lineSoft}`, background: i % 2 === 0 ? 'transparent' : L.surface }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: L.teal, fontWeight: 600 }}>
              {nf.numero_nf || '—'}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: L.t1 }}>{nf.pacientes?.nome || '—'}</div>
              <div style={{ fontSize: 11, color: L.t4 }}>{nf.descricao?.slice(0, 60) || ''}</div>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", color: L.green, fontWeight: 600 }}>{fmt(nf.valor_servico || 0)}</div>
            <div style={{ color: L.t2 }}>{fmtDt(nf.data_emissao)}</div>
            <div><StatusBadge status={nf.status} /></div>
            <div style={{ display: 'flex', gap: 6 }}>
              {nf.status === 'pendente' && (
                <button onClick={() => gerarXml(nf)} style={{ padding: '5px 8px', borderRadius: 6, background: L.tealBg, color: L.teal, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  XML
                </button>
              )}
              {nf.xml && (
                <button onClick={() => setXmlModal({ xml: nf.xml, nf })} style={{ padding: '5px 8px', borderRadius: 6, background: L.blueBg, color: L.blue, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  Ver
                </button>
              )}
              {nf.status !== 'cancelada' && (
                <button onClick={() => cancelar(nf.id)} style={{ padding: '5px 8px', borderRadius: 6, background: L.redBg, color: L.red, fontSize: 11, border: 'none', cursor: 'pointer' }}>
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Nova / Editar NFS-e */}
      {modal === 'form' && (
        <Modal title={form.id ? 'Editar NFS-e' : 'Nova NFS-e'} onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="PACIENTE">
                <select style={{ ...inp, appearance: 'none' }} value={form.paciente_id || ''} onChange={e => setForm({ ...form, paciente_id: e.target.value })} onFocus={focus} onBlur={blur}>
                  <option value="">Selecione...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </Field>
              <Field label="DATA DE EMISSÃO">
                <input type="date" style={inp} value={form.data_emissao || ''} onChange={e => setForm({ ...form, data_emissao: e.target.value })} onFocus={focus} onBlur={blur} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="VALOR DO SERVIÇO (R$) *">
                <input type="number" style={inp} value={form.valor_servico || ''} min="0" step="0.01" onChange={e => setForm({ ...form, valor_servico: e.target.value })} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="CÓDIGO DO SERVIÇO">
                <select style={{ ...inp, appearance: 'none' }} value={form.codigo_servico || '8630'} onChange={e => setForm({ ...form, codigo_servico: e.target.value })} onFocus={focus} onBlur={blur}>
                  {CODIGOS_SERVICO.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo} — {c.descricao}</option>)}
                </select>
              </Field>
            </div>
            <Field label="DESCRIÇÃO DO SERVIÇO">
              <textarea style={ta} value={form.descricao || ''} placeholder="Descreva o serviço prestado..." onChange={e => setForm({ ...form, descricao: e.target.value })} onFocus={focus} onBlur={blur} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="SÉRIE">
                <input style={inp} value={form.serie || '1'} onChange={e => setForm({ ...form, serie: e.target.value })} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="STATUS">
                <select style={{ ...inp, appearance: 'none' }} value={form.status || 'pendente'} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="pendente">Pendente</option>
                  <option value="emitida">Emitida</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '11px 0', borderRadius: 8, background: L.hover, color: L.t2, fontSize: 13, border: 'none', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={salvar} disabled={saving || !form.valor_servico} style={{ flex: 2, padding: '11px 0', borderRadius: 8, background: L.teal, color: L.white, fontWeight: 600, fontSize: 13, border: 'none', cursor: saving || !form.valor_servico ? 'not-allowed' : 'pointer', opacity: saving || !form.valor_servico ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar NFS-e'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Importar de Lançamentos */}
      {modal === 'importar' && (
        <Modal title="Emitir NFS-e de Lançamentos" onClose={() => setModal(null)} wide>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, color: L.t3, marginBottom: 8 }}>Selecione os lançamentos para emitir NFS-e:</div>
            {lancSemNF.map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: L.surface, borderRadius: 8, border: `1px solid ${L.line}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: L.t1, fontSize: 13 }}>{l.pacientes?.nome || '—'}</div>
                  <div style={{ fontSize: 11, color: L.t4 }}>{l.descricao} • {fmtDt(l.data_vencimento)}</div>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", color: L.green, fontWeight: 600 }}>{fmt(l.valor)}</div>
                <button onClick={() => { setModal(null); abrirNovo(l) }} style={{ padding: '6px 14px', background: L.teal, color: L.white, border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                  Emitir
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Modal: Visualizar XML */}
      {xmlModal && (
        <Modal title={`XML NFS-e — ${xmlModal.nf.numero_nf || 'Rascunho'}`} onClose={() => setXmlModal(null)} wide>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button onClick={() => downloadXml(xmlModal.xml, xmlModal.nf)} style={{ padding: '8px 16px', background: L.teal, color: L.white, border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              ↓ Baixar XML
            </button>
            <button onClick={() => navigator.clipboard.writeText(xmlModal.xml)} style={{ padding: '8px 16px', background: L.surface, color: L.t2, border: `1px solid ${L.line}`, borderRadius: 7, fontSize: 13, cursor: 'pointer' }}>
              Copiar
            </button>
          </div>
          <pre style={{ background: '#1a1a2e', color: '#7fdbca', padding: 16, borderRadius: 10, fontSize: 11, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 400, overflowY: 'auto', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
            {xmlModal.xml}
          </pre>
          <div style={{ marginTop: 12, padding: '10px 14px', background: L.yellowBg, borderRadius: 8, fontSize: 12, color: L.yellow, border: `1px solid ${L.yellowBd}` }}>
            ⚠ O XML gerado segue o padrão ABRASF NFS-e. Configure os dados do prestador (CNPJ, código na prefeitura) em Configurações antes de enviar à prefeitura.
          </div>
        </Modal>
      )}
    </div>
  )
}
