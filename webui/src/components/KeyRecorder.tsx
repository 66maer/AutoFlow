import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'

/** Modifier keys */
const MODIFIERS = ['ctrl', 'shift', 'alt', 'meta'] as const
type Modifier = (typeof MODIFIERS)[number]

const MODIFIER_LABELS: Record<Modifier, string> = {
  ctrl: 'Ctrl',
  shift: 'Shift',
  alt: 'Alt',
  meta: 'Win',
}

/** All selectable main keys, grouped */
const KEY_GROUPS: { label: string; keys: { value: string; label: string }[] }[] = [
  {
    label: 'letters',
    keys: 'abcdefghijklmnopqrstuvwxyz'.split('').map((k) => ({ value: k, label: k.toUpperCase() })),
  },
  {
    label: 'numbers',
    keys: '0123456789'.split('').map((k) => ({ value: k, label: k })),
  },
  {
    label: 'F-keys',
    keys: Array.from({ length: 12 }, (_, i) => ({ value: `f${i + 1}`, label: `F${i + 1}` })),
  },
  {
    label: 'special',
    keys: [
      { value: 'enter', label: 'Enter' },
      { value: 'tab', label: 'Tab' },
      { value: 'escape', label: 'Esc' },
      { value: 'space', label: 'Space' },
      { value: 'backspace', label: 'Backspace' },
      { value: 'delete', label: 'Delete' },
      { value: 'insert', label: 'Insert' },
      { value: 'home', label: 'Home' },
      { value: 'end', label: 'End' },
      { value: 'pageup', label: 'PageUp' },
      { value: 'pagedown', label: 'PageDown' },
      { value: 'arrowup', label: 'Up' },
      { value: 'arrowdown', label: 'Down' },
      { value: 'arrowleft', label: 'Left' },
      { value: 'arrowright', label: 'Right' },
      { value: 'printscreen', label: 'PrtSc' },
      { value: 'pause', label: 'Pause' },
      { value: 'capslock', label: 'CapsLock' },
      { value: 'numlock', label: 'NumLock' },
      { value: 'scrolllock', label: 'ScrollLock' },
    ],
  },
  {
    label: 'symbols',
    keys: [
      { value: '`', label: '`' },
      { value: '-', label: '-' },
      { value: '=', label: '=' },
      { value: '[', label: '[' },
      { value: ']', label: ']' },
      { value: '\\', label: '\\' },
      { value: ';', label: ';' },
      { value: "'", label: "'" },
      { value: ',', label: ',' },
      { value: '.', label: '.' },
      { value: '/', label: '/' },
    ],
  },
]

/** Parse "ctrl+shift+a" → { modifiers, key } */
export function parseKeys(keys: string): { modifiers: Modifier[]; key: string } {
  if (!keys) return { modifiers: [], key: '' }
  const parts = keys.split('+')
  const mods = parts.filter((p) => MODIFIERS.includes(p as Modifier)) as Modifier[]
  const main = parts.find((p) => !MODIFIERS.includes(p as Modifier)) || ''
  return { modifiers: mods, key: main }
}

/** Build "ctrl+shift+a" from parts */
function buildKeys(modifiers: Modifier[], key: string): string {
  return [...modifiers, ...(key ? [key] : [])].join('+')
}

/** Format single key for display */
function formatKeyLabel(k: string): string {
  switch (k) {
    case 'ctrl': return 'Ctrl'
    case 'shift': return 'Shift'
    case 'alt': return 'Alt'
    case 'meta': return 'Win'
    default: {
      // Look up in KEY_GROUPS
      for (const g of KEY_GROUPS) {
        const found = g.keys.find((kk) => kk.value === k)
        if (found) return found.label
      }
      return k.length === 1 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1)
    }
  }
}

/** Map browser KeyboardEvent to our key name */
function normalizeKey(e: KeyboardEvent): string {
  if (e.key === 'Control') return 'ctrl'
  if (e.key === 'Shift') return 'shift'
  if (e.key === 'Alt') return 'alt'
  if (e.key === 'Meta') return 'meta'
  if (e.key === ' ') return 'space'
  if (e.key.length === 1) return e.key.toLowerCase()
  return e.key.toLowerCase()
}

interface Props {
  value: string // "ctrl+a" format
  onChange: (keys: string) => void
}

export default function KeyRecorder({ value, onChange }: Props) {
  const { t } = useI18n()
  const [recording, setRecording] = useState(false)
  const [liveKeys, setLiveKeys] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const { modifiers, key: mainKey } = parseKeys(value)

  // --- Modifier toggle ---
  const toggleModifier = useCallback(
    (mod: Modifier) => {
      const newMods = modifiers.includes(mod)
        ? modifiers.filter((m) => m !== mod)
        : [...modifiers, mod]
      onChange(buildKeys(newMods, mainKey))
    },
    [modifiers, mainKey, onChange],
  )

  // --- Main key select ---
  const setMainKey = useCallback(
    (key: string) => {
      onChange(buildKeys(modifiers, key))
    },
    [modifiers, onChange],
  )

  // --- Recording ---
  const startRecording = useCallback(() => {
    setRecording(true)
    setLiveKeys('')
  }, [])

  const stopRecording = useCallback(() => {
    setRecording(false)
    if (liveKeys) {
      onChange(liveKeys)
    }
    setLiveKeys('')
  }, [liveKeys, onChange])

  useEffect(() => {
    if (!recording) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const key = normalizeKey(e)
      const mods: Modifier[] = []
      if (e.ctrlKey && key !== 'ctrl') mods.push('ctrl')
      if (e.shiftKey && key !== 'shift') mods.push('shift')
      if (e.altKey && key !== 'alt') mods.push('alt')
      if (e.metaKey && key !== 'meta') mods.push('meta')

      if (MODIFIERS.includes(key as Modifier)) {
        // Only modifier so far — live preview
        const allMods = [...mods, key as Modifier].filter((v, i, a) => a.indexOf(v) === i)
        setLiveKeys(buildKeys(allMods, ''))
      } else {
        // Main key pressed — finalize
        const combo = buildKeys(mods, key)
        setLiveKeys(combo)
        onChange(combo)
        setRecording(false)
        setLiveKeys('')
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('keyup', handleKeyUp, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('keyup', handleKeyUp, true)
    }
  }, [recording, liveKeys, onChange])

  // Click outside to stop recording
  useEffect(() => {
    if (!recording) return
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        stopRecording()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [recording, stopRecording])

  return (
    <div className="key-recorder" ref={containerRef}>
      {/* Display area + record button */}
      <div className="key-recorder-top">
        <div className={`key-display ${recording ? 'recording' : ''}`} onClick={startRecording}>
          {recording ? (
            liveKeys ? (
              <span className="key-badges">
                {liveKeys.split('+').filter(Boolean).map((k, i) => (
                  <span key={i} className="key-badge">{formatKeyLabel(k)}</span>
                ))}
              </span>
            ) : (
              <span className="key-hint">{t('config.keyRecorder.hint')}</span>
            )
          ) : value ? (
            <span className="key-badges">
              {value.split('+').filter(Boolean).map((k, i) => (
                <span key={i} className="key-badge">{formatKeyLabel(k)}</span>
              ))}
            </span>
          ) : (
            <span className="key-hint">{t('config.keyRecorder.placeholder')}</span>
          )}
        </div>
        <button
          type="button"
          className={`key-record-btn ${recording ? 'active' : ''}`}
          onClick={recording ? stopRecording : startRecording}
        >
          {recording ? '⏹' : '⏺'}
        </button>
        {value && !recording && (
          <button
            type="button"
            className="key-clear-btn ghost"
            onClick={() => onChange('')}
          >
            ×
          </button>
        )}
      </div>

      {/* Manual selection: modifier checkboxes */}
      {!recording && (
        <div className="key-manual-select">
          <div className="key-modifiers">
            {MODIFIERS.map((mod) => (
              <label key={mod} className="key-mod-label">
                <input
                  type="checkbox"
                  checked={modifiers.includes(mod)}
                  onChange={() => toggleModifier(mod)}
                />
                {MODIFIER_LABELS[mod]}
              </label>
            ))}
          </div>

          {/* Main key dropdown */}
          <select
            className="key-main-select"
            value={mainKey}
            onChange={(e) => setMainKey(e.target.value)}
          >
            <option value="">{t('config.keyRecorder.selectKey')}</option>
            {KEY_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.keys.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
