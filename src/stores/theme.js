import { defineStore } from 'pinia'
import { Dark } from 'quasar'

function preferredTheme() {
  try {
    const saved = localStorage.getItem('lab-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch (error) {
    console.warn('No fue posible leer la preferencia de tema.', error)
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = defineStore('theme', {
  state: () => ({ mode: 'light' }),
  getters: { isDark: (state) => state.mode === 'dark' },
  actions: {
    initialize() {
      this.mode = preferredTheme()
      this.apply()
    },
    toggle() {
      this.mode = this.isDark ? 'light' : 'dark'
      this.apply()
      try {
        localStorage.setItem('lab-theme', this.mode)
      } catch (error) {
        console.warn('No fue posible guardar la preferencia de tema.', error)
      }
    },
    apply() {
      document.documentElement.dataset.theme = this.mode
      const styles = getComputedStyle(document.documentElement)
      for (const token of ['primary', 'secondary', 'accent', 'positive', 'negative', 'warning', 'info']) {
        const key = { positive: 'success-fg', negative: 'danger-fg', warning: 'warning-fg', info: 'info-fg', accent: 'accent-fg' }[token] || token
        document.documentElement.style.setProperty(`--q-${token}`, styles.getPropertyValue(`--${key}`).trim())
      }
      Dark.set(this.isDark)
    },
  },
})
