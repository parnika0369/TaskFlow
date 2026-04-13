import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import Navbar from './Navbar'

export default function ProtectedLayout() {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return (
    <div>
      <Navbar />
      <main className="px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
