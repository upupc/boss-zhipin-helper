import { useAppConfig } from '#imports'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSettings } from '@/hooks/use-settings'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import { ClaudeMessage, sendMessageToClaude, ClaudeAPIError } from '@/lib/claude-api'
import {
  Calendar,
  Heart,
  House,
  Key,
  Mail,
  MessageSquare,
  Monitor,
  Moon,
  Send,
  Settings,
  Sun,
  User,
  AlertCircle
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

    // Call Claude API
    try {
      if (!api.claudeApiKey) {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: 'Please configure your Claude API key in the Settings tab to start chatting.',
          sender: 'bot',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
        setIsTyping(false)
        return
      }

      // Convert our messages to Claude format
      const claudeMessages: ClaudeMessage[] = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
      
      // Add the new user message
      claudeMessages.push({
        role: 'user',
        content: userMessage.content
      })

      const response = await sendMessageToClaude(claudeMessages, {
        apiKey: api.claudeApiKey,
        baseUrl: api.baseUrl,
        model: api.claudeModel,
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
      
      if (error instanceof ClaudeAPIError) {
        if (error.status === 401) {
          errorContent = 'Invalid API key. Please check your Claude API key in Settings.'
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
            <h1 className="font-semibold text-lg">Sidepanel Template</h1>
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
              value="profile"
              className="data-[state=active]:after:bg-primary relative rounded-none py-2 px-4 flex items-center gap-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-1"
            >
              <User className="h-4 w-4" />
              Profile
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
                    Welcome to Sidepanel Template
                    <Badge variant="secondary">v1.0.0</Badge>
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    A modern browser extension template built with WXT, Tailwind
                    CSS 4.0, and shadcn/ui components.
                  </p>
                  <div className="grid gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          🚀 Modern Stack
                        </CardTitle>
                        <CardDescription>
                          Built with WXT, React, TypeScript, and Tailwind CSS
                          4.0 for the best developer experience.
                        </CardDescription>
                      </CardHeader>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          🎨 Beautiful Design
                        </CardTitle>
                        <CardDescription>
                          Clean and accessible UI components from shadcn/ui
                          library.
                        </CardDescription>
                      </CardHeader>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          ⚡ Fast Development
                        </CardTitle>
                        <CardDescription>
                          Hot reload and modern build tools for rapid
                          development.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="profile" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-8 p-4">
                {/* Profile Section */}
                <div className="text-center space-y-4">
                  <Avatar className="h-20 w-20 mx-auto ring-2 ring-offset-2 ring-primary/10">
                    <AvatarImage
                      src="https://pbs.twimg.com/profile_images/1593304942210478080/TUYae5z7_400x400.jpg"
                      alt="User Avatar"
                    />
                    <AvatarFallback className="text-lg font-semibold">
                      SC
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold">Shadcn</h2>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>shadcn@example.com</span>
                    </div>
                    <Badge variant="secondary" className="font-medium">
                      Premium User
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Account Details */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Account Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">
                        Member Since
                      </span>
                      <span className="text-sm font-medium">July 2025</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">
                        Last Login
                      </span>
                      <span className="text-sm font-medium">Today</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-muted-foreground">
                        Status
                      </span>
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-600"
                      >
                        Active
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="space-y-3">
                  <Button className="w-full">Edit Profile</Button>
                  <Button variant="outline" className="w-full">
                    Change Password
                  </Button>
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
                  {!api.claudeApiKey && (
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

                {/* Claude API Settings */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Claude API Settings
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Configure your Claude API credentials
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
                        value={api.claudeApiKey}
                        onChange={(e) => updateAPI({ claudeApiKey: e.target.value })}
                        placeholder="sk-ant-api..."
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Get your API key from{' '}
                        <a
                          href="https://console.anthropic.com/settings/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          console.anthropic.com
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
                        placeholder="https://api.anthropic.com"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Custom API endpoint (optional). Leave default for official API.
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <Label htmlFor="model" className="text-sm font-medium">
                        Model
                      </Label>
                      <select
                        id="model"
                        value={api.claudeModel}
                        onChange={(e) => updateAPI({ claudeModel: e.target.value })}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="claude-sonnet-4-20250514">Claude 4 Sonnet</option>
                        <option value="claude-opus-4-20250514">Claude 4 Opus</option>
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
