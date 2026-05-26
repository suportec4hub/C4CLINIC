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

export const isC4HubAdmin = (cargo) =>
  ['c4hub_admin', 'c4hub'].includes(cargo)

export const isClinicaAdmin = (cargo) =>
  ['c4hub_admin', 'c4hub', 'admin_clinica'].includes(cargo)

export const NAV_ITEMS = [
  {
    group: 'principal',
    items: [
      { id: 'dashboard',  label: 'Dashboard',  icon: '⊞' },
      { id: 'bi',         label: 'Business Intelligence', icon: '◈' },
    ]
  },
  {
    group: 'atendimento',
    items: [
      { id: 'pacientes',          label: 'Pacientes',           icon: '◈' },
      { id: 'agenda',             label: 'Agenda',              icon: '◷' },
      { id: 'agendamento_online', label: 'Agend. Online',       icon: '⊡' },
      { id: 'consultas',          label: 'Consultas',           icon: '✦' },
      { id: 'telemedicina',       label: 'Telemedicina',        icon: '◫' },
      { id: 'triagem',            label: 'Triagem',             icon: '♡' },
      { id: 'fluxo',              label: 'Fluxo de Atendimento',icon: '⟳' },
      { id: 'campanhas',          label: 'Campanhas de Saúde',  icon: '◌' },
    ]
  },
  {
    group: 'clínica',
    items: [
      { id: 'prontuario',         label: 'Prontuário',          icon: '⊕' },
      { id: 'prescricao_digital', label: 'Prescrição Digital',  icon: '◧' },
      { id: 'documentos',         label: 'Documentos',          icon: '◫' },
      { id: 'assinatura',         label: 'Assinatura Digital',  icon: '✍' },
      { id: 'vacinas',            label: 'Vacinas',             icon: '◎' },
      { id: 'imagens',            label: 'Imagens / PACS',      icon: '◨' },
      { id: 'plano_tratamento',   label: 'Plano de Tratamento', icon: '◩' },
      { id: 'protocolos',         label: 'Protocolos',          icon: '⊟' },
      { id: 'autorizacoes',       label: 'Autorizações',        icon: '◪' },
      { id: 'odontograma',        label: 'Odontograma',         icon: '◉' },
      { id: 'fisioterapia',       label: 'Fisioterapia',        icon: '◌' },
      { id: 'nutricao',           label: 'Nutrição',            icon: '◍' },
      { id: 'psicologia',         label: 'Psicologia',          icon: '◎' },
      { id: 'medicos',            label: 'Médicos',             icon: '◇' },
    ]
  },
  {
    group: 'hospitalar',
    items: [
      { id: 'internacao',     label: 'Internação',          icon: '⊠' },
      { id: 'cirurgia',       label: 'Cirurgia',            icon: '✚' },
      { id: 'laboratorio',    label: 'Laboratório',         icon: '⊛' },
      { id: 'farmacia',       label: 'Farmácia',            icon: '⊛' },
      { id: 'banco_sangue',   label: 'Banco de Sangue',     icon: '◈' },
      { id: 'esterilizacao',  label: 'Esterilização',       icon: '◉' },
      { id: 'plantoes',       label: 'Plantões & Escalas',  icon: '◷' },
    ]
  },
  {
    group: 'gestão',
    items: [
      { id: 'financeiro',    label: 'Financeiro',    icon: '◬' },
      { id: 'faturamento',   label: 'Faturamento',   icon: '◰' },
      { id: 'nfse',          label: 'NFS-e',         icon: '◱' },
      { id: 'tiss',          label: 'TISS / ANS',    icon: '◲' },
      { id: 'sped',          label: 'SPED / REINF',  icon: '▤' },
      { id: 'convenios',     label: 'Convênios',     icon: '⊡' },
      { id: 'comissoes',     label: 'Comissões',     icon: '◳' },
      { id: 'centro_custos', label: 'Centro de Custos', icon: '◬' },
      { id: 'estoque',       label: 'Estoque',       icon: '▣' },
      { id: 'compras',       label: 'Compras',       icon: '◰' },
      { id: 'manutencao',    label: 'Manutenção',    icon: '⚙' },
      { id: 'rh',            label: 'RH',            icon: '◈' },
      { id: 'salas',         label: 'Salas',         icon: '▦' },
    ]
  },
  {
    group: 'qualidade',
    items: [
      { id: 'kpis',        label: 'Indicadores (KPIs)', icon: '◬' },
      { id: 'ouvidoria',   label: 'Ouvidoria & Riscos', icon: '◌' },
      { id: 'acreditacao', label: 'Acreditação ONA/JCI',icon: '◉' },
      { id: 'nps',         label: 'NPS',               icon: '◍' },
      { id: 'relatorios',  label: 'Relatórios',         icon: '▤' },
    ]
  },
  {
    group: 'tecnologia',
    items: [
      { id: 'painel_tv',      label: 'Painel de TV',       icon: '▣' },
      { id: 'portal_paciente',label: 'Portal do Paciente',  icon: '◈' },
      { id: 'comunicacao',    label: 'Comunicação',         icon: '◍' },
      { id: 'importacao',     label: 'Importação de Dados', icon: '◫' },
      { id: 'integracoes',    label: 'Integrações',         icon: '⊕' },
      { id: 'api',            label: 'API & Backup',        icon: '◱' },
      { id: 'lgpd',           label: 'LGPD',               icon: '◪' },
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
  bi:                 'Business Intelligence',
  pacientes:          'Pacientes',
  agenda:             'Agenda',
  agendamento_online: 'Agendamento Online',
  consultas:          'Consultas',
  telemedicina:       'Telemedicina',
  triagem:            'Triagem & Sinais Vitais',
  fluxo:              'Painel de Fluxo',
  campanhas:          'Campanhas de Saúde',
  prontuario:         'Prontuário Eletrônico',
  prescricao_digital: 'Prescrição Digital',
  documentos:         'Documentos Médicos',
  assinatura:         'Assinatura Digital',
  vacinas:            'Controle de Vacinas',
  imagens:            'Imagens & PACS',
  plano_tratamento:   'Plano de Tratamento',
  protocolos:         'Protocolos Clínicos',
  autorizacoes:       'Central de Autorizações',
  odontograma:        'Odontograma',
  fisioterapia:       'Fisioterapia',
  nutricao:           'Nutrição',
  psicologia:         'Psicologia',
  medicos:            'Médicos',
  internacao:         'Internação',
  cirurgia:           'Centro Cirúrgico',
  laboratorio:        'Laboratório',
  farmacia:           'Farmácia',
  banco_sangue:       'Banco de Sangue',
  esterilizacao:      'Central de Esterilização',
  plantoes:           'Plantões & Escalas',
  financeiro:         'Financeiro',
  faturamento:        'Faturamento',
  nfse:               'NFS-e',
  tiss:               'TISS / ANS',
  sped:               'SPED / REINF',
  convenios:          'Convênios',
  comissoes:          'Comissões Médicas',
  centro_custos:      'Centro de Custos',
  estoque:            'Estoque',
  compras:            'Central de Compras',
  manutencao:         'Manutenção de Equipamentos',
  rh:                 'Recursos Humanos',
  salas:              'Salas',
  kpis:               'Indicadores de Qualidade',
  ouvidoria:          'Ouvidoria & Gestão de Riscos',
  acreditacao:        'Acreditação ONA/JCI',
  nps:                'NPS & Satisfação',
  relatorios:         'Relatórios',
  painel_tv:          'Painel de TV / Totem',
  portal_paciente:    'Portal do Paciente',
  comunicacao:        'Comunicação com Pacientes',
  importacao:         'Importação de Dados',
  integracoes:        'Integrações',
  api:                'API & Backup',
  lgpd:               'LGPD & Privacidade',
  usuarios:           'Usuários',
  configuracoes:      'Configurações',
  clientes:           'Clínicas & Hospitais',
  todos_usuarios:     'Todos os Usuários',
  atividades:         'Log de Atividades',
}
