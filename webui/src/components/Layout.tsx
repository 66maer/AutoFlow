import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { useI18n } from '../i18n'
import useTheme from '../hooks/useTheme'
import Logs from '../pages/Logs'
import Settings from '../pages/Settings'
import '../styles/layout.css'

type OverlayPanel = 'logs' | 'settings' | null

export default function Layout() {
  const { t } = useI18n()
  const { theme, toggle } = useTheme()
  const [activePanel, setActivePanel] = useState<OverlayPanel>(null)
  const [closing, setClosing] = useState(false)

  const openPanel = useCallback((panel: OverlayPanel) => {
    setClosing(false)
    setActivePanel(panel)
  }, [])

  const closePanel = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      setActivePanel(null)
      setClosing(false)
    }, 300)
  }, [])

  return (
    <div className="app-layout">
      <main className="main-content">
        <Outlet />
      </main>

      {/* Corner action buttons */}
      <div className="corner-buttons">
        {/* Theme toggle */}
        <button
          className="corner-btn corner-btn--theme"
          onClick={toggle}
          title={theme === 'light' ? 'Dark mode' : 'Light mode'}
        >
          {theme === 'light' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>

        <button
          className={`corner-btn corner-btn--logs ${activePanel === 'logs' ? 'active' : ''}`}
          onClick={() => activePanel === 'logs' ? closePanel() : openPanel('logs')}
          title={t('nav.logs')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </button>
        <button
          className={`corner-btn corner-btn--settings ${activePanel === 'settings' ? 'active' : ''}`}
          onClick={() => activePanel === 'settings' ? closePanel() : openPanel('settings')}
          title={t('nav.settings')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Overlay panel */}
      {activePanel && (
        <div className={`overlay-backdrop ${closing ? 'closing' : ''}`} onClick={closePanel}>
          <div
            className={`overlay-panel ${closing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overlay-header">
              <h2>{activePanel === 'logs' ? t('nav.logs') : t('nav.settings')}</h2>
              <button className="overlay-close" onClick={closePanel}>×</button>
            </div>
            <div className="overlay-body">
              {activePanel === 'logs' && <Logs />}
              {activePanel === 'settings' && <Settings />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
