import { useI18n } from '../i18n'
import type { Locale } from '../i18n'
import '../styles/settings.css'

interface SettingItem {
  titleKey: string
  descKey: string
  type: 'language' | 'placeholder'
}

const SETTINGS: SettingItem[] = [
  { titleKey: 'settings.language', descKey: 'settings.language.desc', type: 'language' },
  { titleKey: 'settings.imageEngine', descKey: 'settings.imageEngine.desc', type: 'placeholder' },
  { titleKey: 'settings.inputMethod', descKey: 'settings.inputMethod.desc', type: 'placeholder' },
  { titleKey: 'settings.hotkeys', descKey: 'settings.hotkeys.desc', type: 'placeholder' },
  { titleKey: 'settings.autoStart', descKey: 'settings.autoStart.desc', type: 'placeholder' },
  { titleKey: 'settings.autoUpdate', descKey: 'settings.autoUpdate.desc', type: 'placeholder' },
  { titleKey: 'settings.tray', descKey: 'settings.tray.desc', type: 'placeholder' },
]

export default function Settings() {
  const { t, locale, setLocale } = useI18n()

  return (
    <div className="settings-panel">
      <div className="settings-list">
        {SETTINGS.map((item) => (
          <div key={item.titleKey} className="settings-item">
            <div className="settings-info">
              <div className="settings-title">{t(item.titleKey as any)}</div>
              <div className="settings-desc">{t(item.descKey as any)}</div>
            </div>
            <div className="settings-control">
              {item.type === 'language' ? (
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as Locale)}
                >
                  <option value="zh-CN">中文</option>
                  <option value="en-US">English</option>
                </select>
              ) : (
                <span className="settings-placeholder">{t('common.comingSoon')}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
