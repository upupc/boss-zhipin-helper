import OpenAI from 'openai'

export interface OpenRouterMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface OpenRouterAPIConfig {
  apiKey: string
  baseUrl?: string
  model?: string
  maxTokens?: number
  temperature?: number
}

export class OpenRouterAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message)
    this.name = 'OpenRouterAPIError'
  }
}

export async function sendMessageToOpenRouter(
  messages: OpenRouterMessage[],
  config: OpenRouterAPIConfig
): Promise<string> {
  if (!config.apiKey) {
    throw new OpenRouterAPIError('API key is required')
  }

  try {
    // Initialize OpenAI client with OpenRouter configuration
    const openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'chrome-extension://niuma-helper',
        'X-Title': 'Niuma Helper'
      },
      dangerouslyAllowBrowser: true
    })

    // Create chat completion with OpenRouter
    const response = await openai.chat.completions.create({
      model: config.model || 'anthropic/claude-sonnet-4-20250514',
      max_tokens: config.maxTokens || 1024,
      temperature: config.temperature || 0.7,
      messages: messages,
    })

    // Extract text content from the response
    const textContent = response.choices[0]?.message?.content || ''

    return textContent
  } catch (error) {
    // Handle OpenAI SDK errors
    if (error instanceof OpenAI.APIError) {
      throw new OpenRouterAPIError(
        error.message || `API request failed with status ${error.status}`,
        error.status,
        error
      )
    }
    
    // Handle other errors
    if (error instanceof Error) {
      throw new OpenRouterAPIError(error.message, undefined, error)
    }
    
    throw new OpenRouterAPIError('An unknown error occurred')
  }
}