import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'
import { OpenRouterMessage, sendMessageToOpenRouter, OpenRouterAPIError } from '@/lib/openrouter-api'
import { AlertCircle, Send } from 'lucide-react'
import { useEffect, useRef, useState, useCallback } from 'react'

interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'bot'
  timestamp: Date
}

interface ChatTabProps {}

// Module level helper functions
const scrollToBottom = (scrollAreaRef: React.RefObject<HTMLDivElement | null>) => {
  if (scrollAreaRef.current) {
    const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }
  }
}

const createUserMessage = (content: string): ChatMessage => ({
  id: Date.now().toString(),
  content: content.trim(),
  sender: 'user',
  timestamp: new Date()
})

const createBotMessage = (content: string): ChatMessage => ({
  id: (Date.now() + 1).toString(),
  content,
  sender: 'bot',
  timestamp: new Date()
})

const convertToOpenRouterMessages = (messages: ChatMessage[]): OpenRouterMessage[] => {
  return messages.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.content
  }))
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof OpenRouterAPIError) {
    if (error.status === 401) {
      return 'Invalid API key. Please check your OpenRouter API key in Settings.'
    } else if (error.status === 429) {
      return 'Rate limit exceeded. Please try again later.'
    } else {
      return `Error: ${error.message}`
    }
  }
  return 'Sorry, I encountered an error while processing your message.'
}

export function ChatTab({}: ChatTabProps) {
  const { api } = useSettings()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollToBottom(scrollAreaRef)
  }, [messages])

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || isTyping) return

    const userMessage = createUserMessage(inputMessage)
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)

    try {
      if (!api.openrouterApiKey) {
        const errorMessage = createBotMessage('Please configure your OpenRouter API key in the Settings tab to start chatting.')
        setMessages(prev => [...prev, errorMessage])
        setIsTyping(false)
        return
      }

      const openrouterMessages = convertToOpenRouterMessages(messages)
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

      const botMessage = createBotMessage(response)
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      const errorContent = getErrorMessage(error)
      const errorMessage = createBotMessage(errorContent)
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [inputMessage, isTyping, messages, api])

  return (
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
  )
}