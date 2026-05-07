import { useState, useRef, useEffect } from 'react'
import { L } from '../constants/theme.js'

const CID10_LIST = [
  // Respiratory (J)
  { code: 'J00', desc: 'Nasofaringite aguda (resfriado comum)' },
  { code: 'J02.9', desc: 'Faringite aguda não especificada' },
  { code: 'J03.9', desc: 'Amigdalite aguda não especificada' },
  { code: 'J06.9', desc: 'Infecção aguda das vias aéreas superiores não especificada' },
  { code: 'J11.1', desc: 'Influenza com outras manifestações respiratórias' },
  { code: 'J18.9', desc: 'Pneumonia não especificada' },
  { code: 'J20.9', desc: 'Bronquite aguda não especificada' },
  { code: 'J30.1', desc: 'Rinite alérgica devida a pólen' },
  { code: 'J30.4', desc: 'Rinite alérgica não especificada' },
  { code: 'J32.0', desc: 'Sinusite maxilar crônica' },
  { code: 'J32.9', desc: 'Sinusite crônica não especificada' },
  { code: 'J40', desc: 'Bronquite não especificada como aguda ou crônica' },
  { code: 'J42', desc: 'Bronquite crônica não especificada' },
  { code: 'J43.9', desc: 'Enfisema não especificado' },
  { code: 'J44.1', desc: 'DPOC com exacerbação aguda' },
  { code: 'J45.0', desc: 'Asma predominantemente alérgica' },
  { code: 'J45.1', desc: 'Asma não alérgica' },
  { code: 'J45.9', desc: 'Asma não especificada' },

  // Cardiovascular (I)
  { code: 'I10', desc: 'Hipertensão essencial (primária)' },
  { code: 'I11.9', desc: 'Cardiopatia hipertensiva sem insuficiência cardíaca' },
  { code: 'I20.9', desc: 'Angina pectoris não especificada' },
  { code: 'I21.9', desc: 'Infarto agudo do miocárdio não especificado' },
  { code: 'I25.1', desc: 'Doença aterosclerótica do coração' },
  { code: 'I25.9', desc: 'Doença isquêmica crônica do coração não especificada' },
  { code: 'I48', desc: 'Fibrilação e flutter atrial' },
  { code: 'I50.0', desc: 'Insuficiência cardíaca congestiva' },
  { code: 'I63.9', desc: 'Acidente vascular cerebral isquêmico não especificado' },
  { code: 'I64', desc: 'Acidente vascular cerebral não especificado' },
  { code: 'I83.9', desc: 'Varizes dos membros inferiores sem úlcera ou inflamação' },

  // Endocrine (E)
  { code: 'E10.9', desc: 'Diabetes mellitus tipo 1 sem complicações' },
  { code: 'E11.9', desc: 'Diabetes mellitus tipo 2 sem complicações' },
  { code: 'E11.65', desc: 'Diabetes mellitus tipo 2 com hiperglicemia' },
  { code: 'E14.9', desc: 'Diabetes mellitus não especificado sem complicações' },
  { code: 'E03.9', desc: 'Hipotireoidismo não especificado' },
  { code: 'E05.9', desc: 'Tireotoxicose não especificada' },
  { code: 'E66.9', desc: 'Obesidade não especificada' },
  { code: 'E78.5', desc: 'Hiperlipidemia não especificada' },
  { code: 'E78.0', desc: 'Hipercolesterolemia pura' },
  { code: 'E79.0', desc: 'Hiperuricemia sem sinais de artrite e gota' },

  // Mental (F)
  { code: 'F32.9', desc: 'Episódio depressivo não especificado' },
  { code: 'F33.1', desc: 'Transtorno depressivo recorrente, episódio atual moderado' },
  { code: 'F41.0', desc: 'Transtorno de pânico' },
  { code: 'F41.1', desc: 'Ansiedade generalizada' },
  { code: 'F41.2', desc: 'Transtorno misto ansioso e depressivo' },
  { code: 'F43.1', desc: 'Transtorno de estresse pós-traumático' },
  { code: 'F51.0', desc: 'Insônia não orgânica' },
  { code: 'F90.0', desc: 'Perturbação da atividade e da atenção (TDAH)' },

  // Musculoskeletal (M)
  { code: 'M10.9', desc: 'Gota não especificada' },
  { code: 'M15.9', desc: 'Poliartrose não especificada' },
  { code: 'M16.9', desc: 'Coxartrose não especificada' },
  { code: 'M17.1', desc: 'Gonartrose primária unilateral' },
  { code: 'M25.5', desc: 'Dor articular' },
  { code: 'M47.9', desc: 'Espondilose não especificada' },
  { code: 'M48.0', desc: 'Estenose espinal' },
  { code: 'M51.1', desc: 'Degeneração de disco intervertebral lombares' },
  { code: 'M54.4', desc: 'Lumbago com ciática' },
  { code: 'M54.5', desc: 'Dor lombar baixa' },
  { code: 'M75.1', desc: 'Síndrome do manguito rotador' },
  { code: 'M79.3', desc: 'Paniculite' },
  { code: 'M79.7', desc: 'Fibromialgia' },

  // Digestive (K)
  { code: 'K21.0', desc: 'Doença de refluxo gastroesofágico com esofagite' },
  { code: 'K21.9', desc: 'Doença de refluxo gastroesofágico sem esofagite' },
  { code: 'K25.9', desc: 'Úlcera gástrica não especificada' },
  { code: 'K26.9', desc: 'Úlcera duodenal não especificada' },
  { code: 'K29.7', desc: 'Gastrite não especificada' },
  { code: 'K37', desc: 'Apendicite não especificada' },
  { code: 'K57.9', desc: 'Doença diverticular do intestino não especificada' },
  { code: 'K58.9', desc: 'Síndrome do intestino irritável sem diarreia' },
  { code: 'K74.6', desc: 'Cirrose hepática não especificada' },
  { code: 'K80.2', desc: 'Cálculo da vesícula biliar sem colecistite' },

  // Genitourinary (N)
  { code: 'N18.9', desc: 'Doença renal crônica não especificada' },
  { code: 'N20.0', desc: 'Cálculo do rim' },
  { code: 'N39.0', desc: 'Infecção do trato urinário de localização não especificada' },
  { code: 'N40', desc: 'Hiperplasia da próstata' },
  { code: 'N76.0', desc: 'Vaginite aguda' },
  { code: 'N92.1', desc: 'Menstruação irregular com sangramento excessivo' },
  { code: 'N93.9', desc: 'Sangramento vaginal anormal não especificado' },
  { code: 'N95.1', desc: 'Estados da menopausa e do climatério feminino' },

  // Pregnancy (O)
  { code: 'O10.0', desc: 'Hipertensão essencial pré-existente complicando a gravidez' },
  { code: 'O24.4', desc: 'Diabetes mellitus que surge na gravidez' },
  { code: 'O26.6', desc: 'Transtornos do fígado na gravidez' },
  { code: 'O80', desc: 'Parto único espontâneo' },

  // Neurological (G)
  { code: 'G35', desc: 'Esclerose múltipla' },
  { code: 'G40.9', desc: 'Epilepsia não especificada' },
  { code: 'G43.9', desc: 'Enxaqueca não especificada' },
  { code: 'G47.0', desc: 'Distúrbios do início e da manutenção do sono (insônias)' },
  { code: 'G51.0', desc: 'Paralisia de Bell' },
  { code: 'G54.2', desc: 'Afecções das raízes cervicais não classificadas em outra parte' },
  { code: 'G62.9', desc: 'Polineuropatia não especificada' },

  // Skin (L)
  { code: 'L20.9', desc: 'Dermatite atópica não especificada' },
  { code: 'L23.9', desc: 'Dermatite alérgica de contato não especificada' },
  { code: 'L40.0', desc: 'Psoríase vulgaris' },
  { code: 'L50.0', desc: 'Urticária alérgica' },
  { code: 'L60.0', desc: 'Unha encravada' },
  { code: 'L70.0', desc: 'Acne vulgar' },

  // Injury (S/T)
  { code: 'S00.9', desc: 'Traumatismo superficial da cabeça não especificado' },
  { code: 'S09.9', desc: 'Traumatismo da cabeça não especificado' },
  { code: 'S52.5', desc: 'Fratura da extremidade distal do rádio' },
  { code: 'S93.4', desc: 'Entorse do tornozelo' },
  { code: 'T14.0', desc: 'Ferimento superficial de região não especificada do corpo' },
  { code: 'T78.1', desc: 'Outras reações alérgicas devidas a alimentos' },
  { code: 'T78.4', desc: 'Alergia não especificada' },

  // Infectious (A/B)
  { code: 'A09', desc: 'Diarreia e gastroenterite de origem infecciosa presumível' },
  { code: 'A37.9', desc: 'Coqueluche não especificada' },
  { code: 'A90', desc: 'Dengue' },
  { code: 'B00.9', desc: 'Infecção pelo vírus herpes simplex não especificada' },
  { code: 'B02.9', desc: 'Zóster sem complicações' },
  { code: 'B34.9', desc: 'Infecção viral não especificada' },

  // Neoplasms (C/D)
  { code: 'C18.9', desc: 'Tumor maligno do colo do intestino, parte não especificada' },
  { code: 'C34.9', desc: 'Tumor maligno do brônquio ou do pulmão não especificado' },
  { code: 'C50.9', desc: 'Tumor maligno da mama, parte não especificada' },
  { code: 'C61', desc: 'Tumor maligno da próstata' },
  { code: 'D25.9', desc: 'Leiomioma do útero não especificado' },
  { code: 'D64.9', desc: 'Anemia não especificada' },

  // Symptoms (R)
  { code: 'R00.0', desc: 'Taquicardia não especificada' },
  { code: 'R05', desc: 'Tosse' },
  { code: 'R06.0', desc: 'Dispneia' },
  { code: 'R07.4', desc: 'Dor torácica não especificada' },
  { code: 'R10.4', desc: 'Outras dores abdominais e as não especificadas' },
  { code: 'R11', desc: 'Náusea e vômitos' },
  { code: 'R50.9', desc: 'Febre não especificada' },
  { code: 'R51', desc: 'Cefaleia' },
  { code: 'R55', desc: 'Síncope e colapso' },
  { code: 'R73.0', desc: 'Glicemia anormal (teste de tolerância à glicose anormal)' },

  // Eyes (H)
  { code: 'H10.1', desc: 'Conjuntivite atópica aguda' },
  { code: 'H25.9', desc: 'Catarata senil não especificada' },
  { code: 'H40.1', desc: 'Glaucoma primário de ângulo aberto' },
  { code: 'H52.1', desc: 'Miopia' },

  // External causes / factors (Z)
  { code: 'Z00.0', desc: 'Exame médico geral' },
  { code: 'Z00.1', desc: 'Exame de rotina de saúde da criança' },
  { code: 'Z13.6', desc: 'Exame de triagem para doenças cardiovasculares' },
  { code: 'Z30.0', desc: 'Aconselhamento e prescrição de contracepção geral' },
  { code: 'Z71.3', desc: 'Consulta dietética e aconselhamento sobre dieta' },
  { code: 'Z96.6', desc: 'Presença de implantes articulares ortopédicos' },
]

export default function CID10Search({ value = '', onChange, placeholder = 'Buscar CID-10...' }) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState([])
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (!q || q.length < 1) {
      setResults([])
      setOpen(false)
      return
    }
    const filtered = CID10_LIST.filter(
      item =>
        item.code.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q)
    ).slice(0, 30)
    setResults(filtered)
    setOpen(filtered.length > 0)
  }, [query])

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(item) {
    setQuery(item.code)
    setOpen(false)
    if (onChange) onChange(item.code)
  }

  function handleChange(e) {
    setQuery(e.target.value)
    if (onChange) onChange(e.target.value)
  }

  const inp = {
    width: '100%',
    padding: '9px 12px',
    fontSize: 13,
    border: `1.5px solid ${focused ? L.teal : L.line}`,
    borderRadius: 8,
    background: L.bg,
    color: L.t1,
    outline: 'none',
    transition: 'border-color 0.15s',
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={inp}
        autoComplete="off"
        spellCheck={false}
      />
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 20,
          background: L.bg,
          border: `1.5px solid ${L.line}`,
          borderRadius: 10,
          maxHeight: 220,
          overflowY: 'auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          marginTop: 4,
        }}>
          {results.map((item, i) => (
            <div
              key={item.code}
              onMouseDown={() => handleSelect(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: i < results.length - 1 ? `1px solid ${L.lineSoft}` : 'none',
                background: 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = L.hover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                fontWeight: 700,
                color: L.teal,
                flexShrink: 0,
                minWidth: 56,
              }}>{item.code}</span>
              <span style={{
                fontSize: 12,
                color: L.t2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>{item.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
