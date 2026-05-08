import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

const TIPO_CORES = {
  cadastro:    { color: L.teal,   bg: L.tealBg   },
  atualizacao: { color: L.blue,   bg: L.blueBg   },
  exclusao:    { color: L.red,    bg: L.redBg    },
  pagamento:   { color: L.green,  bg: L.greenBg  },
  login:       { color: L.t3,     bg: L.surface  },
  outro:       { color: L.purple, bg: L.purpleBg },
}

const TIPO_LABELS = {
  cadastro:    'Cadastro',
  atualizacao: 'Atualização',
  exclusao:    'Exclusão',
  pagamento:   'Pagamento',
  login:       'Login',
  outro:       'Outro',
}

function tipoFromAcao(acao = '') {
  const a = acao.toLowerCase()
  if (a.includes('cadastr') || a.includes('criou') || a.includes('novo') || a.includes('nova')) return 'cadastro'
  if (a.includes('atuali') || a.includes('editou') || a.includes('alterou')) return 'atualizacao'
  if (a.includes('excluiu') || a.includes('deletou') || a.includes('inativou')) return 'exclusao'
  if (a.includes('pagamento') || a.includes('pagou') || a.includes('recibo')) return 'pagamento'
  if (a.includes('login') || a.includes('entrou') || a.includes('saiu')) return 'login'
  return 'outro'
}

function tempoRelativo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  const hr   = Math.floor(diff / 3600000)
  const dias = Math.floor(diff / 86400000)
  if (min < 1)   return 'agora mesmo'
  if (min < 60)  return `há ${min} minuto${min !== 1 ? 's' : ''}`
  if (hr < 24)   return `há ${hr} hora${hr !== 1 ? 's' : ''}`
  if (dias < 7)  return `há ${dias} dia${dias !== 1 ? 's' : ''}`
  return new Date(iso).toLocaleDateString('pt-BR')
}

function diaSeparador(iso) {
  const d = new Date(iso)
  const hoje = new Date()
  const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1)
  if (d.toDateString() === hoje.toDateString())  return 'Hoje'
  if (d.toDateString() === ontem.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

export default function PageAtividades({ profile }) {
  const [logs, setLogs]         = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filtroUser, setFiltroUser]   = useState('')
  const [filtroTipo, setFiltroTipo]   = useState('')

  const clinicaId = profile?.clinica_id

  const load = useCallback(async () => {
    if (!clinicaId) return
    setLoading(true)
    const [{ data: logData }, { data: usData }] = await Promise.all([
      supabase.from('log_atividades')
        .select('*, usuarios(nome)')
        .eq('clinica_id', clinicaId)
        .order('criado_em', { ascending: false })
        .limit(300),
      supabase.from('usuarios')
        .select('id, nome')
        .eq('clinica_id', clinicaId)
        .eq('ativo', true)
        .order('nome'),
    ])
    setLogs(logData || [])
    setUsuarios(usData || [])
    setLoading(false)
  }, [clinicaId])

  useEffect(() => { load() }, [load])

  const filtrados = logs.filter(l => {
    if (filtroUser && l.usuario_id !== filtroUser) return false
    if (filtroTipo && tipoFromAcao(l.acao) !== filtroTipo) return false
    return true
  })

  let lastDay = null

  return (
    <div style={{ padding: '24px 28px', maxWidth: 800 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, alignItems: 'center' }}>
        <select
          value={filtroUser}
          onChange={e => setFiltroUser(e.target.value)}
          style={{
            padding: '8px 12px', fontSize: 13, border: `1.5px solid ${L.line}`,
            borderRadius: 8, background: L.bg, color: L.t2, outline: 'none', appearance: 'none'
          }}
        >
          <option value="">Todos os usuários</option>
          {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>

        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          style={{
            padding: '8px 12px', fontSize: 13, border: `1.5px solid ${L.line}`,
            borderRadius: 8, background: L.bg, color: L.t2, outline: 'none', appearance: 'none'
          }}
        >
          <option value="">Todos os tipos</option>
          {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', fontSize: 13, color: L.t4 }}>
          {filtrados.length} registro{filtrados.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={load}
          style={{
            padding: '8px 14px', borderRadius: 8, background: L.hover,
            color: L.t2, fontSize: 13
          }}
        >↺ Atualizar</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{
            width: 26, height: 26, border: `3px solid ${L.line}`,
            borderTop: `3px solid ${L.teal}`, borderRadius: '50%',
            animation: 'spin 0.7s linear infinite'
          }} />
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 0',
          color: L.t4, fontSize: 14
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>◎</div>
          <div style={{ fontWeight: 600, color: L.t2, marginBottom: 6 }}>Nenhuma atividade registrada</div>
          <div style={{ fontSize: 13 }}>
            As ações realizadas no sistema aparecerão aqui.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filtrados.map(log => {
            const tipo = tipoFromAcao(log.acao)
            const cores = TIPO_CORES[tipo] || TIPO_CORES.outro
            const dayLabel = diaSeparador(log.criado_em)
            const showSep = dayLabel !== lastDay
            lastDay = dayLabel

            return (
              <div key={log.id}>
                {showSep && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    margin: '16px 0 10px', color: L.t4, fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
                    letterSpacing: '0.6px'
                  }}>
                    <div style={{ flex: 1, height: 1, background: L.lineSoft }} />
                    {dayLabel}
                    <div style={{ flex: 1, height: 1, background: L.lineSoft }} />
                  </div>
                )}

                <div style={{
                  display: 'flex', gap: 14, padding: '12px 0',
                  borderBottom: `1px solid ${L.lineSoft}`,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: cores.bg, color: cores.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0, fontWeight: 700
                  }}>
                    {{ cadastro: '+', atualizacao: '✎', exclusao: '✕', pagamento: '✓', login: '→', outro: '◎' }[tipo]}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: L.t1, fontWeight: 500, marginBottom: 2 }}>
                      {log.acao}
                    </div>
                    {log.detalhes && Object.keys(log.detalhes).length > 0 && (
                      <div style={{
                        fontSize: 11, color: L.t3,
                        fontFamily: "'JetBrains Mono', monospace",
                        marginBottom: 2, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {Object.entries(log.detalhes).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <span style={{
                        fontSize: 11, padding: '2px 7px', borderRadius: 20,
                        background: cores.bg, color: cores.color, fontWeight: 600
                      }}>
                        {TIPO_LABELS[tipo]}
                      </span>
                      {log.usuarios?.nome && (
                        <span style={{ fontSize: 11, color: L.t4 }}>
                          por {log.usuarios.nome}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{
                    fontSize: 11, color: L.t4, flexShrink: 0,
                    fontFamily: "'JetBrains Mono', monospace",
                    paddingTop: 2
                  }}>
                    {tempoRelativo(log.criado_em)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
