import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { L } from '../constants/theme.js'

/**
 * Componente de upload para Supabase Storage.
 *
 * Props:
 *   bucket      — nome do bucket ('documentos', 'imagens-medicas', 'avatares', 'importacao')
 *   folder      — pasta dentro do bucket (ex: clinica_id)
 *   accept      — tipos aceitos pelo input (ex: "image/*,application/pdf")
 *   label       — texto do botão
 *   currentUrl  — URL atual (para preview)
 *   onUpload    — callback(url, nomeArquivo) chamado após upload bem-sucedido
 *   onError     — callback(mensagem) em caso de erro
 *   compact     — modo compacto (só ícone + clique)
 *   disabled    — desabilitar
 */
export default function UploadArquivo({
  bucket = 'documentos',
  folder = 'geral',
  accept = '*/*',
  label = 'Enviar arquivo',
  currentUrl = '',
  onUpload,
  onError,
  compact = false,
  disabled = false,
}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [preview, setPreview]     = useState(currentUrl)
  const inputRef = useRef()

  const isImage = url => /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(url)

  async function handleFile(file) {
    if (!file) return
    setUploading(true)
    setProgress(10)
    try {
      const ext  = file.name.split('.').pop()
      const uuid = crypto.randomUUID()
      const path = `${folder}/${uuid}.${ext}`

      setProgress(30)
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: false, contentType: file.type })

      if (upErr) throw upErr
      setProgress(80)

      let url
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
      if (pub?.publicUrl && !pub.publicUrl.includes('undefined')) {
        url = pub.publicUrl
      } else {
        const { data: signed, error: signErr } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 60 * 24 * 365) // 1 ano
        if (signErr) throw signErr
        url = signed.signedUrl
      }

      setProgress(100)
      setPreview(url)
      onUpload?.(url, file.name)
    } catch (e) {
      onError?.(e.message || 'Erro ao enviar arquivo.')
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 800)
    }
  }

  function handleChange(e) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  async function handleRemove() {
    setPreview('')
    onUpload?.('', '')
  }

  if (compact) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <input ref={inputRef} type="file" accept={accept} onChange={handleChange}
          style={{ display: 'none' }} disabled={disabled || uploading} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          style={{
            padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 500,
            background: uploading ? L.tealBg : L.hover,
            color: uploading ? L.teal : L.t2,
            border: `1px solid ${uploading ? L.teal + '40' : L.line}`,
            cursor: disabled || uploading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'all 0.15s',
          }}
        >
          {uploading ? `${progress}%` : '📎 ' + label}
        </button>
        {preview && (
          <a href={preview} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, color: L.teal, textDecoration: 'underline' }}>
            {isImage(preview) ? '🖼 Ver' : '📄 Ver'}
          </a>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange}
        style={{ display: 'none' }} disabled={disabled || uploading} />

      {/* Preview de imagem */}
      {preview && isImage(preview) && (
        <div style={{ position: 'relative', width: '100%', maxWidth: 280 }}>
          <img src={preview} alt="preview"
            style={{
              width: '100%', maxHeight: 180, objectFit: 'cover',
              borderRadius: 10, border: `1px solid ${L.line}`,
            }} />
          <button type="button" onClick={handleRemove} style={{
            position: 'absolute', top: 6, right: 6,
            width: 22, height: 22, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)', color: '#fff',
            fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>
      )}

      {/* Preview de documento */}
      {preview && !isImage(preview) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 8,
          background: L.surface, border: `1px solid ${L.line}`,
        }}>
          <span style={{ fontSize: 20 }}>📄</span>
          <a href={preview} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, color: L.teal, flex: 1, textDecoration: 'underline',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Ver arquivo enviado
          </a>
          <button type="button" onClick={handleRemove} style={{
            fontSize: 12, color: L.red, background: 'none', border: 'none', cursor: 'pointer'
          }}>✕</button>
        </div>
      )}

      {/* Barra de progresso */}
      {uploading && (
        <div style={{ height: 3, background: L.line, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', background: L.teal,
            width: `${progress}%`, transition: 'width 0.3s ease',
            borderRadius: 2,
          }} />
        </div>
      )}

      {/* Botão de upload / drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]) }}
        style={{
          padding: '10px 16px', borderRadius: 10, fontSize: 13,
          background: uploading ? L.tealBg : L.surface,
          color: uploading ? L.teal : L.t3,
          border: `1.5px dashed ${uploading ? L.teal : L.line}`,
          cursor: disabled || uploading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.15s',
        }}
      >
        {uploading
          ? `Enviando... ${progress}%`
          : preview
            ? `🔄 Substituir arquivo`
            : `⬆ ${label}`}
      </button>

      <div style={{ fontSize: 10, color: L.t4, textAlign: 'center' }}>
        {bucket === 'avatares'     && 'JPG, PNG ou WEBP · máx 5 MB'}
        {bucket === 'documentos'   && 'PDF, Word, Excel, imagens · máx 50 MB'}
        {bucket === 'imagens-medicas' && 'JPG, PNG, PDF, MP4 · máx 100 MB'}
        {bucket === 'importacao'   && 'CSV ou Excel · máx 20 MB'}
      </div>
    </div>
  )
}
