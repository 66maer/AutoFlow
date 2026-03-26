import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n'

interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ message, onConfirm, onCancel }: Props) {
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus trap + ESC to close
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onCancel])

  // Click outside to cancel
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as HTMLElement)) {
        onCancel()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onCancel])

  return (
    <div className="confirm-backdrop">
      <div className="confirm-dialog" ref={dialogRef}>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="ghost" onClick={onCancel}>{t('common.cancel')}</button>
          <button className="danger" onClick={onConfirm}>{t('common.delete')}</button>
        </div>
      </div>
    </div>
  )
}
