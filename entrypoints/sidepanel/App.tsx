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
  Users,
  Hand,
  Square,
  Check,
  Loader2
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

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
  const [filteredGeeks, setFilteredGeeks] = useState<{ name: string; content: string; isJava: boolean; status?: string }[]>([])
  const [isFiltering, setIsFiltering] = useState(false)
  const shouldStopGreetingRef = useRef(false)
  
  // Settings state
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

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
  // 批量发送打招呼请求
  const sendGreetingsToGeeks = async (tabId: number, geeks: any[]) => {
    const updatedGeeks = [...geeks];
    
    for (let index = 0; index < updatedGeeks.length; index++) {
      // Check if we should stop
      if (shouldStopGreetingRef.current) {
        console.log('用户已停止自动打招呼');
        break;
      }
      
      const geek = updatedGeeks[index];
      console.log(`正在处理第 ${index + 1}/${updatedGeeks.length} 个候选人: ${geek.name}`);
      
      try {
        const greetResponse = await browser.tabs.sendMessage(tabId, { 
          action: 'doGreeting',
          index: index 
        });
        
        if (greetResponse.success) {
          console.log(`成功向 ${geek.name} 打招呼`);
          updatedGeeks[index] = greetResponse.geek;
        } else {
          console.error(`向 ${geek.name} 打招呼失败:`, greetResponse.error);
          updatedGeeks[index].status = 'failed';
        }
        
        setFilteredGeeks([...updatedGeeks]);
      } catch (error) {
        console.error(`发送打招呼消息失败:`, error);
        updatedGeeks[index].status = 'failed';
        setFilteredGeeks([...updatedGeeks]);
      }
    }
    
    return updatedGeeks;
  };

  const handleStopGreeting = () => {
    shouldStopGreetingRef.current = true
    setIsFiltering(false)
  }

  const handleFilterGeeks = async () => {
    setIsFiltering(true)
    setFilteredGeeks([])
    shouldStopGreetingRef.current = false
    
    try {
      // First check if there's a BOSS直聘 tab
      const tabs = await browser.tabs.query({ url: '*://*.zhipin.com/*' })
      
      // We need at least one BOSS直聘 tab to check login status
      let targetTab = null;
      if (tabs.length === 0) {
        // No BOSS直聘 tabs open, create a new one
        targetTab = await browser.tabs.create({ url: 'https://www.zhipin.com' });
        // Wait for the page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        targetTab = tabs[0];
      }
      
      // Check login status through content script
      if (targetTab && targetTab.id) {
        const loginStatusResponse = await browser.tabs.sendMessage(targetTab.id, { 
          action: 'checkLoginStatus'
        })
        
        if (!loginStatusResponse.isLoggedIn) {
          toast.error('请先登录', {
            description: '请先登录BOSS直聘后再使用此功能',
            duration: 4000,
          })
          setIsFiltering(false)
          return
        }
      }
      
      // Continue with existing logic to check recommend page
      const recommendUrl = 'https://www.zhipin.com/web/chat/recommend';
      
      // Check if current targetTab is already on the recommend page
      if (targetTab && targetTab.url === recommendUrl) {
        // Already on the recommend page, no need to navigate
      } else {
        // Check if any other tab is on the recommend page
        let foundRecommendTab = false;
        for (const tab of tabs) {
          if (tab.url === recommendUrl) {
            targetTab = tab;
            foundRecommendTab = true;
            break;
          }
        }
        
        // If no recommend page found, navigate to it
        if (!foundRecommendTab && targetTab && targetTab.id) {
          targetTab = await browser.tabs.update(targetTab.id, { url: recommendUrl });
          // Wait for the page to load
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      // Focus on the target tab
      if (targetTab && targetTab.id) {
        await browser.tabs.update(targetTab.id, { active: true });
        
        // Send message to content script with filter keywords
        const response = await browser.tabs.sendMessage(targetTab.id, { 
          action: 'filterGeeks',
          filterKeywords: system.filterKeywords || 'Java'
        })
        if (response && response.geeks) {
          setFilteredGeeks(response.geeks);
          
          // 使用封装的方法批量发送打招呼
          await sendGreetingsToGeeks(targetTab.id, response.geeks);
        }
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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-[#00BEBD] flex items-center justify-center shadow-md">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg text-gray-800">
              BOSS直聘智能助手
            </h1>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-[#00BEBD] rounded-full animate-pulse"></span>
              AI智能招聘解决方案
            </p>
          </div>
          <Badge variant="outline" className="text-xs border-[#00BEBD]/30 text-[#00BEBD]">
            Pro
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={ui.activeTab} onValueChange={handleTabChange} className="h-full flex flex-col gap-0">
          <TabsList className="h-auto rounded-none border-b bg-white/50 p-0 w-full">
            <TabsTrigger
              value="home"
              className="data-[state=active]:after:bg-[#00BEBD] data-[state=active]:text-[#00BEBD] relative rounded-none py-2 px-4 flex items-center gap-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-1 text-gray-600"
            >
              <House className="h-4 w-4" />
              Home
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="data-[state=active]:after:bg-[#00BEBD] data-[state=active]:text-[#00BEBD] relative rounded-none py-2 px-4 flex items-center gap-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-1 text-gray-600"
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:after:bg-[#00BEBD] data-[state=active]:text-[#00BEBD] relative rounded-none py-2 px-4 flex items-center gap-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-1 text-gray-600"
            >
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-6 p-6">
                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#00BEBD]/5 via-white to-gray-50 border border-gray-200 p-8">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#00BEBD]/10 rounded-full blur-3xl" />
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#00BEBD]/10 rounded-full blur-3xl" />
                  
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-12 w-12 rounded-xl bg-[#00BEBD] flex items-center justify-center shadow-md">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">
                          BOSS直聘智能助手
                        </h2>
                        <div className="flex items-center gap-2">
                          <Badge className="text-xs bg-gray-100 text-gray-600 border-0">v1.0.0</Badge>
                          <Badge className="text-xs bg-[#00BEBD]/10 text-[#00BEBD] border-[#00BEBD]/20">
                            AI Powered
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                      智能筛选候选人，自动批量打招呼，提升招聘效率。
                    </p>
                    <div className="flex items-center gap-2 mb-6">
                      <span className="text-xs text-gray-500">当前筛选关键字：</span>
                      <Badge className="text-xs bg-[#00BEBD]/10 text-[#00BEBD] border-[#00BEBD]/20">
                        {system.filterKeywords || 'Java'}
                      </Badge>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      {!isFiltering ? (
                        <Button
                          size="lg"
                          onClick={handleFilterGeeks}
                          className="w-full bg-[#00BEBD] hover:bg-[#00BEBD]/90 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
                        >
                          <Hand className="h-4 w-4 mr-2" />
                          一键打招呼
                        </Button>
                      ) : (
                        <Button
                          size="lg"
                          variant="destructive"
                          onClick={handleStopGreeting}
                          className="w-full bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
                        >
                          <Square className="h-4 w-4 mr-2" />
                          停止
                        </Button>
                      )}
                    </div>
                    
                    {isFiltering && (
                      <div className="mt-4 p-3 bg-[#00BEBD]/5 rounded-lg border border-[#00BEBD]/20">
                        <p className="text-xs text-[#00BEBD] flex items-center gap-2">
                          <div className="w-2 h-2 bg-[#00BEBD] rounded-full animate-pulse" />
                          正在智能分析候选人资料，自动向符合关键字的候选人打招呼...
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Filtered Results */}
                {filteredGeeks.length > 0 && (
                  <div className="space-y-4">
                    {/* Results Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-[#00BEBD]/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-[#00BEBD]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">筛选结果</h3>
                          <p className="text-xs text-gray-500">
                            共找到 {filteredGeeks.length} 位候选人
                          </p>
                        </div>
                      </div>
                      {filteredGeeks.some(g => g.status === 'greeted') && (
                        <Badge className="bg-green-50 text-green-700 border-green-200">
                          ✅ 已打招呼 {filteredGeeks.filter(g => g.status === 'greeted').length} 人
                        </Badge>
                      )}
                    </div>
                    
                    {/* Candidates Grid */}
                    <div className="grid gap-3">
                      {filteredGeeks.map((geek, index) => (
                        <div 
                          key={index} 
                          className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 hover:border-[#00BEBD]/30 hover:shadow-md transition-all duration-200"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-[#00BEBD]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-[#00BEBD]/10 flex items-center justify-center text-sm font-semibold text-[#00BEBD]">
                                {geek.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-semibold text-sm text-gray-800">{geek.name}</h4>
                                <p className="text-xs text-gray-500">候选人</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {geek.isJava && (
                                <Badge className="text-xs bg-orange-100 text-orange-700 border-0">
                                  Java
                                </Badge>
                              )}
                              {geek.status === 'pending' && (
                                <Badge variant="outline" className="text-xs border-[#00BEBD]/30 text-[#00BEBD]">
                                  待处理
                                </Badge>
                              )}
                              {geek.status === 'greeted' && (
                                <Badge className="text-xs bg-green-100 text-green-700 border-0">
                                  已打招呼
                                </Badge>
                              )}
                              {geek.status === 'disabled' && (
                                <Badge className="text-xs bg-gray-100 text-gray-600 border-0">
                                  已禁用
                                </Badge>
                              )}
                              {geek.status === 'failed' && (
                                <Badge className="text-xs bg-red-50 text-red-700 border-0">
                                  失败
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                  <Button 
                    className={cn(
                      "flex-1 transition-all duration-300",
                      saveSuccess && "bg-green-600 hover:bg-green-700"
                    )}
                    onClick={async () => {
                      setIsSaving(true)
                      // Simulate saving with a small delay
                      await new Promise(resolve => setTimeout(resolve, 800))
                      setIsSaving(false)
                      setSaveSuccess(true)
                      toast.success('设置已保存', {
                        description: '所有更改已成功保存到本地存储。',
                        duration: 3000,
                      })
                      // Reset success state after animation
                      setTimeout(() => setSaveSuccess(false), 2000)
                    }}
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App
