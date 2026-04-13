import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login, register } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (mode === 'register' && !name.trim()) errs.name = 'Name is required'
    if (!email.trim()) {
      errs.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'Enter a valid email address'
    }
    if (!password) {
      errs.password = 'Password is required'
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const mutation = useMutation({
    mutationFn: () =>
      mode === 'login'
        ? login({ email, password })
        : register({ name, email, password }),
    onSuccess: (data) => {
      setAuth(data.token, data.user)
      navigate('/projects')
    },
    onError: (err: any) => {
      const data = err.response?.data
      if (data?.fields) setErrors(data.fields)
      else setErrors({ general: data?.error || 'Something went wrong' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    if (!validate()) return
    mutation.mutate()
  }

  return (
    <div className="p-8 max-w-sm mx-auto mt-16">
      <h1 className="text-xl font-bold mb-1">TaskFlow</h1>
      <h2 className="text-lg font-semibold mb-6">
        {mode === 'login' ? 'Sign in' : 'Create account'}
      </h2>

      {errors.general && (
        <div className="mb-4 p-3 border border-red-400 text-red-600 text-sm">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === 'register' && (
          <Input
            id="name"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            placeholder="Jane Doe"
          />
        )}
        <Input
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="jane@example.com"
        />
        <Input
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          placeholder="••••••••"
        />
        <Button type="submit" loading={mutation.isPending} className="w-full mt-1">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <p className="text-sm text-center mt-5">
        {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErrors({}) }}
          className="underline font-medium"
        >
          {mode === 'login' ? 'Register' : 'Sign in'}
        </button>
      </p>
    </div>
  )
}
