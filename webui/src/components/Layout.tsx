import { NavLink, Outlet } from 'react-router-dom'
import '../styles/layout.css'

export default function Layout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">AutoFlow</div>
        <nav className="sidebar-nav">
          <NavLink to="/workflows">Workflows</NavLink>
          <NavLink to="/logs">Logs</NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
