import Anthropic from '@anthropic-ai/sdk'

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeAPIConfig {
  apiKey: string
  baseUrl?: string
  model?: string
  maxTokens?: number
  temperature?: number
}

export class ClaudeAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message)
    this.name = 'ClaudeAPIError'
  }
}

export async function sendMessageToClaude(
  messages: ClaudeMessage[],
  config: ClaudeAPIConfig
): Promise<string> {
  if (!config.apiKey) {
    throw new ClaudeAPIError('API key is required')
  }

  try {
    // Initialize Anthropic client with custom base URL if provided
    const anthropic = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      // Disable automatic retries to handle errors ourselves
      maxRetries: 0,
      dangerouslyAllowBrowser: true
    })

    // Create message with the SDK
    const response = await anthropic.messages.create({
      model: config.model || 'claude-sonnet-4-20250514',
      max_tokens: config.maxTokens || 1024,
      temperature: config.temperature || 0.7,
      messages: messages,
    })

    // Extract text content from the response
    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')

    return textContent
  } catch (error) {
    // Handle Anthropic SDK errors
    if (error instanceof Anthropic.APIError) {
      throw new ClaudeAPIError(
        error.message || `API request failed with status ${error.status}`,
        error.status,
        error
      )
    }
    
    // Handle other errors
    if (error instanceof Error) {
      throw new ClaudeAPIError(error.message, undefined, error)
    }
    
    throw new ClaudeAPIError('An unknown error occurred')
  }
}