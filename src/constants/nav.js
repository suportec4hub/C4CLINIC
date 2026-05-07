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
      { id: 'pacientes',  label: 'Pacientes',  icon: '◈' },
      { id: 'triagem',    label: 'Triagem',    icon: '♡' },
      { id: 'fluxo',     label: 'Fluxo de Atendimento', icon: '⟳' },
      { id: 'agenda',     label: 'Agenda',     icon: '◷' },
      { id: 'consultas',  label: 'Consultas',  icon: '✦' },
      { id: 'documentos', label: 'Documentos', icon: '◫' },
      { id: 'medicos',    label: 'Médicos',    icon: '◇' },
    ]
  },
  {
    group: 'gestão',
    items: [
      { id: 'convenios',  label: 'Convênios',  icon: '⊡' },
      { id: 'financeiro', label: 'Financeiro', icon: '◬' },
      { id: 'estoque',    label: 'Estoque',    icon: '▣' },
      { id: 'relatorios', label: 'Relatórios', icon: '▤' },
    ]
  },
  {
    group: 'administração',
    items: [
      { id: 'usuarios',      label: 'Usuários',     icon: '◉', minRole: 'admin_clinica' },
      { id: 'configuracoes', label: 'Configurações', icon: '⚙', minRole: 'admin_clinica' },
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
  dashboard:      'Dashboard',
  pacientes:      'Pacientes',
  triagem:        'Triagem & Sinais Vitais',
  agenda:         'Agenda',
  consultas:      'Consultas',
  documentos:     'Documentos Médicos',
  medicos:        'Médicos',
  convenios:      'Convênios',
  financeiro:     'Financeiro',
  estoque:        'Estoque',
  relatorios:     'Relatórios',
  usuarios:       'Usuários',
  configuracoes:  'Configurações',
  clientes:       'Clínicas & Hospitais',
  todos_usuarios: 'Todos os Usuários',
  fluxo:          'Painel de Fluxo',
}
