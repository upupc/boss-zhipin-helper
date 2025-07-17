import { useAppConfig } from '#imports'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSettings } from '@/hooks/use-settings'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import { OpenRouterMessage, sendMessageToOpenRouter, OpenRouterAPIError } from '@/lib/openrouter-api'
import {
  Heart,
  House,
  Key,
  MessageSquare,
  Monitor,
  Moon,
  Send,
  Settings,
  Sun,
  AlertCircle,
  Filter,
  Users
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'bot'
  timestamp: Date
}


function App() {
  const config = useAppConfig()
  const { appearance, system, ui, api, loading, updateAppearance, updateSystem, updateUI, updateAPI, resetSettings } = useSettings()
  const { setTheme } = useTheme({
    theme: appearance.theme,
    onThemeChange: (theme) => updateAppearance({ theme })
  })

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Filter state
  const [filteredGeeks, setFilteredGeeks] = useState<{ name: string; content: string; isJava: boolean; hasButton: boolean; buttonIndex: number }[]>([])
  const [isFiltering, setIsFiltering] = useState(false)

  const themeOptions = [
    { value: 'system', label: 'System', icon: Monitor },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon }
  ] as const

  const handleSyncIntervalChange = (value: string) => {
    const interval = parseInt(value)
    if (!isNaN(interval) && interval > 0) {
      updateSystem({ syncInterval: interval })
    }
  }

  const handleTabChange = (value: string) => {
    updateUI({ activeTab: value })
  }
  
  // Filter geeks from BOSS page
  const handleFilterGeeks = async () => {
    setIsFiltering(true)
    setFilteredGeeks([])
    
    try {
      // Send message to content script
      const tabs = await browser.tabs.query({ url: '*://*.zhipin.com/*' })
      if (tabs.length === 0) {
        alert('请先打开BOSS直聘页面')
        setIsFiltering(false)
        return
      }
      
      const response = await browser.tabs.sendMessage(tabs[0].id!, { action: 'filterGeeks' })
      if (response && response.geeks) {
        setFilteredGeeks(response.geeks)
      }
    } catch (error) {
      console.error('Error filtering geeks:', error)
      alert('筛选失败，请确保在BOSS直聘页面')
    } finally {
      setIsFiltering(false)
    }
  }

  // Chat functions
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || isTyping) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)

    // Call OpenRouter API
    try {
      if (!api.openrouterApiKey) {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: 'Please configure your OpenRouter API key in the Settings tab to start chatting.',
          sender: 'bot',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
        setIsTyping(false)
        return
      }

      // Convert our messages to OpenRouter format
      const openrouterMessages: OpenRouterMessage[] = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
      
      // Add the new user message
      openrouterMessages.push({
        role: 'user',
        content: userMessage.content
      })

      const response = await sendMessageToOpenRouter(openrouterMessages, {
        apiKey: api.openrouterApiKey,
        baseUrl: api.baseUrl,
        model: api.openrouterModel,
        maxTokens: api.maxTokens,
        temperature: api.temperature
      })

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'bot',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      let errorContent = 'Sorry, I encountered an error while processing your message.'
      
      if (error instanceof OpenRouterAPIError) {
        if (error.status === 401) {
          errorContent = 'Invalid API key. Please check your OpenRouter API key in Settings.'
        } else if (error.status === 429) {
          errorContent = 'Rate limit exceeded. Please try again later.'
        } else {
          errorContent = `Error: ${error.message}`
        }
      }
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: errorContent,
        sender: 'bot',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
      // Focus back on input
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Heart className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">BOSS直聘小助手</h1>
            <p className="text-sm text-muted-foreground">
              WXT + Tailwind CSS 4.0 + shadcn/ui
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={ui.activeTab} onValueChange={handleTabChange} className="h-full flex flex-col gap-0">
          <TabsList className="h-auto rounded-none border-b bg-transparent p-0 w-full">
            <TabsTrigger
              value="home"
              className="data-[state=active]:after:bg-primary relative rounded-none py-2 px-4 flex items-center gap-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-1"
            >
              <House className="h-4 w-4" />
              Home
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="data-[state=active]:after:bg-primary relative rounded-none py-2 px-4 flex items-center gap-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-1"
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:after:bg-primary relative rounded-none py-2 px-4 flex items-center gap-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-1"
            >
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2 mb-2">
                    Welcome to BOSS直聘小助手
                    <Badge variant="secondary">v1.0.0</Badge>
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    帮助你一键完成打招呼.
                  </p>
                  <div className="flex flex-col gap-4 items-center">
                    <Button
                      size="lg"
                      onClick={() => window.open('https://www.zhipin.com/web/chat/recommend', '_blank')}
                      className="px-8 py-3"
                    >
                      打开BOSS直聘
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={handleFilterGeeks}
                      disabled={isFiltering}
                      className="px-6 py-2 flex items-center gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      {isFiltering ? '筛选并自动打招呼中...' : '筛选候选人'}
                    </Button>
                    
                    {isFiltering && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        正在筛选候选人并自动向Java开发者打招呼，请耐心等待...
                      </p>
                    )}
                  </div>
                  
                  {/* Filtered Results */}
                  {filteredGeeks.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4" />
                        筛选结果 ({filteredGeeks.length})
                      </h3>
                      {filteredGeeks.some(g => g.isJava && g.hasButton) && (
                        <div className="mb-3 p-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md">
                          <p className="text-sm text-orange-700 dark:text-orange-300">
                            ✅ 已自动向 {filteredGeeks.filter(g => g.isJava && g.hasButton).length} 位Java候选人打招呼
                          </p>
                        </div>
                      )}
                      <div className="space-y-3">
                        {filteredGeeks.map((geek, index) => (
                          <div key={index} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{geek.name}</h4>
                              <div className="flex items-center gap-2">
                                {geek.isJava && (
                                  <Badge className="text-xs bg-orange-500 text-white">Java</Badge>
                                )}
                                {geek.hasButton && (
                                  <Badge variant="outline" className="text-xs">
                                    可打招呼
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{geek.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Chat Header */}
              <div className="border-b px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Chat Assistant</h2>
                    <p className="text-xs text-muted-foreground">
                      Ask me anything about your extension
                    </p>
                  </div>
                  {!api.openrouterApiKey && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs">API key required</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
                <div className="py-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      Start a conversation by typing a message below
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          message.sender === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {message.sender === 'bot' && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              AI
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "max-w-[75%] rounded-lg px-3 py-2",
                            message.sender === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={cn(
                              "text-xs mt-1",
                              message.sender === 'user'
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                            )}
                          >
                            {message.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        {message.sender === 'user' && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src="https://pbs.twimg.com/profile_images/1593304942210478080/TUYae5z7_400x400.jpg"
                              alt="User"
                            />
                            <AvatarFallback className="text-xs">
                              You
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))
                  )}
                  {isTyping && (
                    <div className="flex gap-3 justify-start">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">AI</AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="border-t p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={isTyping}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!inputMessage.trim() || isTyping}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="flex-1 overflow-hidden">
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
                        placeholder="https://openrouter.ai/api/v1"
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
                        onChange={(e) => updateAPI({ openrouterModel: e.target.value })}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="anthropic/claude-sonnet-4-20250514">Claude 4 Sonnet</option>
                        <option value="anthropic/claude-opus-4-20250514">Claude 4 Opus</option>
                        <option value="openai/gpt-4o">GPT-4o</option>
                        <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
                        <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
                        <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
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
                  <Button className="flex-1">Save Changes</Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App
