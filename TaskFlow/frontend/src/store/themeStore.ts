import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  dark: boolean
  toggle: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      dark: false,
      toggle: () => {
        const next = !get().dark
        document.documentElement.classList.toggle('dark', next)
        set({ dark: next })
      },
    }),
    { name: 'taskflow-theme' }
  )
)

// Apply on load
export function initTheme() {
  const stored = localStorage.getItem('taskflow-theme')
  if (stored) {
    const { state } = JSON.parse(stored)
    document.documentElement.classList.toggle('dark', !!state?.dark)
  }
}
