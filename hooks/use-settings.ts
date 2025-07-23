import { storage } from '#imports'
import { useEffect, useState } from 'react'

type Theme = 'system' | 'light' | 'dark'

interface AppearanceSettings {
  theme: Theme
}

interface SystemSettings {
  notifications: boolean
  syncInterval: number
  filterKeywords: string
}

interface UISettings {
  activeTab: string
}

export interface APISettings {
  openrouterApiKey: string
  openrouterModel: string
  provider: string
  baseUrl: string
  maxTokens: number
  temperature: number
}

const defaultApiSettings:APISettings = {
  openrouterApiKey: '',
  openrouterModel: 'qwen3-235b-a22b',
  provider:'qwen',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  maxTokens: 1024,
  temperature: 0.7
}
// Define storage items
const appearanceSettings = storage.defineItem<AppearanceSettings>('local:appearanceSettings', {
  fallback: {
    theme: 'system'
  }
})

const systemSettings = storage.defineItem<SystemSettings>('local:systemSettings', {
  fallback: {
    notifications: true,
    syncInterval: 15,
    filterKeywords: 'Java'
  }
})

const uiSettings = storage.defineItem<UISettings>('local:uiSettings', {
  fallback: {
    activeTab: 'home'
  }
})

const apiSettings = storage.defineItem<APISettings>('local:apiSettings', {
  fallback: defaultApiSettings
})

export function useSettings() {
  const [appearance, setAppearance] = useState<AppearanceSettings>({ theme: 'system' })
  const [system, setSystem] = useState<SystemSettings>({ notifications: true, syncInterval: 15, filterKeywords: 'Java' })
  const [ui, setUI] = useState<UISettings>({ activeTab: 'home' })
  const [api, setAPI] = useState<APISettings>(defaultApiSettings)
  const [loading, setLoading] = useState(true)

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [appearanceData, systemData, uiData, apiData] = await Promise.all([
          appearanceSettings.getValue(),
          systemSettings.getValue(),
          uiSettings.getValue(),
          apiSettings.getValue()
        ])
        
        setAppearance(appearanceData)
        setSystem(systemData)
        setUI(uiData)
        setAPI(apiData)
      } catch (error) {
        console.error('Failed to load settings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Update appearance settings
  const updateAppearance = async (updates: Partial<AppearanceSettings>) => {
    const newSettings = { ...appearance, ...updates }
    setAppearance(newSettings)
    try {
      await appearanceSettings.setValue(newSettings)
    } catch (error) {
      console.error('Failed to save appearance settings:', error)
    }
  }

  // Update system settings
  const updateSystem = async (updates: Partial<SystemSettings>) => {
    const newSettings = { ...system, ...updates }
    setSystem(newSettings)
    try {
      await systemSettings.setValue(newSettings)
    } catch (error) {
      console.error('Failed to save system settings:', error)
    }
  }

  // Update UI settings
  const updateUI = async (updates: Partial<UISettings>) => {
    const newSettings = { ...ui, ...updates }
    setUI(newSettings)
    try {
      await uiSettings.setValue(newSettings)
    } catch (error) {
      console.error('Failed to save UI settings:', error)
    }
  }

  // Update API settings
  const updateAPI = async (updates: Partial<APISettings>) => {
    const newSettings = { ...api, ...updates }
    setAPI(newSettings)
    try {
      await apiSettings.setValue(newSettings)
    } catch (error) {
      console.error('Failed to save API settings:', error)
    }
  }

  // Reset all settings
  const resetSettings = async () => {
    try {
      await Promise.all([
        appearanceSettings.removeValue(),
        systemSettings.removeValue(),
        uiSettings.removeValue(),
        apiSettings.removeValue()
      ])
      
      // Reset to default values
      const defaultAppearance = { theme: 'system' as Theme }
      const defaultSystem = { notifications: true, syncInterval: 15, filterKeywords: 'Java' }
      const defaultUI = { activeTab: 'home' }
      const defaultAPI = defaultApiSettings
      
      setAppearance(defaultAppearance)
      setSystem(defaultSystem)
      setUI(defaultUI)
      setAPI(defaultAPI)
    } catch (error) {
      console.error('Failed to reset settings:', error)
    }
  }

  return {
    appearance,
    system,
    ui,
    api,
    loading,
    updateAppearance,
    updateSystem,
    updateUI,
    updateAPI,
    resetSettings
  }
} 
