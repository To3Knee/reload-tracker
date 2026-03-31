import { create } from 'zustand'
import { getAllPurchases, getAllRecipes } from './db'
import { getBatches } from './batches'
import { getRangeLogs } from './range'
import { fetchSettings } from './settings'
import { getCurrentUser } from './auth'

export const useAppStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────
  purchases:   [],
  recipes:     [],
  batches:     [],
  rangeLogs:   [],
  currentUser: null,
  aiEnabled:   false,
  loading:     false,
  error:       null,

  // ── Actions ────────────────────────────────────────────────

  /** Full refresh — call this after any write operation or on pull-to-refresh */
  refresh: async (signal) => {
    set({ loading: true, error: null })
    try {
      const [purchases, recipes, batches, rangeLogs] = await Promise.all([
        getAllPurchases(signal),
        getAllRecipes(signal),
        getBatches(signal),
        getRangeLogs(signal),
      ])
      set({ purchases, recipes, batches, rangeLogs })

      const user = await getCurrentUser()
      if (user) set({ currentUser: user })

      const settings = await fetchSettings(signal)
      const aiEnabled = settings.ai_enabled === 'true' && (settings.hasAiKey || settings.ai_api_key)
      set({ aiEnabled })
    } catch (e) {
      if (e?.name !== 'AbortError') set({ error: e?.message || 'Data refresh failed.' })
    } finally {
      set({ loading: false })
    }
  },

  /** Lightweight refresh — just purchases + recipes (for Dashboard/Inventory) */
  refreshPurchases: async (signal) => {
    try {
      const [purchases, recipes] = await Promise.all([
        getAllPurchases(signal),
        getAllRecipes(signal),
      ])
      set({ purchases, recipes })
    } catch (e) {
      if (e?.name !== 'AbortError') console.error('Purchase refresh failed:', e)
    }
  },

  /** Optimistic helpers — update local state immediately after writes */
  setCurrentUser: (user) => set({ currentUser: user }),
  clearCurrentUser: () => set({ currentUser: null }),
}))
