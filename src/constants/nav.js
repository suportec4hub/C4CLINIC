export const ROLES = {
  C4HUB_ADMIN: 'c4hub_admin',
  C4HUB:       'c4hub',
  ADMIN:       'admin_clinica',
  MEDICO:      'medico',
  RECEPCIONISTA: 'recepcionista',
  ATENDENTE:   'atendente',
  FINANCEIRO:  'financeiro',
}

export const ROLE_LABELS = {
  c4hub_admin:   'C4HUB Admin',
  c4hub:         'C4HUB',
  admin_clinica: 'Admin Clínica',
  medico:        'Médico',
  recepcionista: 'Recepcionista',
  atendente:     'Atendente',
  financeiro:    'Financeiro',
}

export const TIPO_LABELS = {
  c4hub:    'C4 HUB',
  clinica:  'Clínica',
  hospital: 'Hospital',
}

// Quem pode acessar a área de admin master
export const isC4HubAdmin = (cargo) =>
  ['c4hub_admin', 'c4hub'].includes(cargo)

// Quem pode gerenciar usuários e clínica localmente
export const isClinicaAdmin = (cargo) =>
  ['c4hub_admin', 'c4hub', 'admin_clinica'].includes(cargo)

export const NAV_ITEMS = [
  {
    group: 'principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
    ]
  },
  {
    group: 'clínica',
    items: [
      { id: 'pacientes',          label: 'Pacientes',           icon: '◈' },
      { id: 'prontuario',         label: 'Prontuário',          icon: '⊕' },
      { id: 'triagem',            label: 'Triagem',             icon: '♡' },
      { id: 'fluxo',              label: 'Fluxo de Atendimento',icon: '⟳' },
      { id: 'agenda',             label: 'Agenda',              icon: '◷' },
      { id: 'consultas',          label: 'Consultas',           icon: '✦' },
      { id: 'telemedicina',       label: 'Telemedicina',        icon: '⊡' },
      { id: 'documentos',         label: 'Documentos',          icon: '◫' },
      { id: 'assinatura',         label: 'Assinatura Digital',  icon: '✍' },
      { id: 'prescricao_digital', label: 'Prescrição Digital',  icon: '◧' },
      { id: 'vacinas',            label: 'Vacinas',             icon: '◎' },
      { id: 'imagens',            label: 'Imagens / PACS',      icon: '◨' },
      { id: 'plano_tratamento',   label: 'Plano de Tratamento', icon: '◩' },
      { id: 'protocolos',         label: 'Protocolos',          icon: '⊟' },
      { id: 'internacao',         label: 'Internação',          icon: '⊠' },
      { id: 'cirurgia',           label: 'Cirurgia',            icon: '✚' },
      { id: 'laboratorio',        label: 'Laboratório',         icon: '⊛' },
      { id: 'odontograma',        label: 'Odontograma',         icon: '◉' },
      { id: 'fisioterapia',       label: 'Fisioterapia',        icon: '◌' },
      { id: 'nutricao',           label: 'Nutrição',            icon: '◍' },
      { id: 'psicologia',         label: 'Psicologia',          icon: '◎' },
      { id: 'medicos',            label: 'Médicos',             icon: '◇' },
    ]
  },
  {
    group: 'gestão',
    items: [
      { id: 'convenios',     label: 'Convênios',     icon: '⊡' },
      { id: 'financeiro',    label: 'Financeiro',    icon: '◬' },
      { id: 'faturamento',   label: 'Faturamento',   icon: '◰' },
      { id: 'nfse',          label: 'NFS-e',         icon: '◱' },
      { id: 'tiss',          label: 'TISS / ANS',    icon: '◲' },
      { id: 'autorizacoes',  label: 'Autorizações',  icon: '◳' },
      { id: 'farmacia',      label: 'Farmácia',      icon: '⊛' },
      { id: 'estoque',       label: 'Estoque',       icon: '▣' },
      { id: 'salas',         label: 'Salas',         icon: '▦' },
      { id: 'centro_custos', label: 'Centro de Custos', icon: '◬' },
      { id: 'rh',            label: 'RH',            icon: '◈' },
      { id: 'sped',          label: 'SPED / REINF',  icon: '▤' },
      { id: 'relatorios',    label: 'Relatórios',    icon: '▤' },
      { id: 'nps',           label: 'NPS',           icon: '◌' },
      { id: 'comunicacao',   label: 'Comunicação',   icon: '◍' },
    ]
  },
  {
    group: 'tecnologia',
    items: [
      { id: 'painel_tv',      label: 'Painel de TV',    icon: '▣' },
      { id: 'portal_paciente',label: 'Portal do Paciente', icon: '◈' },
      { id: 'integracoes',    label: 'Integrações',     icon: '⊕' },
      { id: 'lgpd',           label: 'LGPD',            icon: '◫' },
    ]
  },
  {
    group: 'administração',
    items: [
      { id: 'usuarios',      label: 'Usuários',          icon: '◉', minRole: 'admin_clinica' },
      { id: 'atividades',    label: 'Log de Atividades', icon: '◎', minRole: 'admin_clinica' },
      { id: 'configuracoes', label: 'Configurações',     icon: '⚙', minRole: 'admin_clinica' },
    ]
  },
  {
    group: 'C4HUB',
    c4hubOnly: true,
    items: [
      { id: 'clientes',       label: 'Clínicas & Hospitais', icon: '🏥', c4hubOnly: true },
      { id: 'todos_usuarios', label: 'Todos os Usuários',    icon: '👥', c4hubOnly: true },
    ]
  }
]

export const PAGE_TITLES = {
  dashboard:          'Dashboard',
  pacientes:          'Pacientes',
  triagem:            'Triagem & Sinais Vitais',
  agenda:             'Agenda',
  consultas:          'Consultas',
  telemedicina:       'Telemedicina',
  documentos:         'Documentos Médicos',
  assinatura:         'Assinatura Digital',
  prescricao_digital: 'Prescrição Digital',
  vacinas:            'Controle de Vacinas',
  imagens:            'Imagens & PACS',
  plano_tratamento:   'Plano de Tratamento',
  protocolos:         'Protocolos Clínicos',
  autorizacoes:       'Central de Autorizações',
  internacao:         'Internação',
  cirurgia:           'Centro Cirúrgico',
  laboratorio:        'Laboratório',
  odontograma:        'Odontograma',
  fisioterapia:       'Fisioterapia',
  nutricao:           'Nutrição',
  psicologia:         'Psicologia',
  medicos:            'Médicos',
  convenios:          'Convênios',
  financeiro:         'Financeiro',
  faturamento:        'Faturamento',
  nfse:               'NFS-e',
  tiss:               'TISS / ANS',
  farmacia:           'Farmácia',
  estoque:            'Estoque',
  salas:              'Salas',
  centro_custos:      'Centro de Custos',
  rh:                 'Recursos Humanos',
  sped:               'SPED / REINF',
  relatorios:         'Relatórios',
  nps:                'NPS & Satisfação',
  comunicacao:        'Comunicação com Pacientes',
  painel_tv:          'Painel de TV / Totem',
  portal_paciente:    'Portal do Paciente',
  integracoes:        'Integrações',
  lgpd:               'LGPD & Privacidade',
  usuarios:           'Usuários',
  configuracoes:      'Configurações',
  clientes:           'Clínicas & Hospitais',
  todos_usuarios:     'Todos os Usuários',
  fluxo:              'Painel de Fluxo',
  atividades:         'Log de Atividades',
  prontuario:         'Prontuário Eletrônico',
}
