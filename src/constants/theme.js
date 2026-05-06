export const L = {
  bg: '#ffffff',
  bgWarm: '#fafafa',
  white: '#ffffff',
  surface: '#f9fafb',
  hover: '#f3f4f6',
  line: '#e5e7eb',
  lineSoft: '#f3f4f6',

  // Primary — teal médico
  teal: '#0d6e6e',
  tealMd: '#0f8585',
  tealLt: '#12a0a0',
  tealBg: '#f0fafa',

  // Secondary — copper
  copper: '#6b7280',
  copperBg: '#f9fafb',

  // Text hierarchy
  t1: '#111827',
  t2: '#374151',
  t3: '#6b7280',
  t4: '#9ca3af',
  t5: '#d1d5db',

  // Status
  green: '#16a34a',
  greenBg: '#f0fdf4',
  greenBd: '#bbf7d0',

  red: '#dc2626',
  redBg: '#fef2f2',
  redBd: '#fecaca',

  yellow: '#ca8a04',
  yellowBg: '#fefce8',
  yellowBd: '#fde68a',

  blue: '#2563eb',
  blueBg: '#eff6ff',
  blueBd: '#bfdbfe',

  purple: '#7c3aed',
  purpleBg: '#f5f3ff',
  purpleBd: '#ddd6fe',

  orange: '#ea580c',
  orangeBg: '#fff7ed',
  orangeBd: '#fed7aa',
}

export const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --teal: ${L.teal};
    --teal-bg: ${L.tealBg};
    --line: ${L.line};
    --surface: ${L.surface};
  }

  html, body { height: 100%; }

  body {
    font-family: 'Instrument Sans', system-ui, sans-serif;
    background: ${L.bg};
    color: ${L.t1};
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  #root { height: 100%; }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${L.line}; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: ${L.t4}; }

  @keyframes up {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .anim-up  { animation: up 0.25s ease both; }
  .anim-in  { animation: in 0.2s ease both; }

  button { cursor: pointer; border: none; background: none; font-family: inherit; font-size: inherit; }
  input, textarea, select { font-family: inherit; font-size: inherit; }
  a { text-decoration: none; color: inherit; }

  @media (max-width: 640px) {
    .hide-mobile { display: none !important; }
    .modal-wrap { width: 100% !important; border-radius: 16px 16px 0 0 !important; }
  }
  @media (min-width: 640px) and (max-width: 1023px) {
    .grid-cols-4 { grid-template-columns: repeat(2, 1fr) !important; }
  }
  @media (min-width: 1920px) {
    .page-content { max-width: 1800px; margin: 0 auto; }
  }
`
