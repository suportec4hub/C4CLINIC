export const L = {
  bg:       'var(--c-bg)',
  bgWarm:   'var(--c-bg)',
  white:    '#ffffff',
  surface:  'var(--c-surface)',
  hover:    'var(--c-hover)',
  line:     'var(--c-line)',
  lineSoft: 'var(--c-line-soft)',

  // Primary — teal médico
  teal:     '#0d6e6e',
  tealMd:   '#0f8585',
  tealLt:   '#12a0a0',
  tealBg:   'var(--c-teal-bg)',
  tealDark: '#0a5555',
  tealGrad: 'linear-gradient(135deg, #0d6e6e 0%, #0f8585 100%)',

  // Secondary — copper
  copper:   '#6b7280',
  copperBg: 'var(--c-surface)',

  // Text hierarchy
  t1: 'var(--c-t1)',
  t2: 'var(--c-t2)',
  t3: 'var(--c-t3)',
  t4: 'var(--c-t4)',
  t5: 'var(--c-t5)',

  // Status
  green:    '#16a34a',
  greenBg:  'var(--c-green-bg)',
  greenBd:  'var(--c-green-bd)',

  red:      '#dc2626',
  redBg:    'var(--c-red-bg)',
  redBd:    'var(--c-red-bd)',

  yellow:   '#ca8a04',
  yellowBg: 'var(--c-yellow-bg)',
  yellowBd: 'var(--c-yellow-bd)',

  blue:     '#2563eb',
  blueBg:   'var(--c-blue-bg)',
  blueBd:   'var(--c-blue-bd)',

  purple:   '#7c3aed',
  purpleBg: 'var(--c-purple-bg)',
  purpleBd: 'var(--c-purple-bd)',

  orange:   '#ea580c',
  orangeBg: 'var(--c-orange-bg)',
  orangeBd: 'var(--c-orange-bd)',

  // Medical status colors
  statusNormal:     '#16a34a',
  statusAtencao:    '#ca8a04',
  statusCritico:    '#dc2626',
  statusNormalBg:   'var(--c-green-bg)',
  statusAtencaoBg:  'var(--c-yellow-bg)',
  statusCriticoBg:  'var(--c-red-bg)',

  // Gradients / accents
  bgCard:   'var(--c-bg)',
  shadow:   '0 1px 3px rgba(0,0,0,0.08)',
  shadowMd: '0 4px 16px rgba(0,0,0,0.08)',
  shadowLg: '0 8px 32px rgba(0,0,0,0.12)',
}

export const globalCSS = `
  :root {
    --c-bg: #ffffff;
    --c-surface: #f9fafb;
    --c-hover: #f3f4f6;
    --c-line: #e5e7eb;
    --c-line-soft: #f3f4f6;
    --c-t1: #111827;
    --c-t2: #374151;
    --c-t3: #6b7280;
    --c-t4: #9ca3af;
    --c-t5: #d1d5db;
    --c-teal-bg: #f0fafa;
    --c-green-bg: #f0fdf4;
    --c-green-bd: #bbf7d0;
    --c-red-bg: #fef2f2;
    --c-red-bd: #fecaca;
    --c-yellow-bg: #fefce8;
    --c-yellow-bd: #fde68a;
    --c-blue-bg: #eff6ff;
    --c-blue-bd: #bfdbfe;
    --c-purple-bg: #f5f3ff;
    --c-purple-bd: #ddd6fe;
    --c-orange-bg: #fff7ed;
    --c-orange-bd: #fed7aa;
  }
  :root.dark {
    --c-bg: #0f1117;
    --c-surface: #161b22;
    --c-hover: #21262d;
    --c-line: #30363d;
    --c-line-soft: #21262d;
    --c-t1: #f0f6fc;
    --c-t2: #c9d1d9;
    --c-t3: #8b949e;
    --c-t4: #6e7681;
    --c-t5: #3d444d;
    --c-teal-bg: #0d2424;
    --c-green-bg: #0b2818;
    --c-green-bd: #166534;
    --c-red-bg: #2d0f0f;
    --c-red-bd: #7f1d1d;
    --c-yellow-bg: #2d1f00;
    --c-yellow-bd: #854d0e;
    --c-blue-bg: #0f1d3d;
    --c-blue-bd: #1e3a8a;
    --c-purple-bg: #1e1030;
    --c-purple-bd: #4c1d95;
    --c-orange-bg: #2d1500;
    --c-orange-bd: #9a3412;
  }

  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --teal: #0d6e6e;
    --teal-bg: var(--c-teal-bg);
    --line: var(--c-line);
    --surface: var(--c-surface);
  }

  html, body { height: 100%; }

  body {
    font-family: 'Instrument Sans', system-ui, sans-serif;
    background: var(--c-bg);
    color: var(--c-t1);
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  #root { height: 100%; }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; border-radius: 8px; }
  ::-webkit-scrollbar-thumb { background: var(--c-line); border-radius: 8px; transition: background 0.2s; }
  ::-webkit-scrollbar-thumb:hover { background: var(--c-t3); }

  .card {
    background: var(--c-bg);
    border: 1px solid var(--c-line);
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
    background: transparent; color: var(--c-t2); cursor: pointer;
    border: 1px solid var(--c-line); font-family: inherit;
    transition: background 0.15s, border-color 0.15s;
  }
  .btn-ghost:hover { background: var(--c-hover); border-color: var(--c-t5); }
  .btn-ghost:active { background: var(--c-line); }

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
