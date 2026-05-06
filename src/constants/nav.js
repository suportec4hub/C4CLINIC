export const NAV_ITEMS = [
  {
    group: 'principal',
    items: [
      { id: 'dashboard',   label: 'Dashboard',    icon: '⊞' },
    ]
  },
  {
    group: 'clínica',
    items: [
      { id: 'pacientes',   label: 'Pacientes',    icon: '◈' },
      { id: 'agenda',      label: 'Agenda',       icon: '◷' },
      { id: 'consultas',   label: 'Consultas',    icon: '✦' },
      { id: 'medicos',     label: 'Médicos',      icon: '◇' },
    ]
  },
  {
    group: 'gestão',
    items: [
      { id: 'convenios',   label: 'Convênios',    icon: '⊡' },
      { id: 'financeiro',  label: 'Financeiro',   icon: '◬' },
      { id: 'relatorios',  label: 'Relatórios',   icon: '▤' },
    ]
  },
  {
    group: 'sistema',
    items: [
      { id: 'configuracoes', label: 'Configurações', icon: '⚙', adminOnly: true },
    ]
  }
]

export const ADMIN_ITEMS = ['configuracoes']

export const PAGE_TITLES = {
  dashboard:      'Dashboard',
  pacientes:      'Pacientes',
  agenda:         'Agenda',
  consultas:      'Consultas',
  medicos:        'Médicos',
  convenios:      'Convênios',
  financeiro:     'Financeiro',
  relatorios:     'Relatórios',
  configuracoes:  'Configurações',
}
