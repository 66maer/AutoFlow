import { useCallback, useRef, useState } from 'react'
import { templates } from '../api/client'
import { useI18n } from '../i18n'

interface Props {
  templateId: string | undefined
  onChange: (templateId: string) => void
}

export default function TemplatePicker({ templateId, onChange }: Props) {
  const { t } = useI18n()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const upload = useCallback(async (file: File | Blob, filename?: string) => {
    setUploading(true)
    try {
      const res = await templates.upload(file, filename)
      onChange(res.id)
    } finally {
      setUploading(false)
    }
  }, [onChange])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (blob) upload(blob, 'paste.png')
        return
      }
    }
  }, [upload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer?.files?.[0]
    if (file && file.type.startsWith('image/')) {
      upload(file, file.name)
    }
  }, [upload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleFileSelect = useCallback(() => {
    fileRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      upload(file, file.name)
      e.target.value = ''
    }
  }, [upload])

  const previewUrl = templateId ? templates.previewUrl(templateId) : ''

  return (
    <div className="template-picker">
      <div
        ref={dropRef}
        className={`template-drop-zone ${templateId ? 'has-image' : ''}`}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        tabIndex={0}
      >
        {uploading ? (
          <span className="template-hint">{t('template.uploading')}</span>
        ) : templateId ? (
          <img
            src={previewUrl}
            alt=""
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <span className="template-hint">{t('template.pasteHint')}</span>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        className="ghost template-select-btn"
        onClick={handleFileSelect}
        type="button"
      >
        {templateId ? t('template.replace') : t('template.selectFile')}
      </button>
    </div>
  )
}
