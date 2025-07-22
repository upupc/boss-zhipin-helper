import { useAppConfig } from '#imports'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useSettings } from '@/hooks/use-settings'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import { Check, Key, Loader2, Monitor, Moon, Sun } from 'lucide-react'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface SettingsTabProps {}

// Module level constants
const themeOptions = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon }
] as const

const llmModelOptions = [
  {provider:'anthropic', value: 'claude-sonnet-4-20250514', label: 'Claude 4 Sonnet', baseUrl: 'https://openrouter.ai/api/v1' },
  {provider:'anthropic',  value: 'claude-opus-4-20250514', label: 'Claude 4 Opus', baseUrl: 'https://openrouter.ai/api/v1' },
  {provider:'openai',  value: 'gpt-4o', label: 'GPT-4o', baseUrl: 'https://openrouter.ai/api/v1' },
  {provider:'openai',  value: 'gpt-4-turbo', label: 'GPT-4 Turbo', baseUrl: 'https://openrouter.ai/api/v1' },
  {provider:'google',  value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', baseUrl: 'https://openrouter.ai/api/v1' },
  {provider:'google',  value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', baseUrl: 'https://openrouter.ai/api/v1' },
  {provider:'qwen',  value: 'qwen3-235b-a22b', label: 'qwen3-235b-a22b', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  {provider:'deepseek',  value: 'deepseek-chat-v3-0324', label: 'deepseek-chat-v3-0324', baseUrl: 'https://openrouter.ai/api/v1' },
  {provider:'moonshotai',  value: 'kimi-k2', label: 'kimi-k2', baseUrl: 'https://openrouter.ai/api/v1' },
]

// Module level helper functions
const parseIntervalValue = (value: string): number | null => {
  const interval = parseInt(value)
  return !isNaN(interval) && interval > 0 ? interval : null
}

const handleSaveSettings = async (
  setIsSaving: (value: boolean) => void,
  setSaveSuccess: (value: boolean) => void
) => {
  setIsSaving(true)
  await new Promise(resolve => setTimeout(resolve, 800))
  setIsSaving(false)
  setSaveSuccess(true)
  toast.success('设置已保存', {
    description: '所有更改已成功保存到本地存储。',
    duration: 3000,
  })
  setTimeout(() => setSaveSuccess(false), 2000)
}

export function SettingsTab({}: SettingsTabProps) {
  const config = useAppConfig()
  const { appearance, system, api, updateAppearance, updateSystem, updateAPI, resetSettings } = useSettings()
  const { setTheme } = useTheme({
    theme: appearance.theme,
    onThemeChange: (theme) => updateAppearance({ theme })
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSyncIntervalChange = useCallback((value: string) => {
    const interval = parseIntervalValue(value)
    if (interval !== null) {
      updateSystem({ syncInterval: interval })
    }
  }, [updateSystem])

  const handleSave = useCallback(async () => {
    await handleSaveSettings(setIsSaving, setSaveSuccess)
  }, [])

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        {/* Appearance Settings */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Appearance</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Customize the look and feel
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Theme</Label>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((option) => {
                const Icon = option.icon
                const isActive = appearance.theme === option.value
                return (
                  <Button
                    key={option.value}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme(option.value)}
                    className="flex flex-col gap-1 h-auto py-3"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{option.label}</span>
                  </Button>
                )
              })}
            </div>
          </div>
        </div>

        <Separator />

        {/* System Settings */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">System Settings</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Core extension functionality
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                Notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                Enable push notifications
              </p>
            </div>
            <Switch
              checked={system.notifications}
              onCheckedChange={(checked) => updateSystem({ notifications: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                Sync Interval (minutes)
              </Label>
              <p className="text-xs text-muted-foreground">
                Data synchronization frequency
              </p>
            </div>
            <Input
              type="number"
              value={system.syncInterval}
              onChange={(e) => handleSyncIntervalChange(e.target.value)}
              className="w-20 h-8 text-xs"
              min="1"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div>
              <Label className="text-sm font-medium">
                筛选关键字
              </Label>
              <p className="text-xs text-muted-foreground">
                只有包含这些关键字的候选人会被加入列表（多个关键字用逗号分隔）
              </p>
            </div>
            <Input
              type="text"
              value={system.filterKeywords}
              onChange={(e) => updateSystem({ filterKeywords: e.target.value })}
              placeholder="例如: Java, Spring, 后端"
              className="w-full"
            />
          </div>

          <Separator />

        </div>

        <Separator />

        {/* Runtime Configuration - Read Only */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">
              Runtime Configuration
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Values from app.config.ts (read-only)
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                Config Chat Status
              </Label>
              <p className="text-xs text-muted-foreground">
                Chat setting from runtime config
              </p>
            </div>
            <Badge
              variant={
                config.features?.enableChat ? 'default' : 'secondary'
              }
              className="text-xs"
            >
              {config.features?.enableChat ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                Config Max Tokens
              </Label>
              <p className="text-xs text-muted-foreground">
                Token limit from runtime config
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {config.features?.maxTokens}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* OpenRouter API Settings */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Key className="h-4 w-4" />
              OpenRouter API Settings
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Configure your OpenRouter API credentials
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="api-key" className="text-sm font-medium">
                API Key
              </Label>
              <Input
                id="api-key"
                type="password"
                value={api.openrouterApiKey}
                onChange={(e) => updateAPI({ openrouterApiKey: e.target.value })}
                placeholder="sk-or-..."
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get your API key from{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  openrouter.ai
                </a>
              </p>
            </div>

            <Separator />

            <div>
              <Label htmlFor="base-url" className="text-sm font-medium">
                Base URL
              </Label>
              <Input
                id="base-url"
                type="url"
                value={api.baseUrl}
                onChange={(e) => updateAPI({ baseUrl: e.target.value })}
                placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                OpenRouter API endpoint. Default: https://openrouter.ai/api/v1
              </p>
            </div>

            <Separator />

            <div>
              <Label htmlFor="model" className="text-sm font-medium">
                Model
              </Label>
              <select
                id="model"
                value={api.openrouterModel}
                onChange={(e) => {
                  const selectedModel = llmModelOptions.find(option => option.value === e.target.value)
                  updateAPI({ 
                    openrouterModel: e.target.value,
                    provider: selectedModel?.provider||'',
                    baseUrl: selectedModel?.baseUrl || 'https://openrouter.ai/api/v1'
                  })
                }}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {llmModelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="max-tokens" className="text-sm font-medium">
                  Max Tokens
                </Label>
                <Input
                  id="max-tokens"
                  type="number"
                  value={api.maxTokens}
                  onChange={(e) => updateAPI({ maxTokens: parseInt(e.target.value) || 1024 })}
                  min="100"
                  max="4096"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="temperature" className="text-sm font-medium">
                  Temperature
                </Label>
                <Input
                  id="temperature"
                  type="number"
                  value={api.temperature}
                  onChange={(e) => updateAPI({ temperature: parseFloat(e.target.value) || 0.7 })}
                  min="0"
                  max="1"
                  step="0.1"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={resetSettings}>
            Reset
          </Button>
          <Button 
            className={cn(
              "flex-1 transition-all duration-300",
              saveSuccess && "bg-green-600 hover:bg-green-700"
            )}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                已保存
              </>
            ) : (
              '保存设置'
            )}
          </Button>
        </div>
      </div>
    </ScrollArea>
  )
}