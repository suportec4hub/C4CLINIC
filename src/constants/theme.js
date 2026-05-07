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

  // Medical status colors
  statusNormal:  '#16a34a',
  statusAtencao: '#ca8a04',
  statusCritico: '#dc2626',
  statusNormalBg:  '#f0fdf4',
  statusAtencaoBg: '#fefce8',
  statusCriticoBg: '#fef2f2',

  // Gradients / accents
  tealDark: '#0a5555',
  tealGrad: 'linear-gradient(135deg, #0d6e6e 0%, #0f8585 100%)',
  bgCard: '#ffffff',
  shadow: '0 1px 3px rgba(0,0,0,0.08)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.08)',
  shadowLg: '0 8px 32px rgba(0,0,0,0.12)',
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

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; border-radius: 8px; }
  ::-webkit-scrollbar-thumb { background: ${L.line}; border-radius: 8px; transition: background 0.2s; }
  ::-webkit-scrollbar-thumb:hover { background: ${L.t3}; }

  .card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  .btn-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 8px 18px; border-radius: 9px; font-size: 13px; font-weight: 600;
    background: linear-gradient(135deg, #0d6e6e 0%, #0f8585 100%);
    color: #ffffff; cursor: pointer; border: none; font-family: inherit;
    box-shadow: 0 1px 4px rgba(13,110,110,0.25);
    transition: opacity 0.15s, box-shadow 0.15s;
  }
  .btn-primary:hover { opacity: 0.92; box-shadow: 0 4px 12px rgba(13,110,110,0.30); }
  .btn-primary:active { opacity: 0.85; }

  .btn-ghost {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 8px 18px; border-radius: 9px; font-size: 13px; font-weight: 500;
    background: transparent; color: #374151; cursor: pointer;
    border: 1px solid #e5e7eb; font-family: inherit;
    transition: background 0.15s, border-color 0.15s;
  }
  .btn-ghost:hover { background: #f3f4f6; border-color: #d1d5db; }
  .btn-ghost:active { background: #e5e7eb; }

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

  @media print {
    .no-print { display: none !important; }
    .print-only { display: block !important; }
  }
`
