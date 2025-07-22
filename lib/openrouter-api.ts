import OpenAI from 'openai'

export interface OpenRouterMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface OpenRouterAPIConfig {
  apiKey: string
  baseUrl?: string
  provider:string
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
  config: OpenRouterAPIConfig,
  onStream?: (chunk: string) => void
): Promise<string> {
  if (!config.apiKey) {
    throw new OpenRouterAPIError('API key is required')
  }

  try {
    const baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
    // Initialize OpenAI client with OpenRouter configuration
    const openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: baseUrl,
      defaultHeaders: {
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'chrome-extension://niuma-helper',
        'X-Title': 'Niuma Helper'
      },
      dangerouslyAllowBrowser: true
    })
    
    let model = config.model;
    if(baseUrl.includes('openrouter')){
      model = config.provider + '/' + config.model
    }
    
    // If streaming callback is provided, use streaming
    if (onStream) {
      const stream = await openai.chat.completions.create({
        model: model || '',
        max_completion_tokens: config.maxTokens || 1024,
        temperature: config.temperature || 0.7,
        messages: messages,
        stream: true
      })

      let fullContent = ''
      for await (const chunk of stream) {
        const chunkContent = chunk.choices[0]?.delta?.content || ''
        fullContent += chunkContent
        onStream(chunkContent)
      }
      
      return fullContent
    } else {
      // Non-streaming mode
      const response = await openai.chat.completions.create({
        model: model || '',
        max_completion_tokens: config.maxTokens || 1024,
        temperature: config.temperature || 0.7,
        messages: messages
      })

      // Extract text content from the response
      const textContent = response.choices[0]?.message?.content || ''
      return textContent
    }
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