import { NavLink, Outlet } from 'react-router-dom'
import { useI18n } from '../i18n'
import '../styles/layout.css'

export default function Layout() {
  const { t } = useI18n()

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">AutoFlow</div>
        <nav className="sidebar-nav">
          <NavLink to="/workflows">{t('nav.workflows')}</NavLink>
          <NavLink to="/logs">{t('nav.logs')}</NavLink>
          <NavLink to="/settings">{t('nav.settings')}</NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
