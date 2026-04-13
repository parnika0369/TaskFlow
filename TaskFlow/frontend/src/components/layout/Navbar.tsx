import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const { dark, toggle } = useThemeStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="border-b px-6 py-3 flex items-center justify-between">
      <Link to="/projects" className="font-semibold">TaskFlow</Link>
      <div className="flex items-center gap-4 text-sm">
        <span>{user?.name}</span>
        <button onClick={toggle}>{dark ? '☀' : '☾'}</button>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}
