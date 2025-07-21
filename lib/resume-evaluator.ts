import OpenAI from 'openai'
import type { APISettings } from '@/hooks/use-settings'

export interface ResumeData {
  fileName: string
  fileType: string
  content: string
  base64Content?: string
}

export interface ResumeEvaluation {
  overallScore: number
  technicalSkillsScore: number
  experienceScore: number
  educationScore: number
  projectsScore: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  summary: string
  isJavaDeveloper: boolean
  yearsOfExperience: number
  keyTechnologies: string[]
}

export interface ResumeEvaluatorConfig {
  apiKey: string
  baseUrl?: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export class ResumeEvaluatorError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message)
    this.name = 'ResumeEvaluatorError'
  }
}

const EVALUATION_PROMPT = `You are an expert technical recruiter specializing in Java development. Analyze the provided resume and provide a comprehensive evaluation.

Please evaluate the resume based on the following criteria and return a JSON response with this exact structure:

{
  "overallScore": number (0-100),
  "technicalSkillsScore": number (0-100),
  "experienceScore": number (0-100),
  "educationScore": number (0-100),
  "projectsScore": number (0-100),
  "strengths": string[] (list 3-5 key strengths),
  "weaknesses": string[] (list 2-3 areas for improvement),
  "suggestions": string[] (list 2-3 actionable suggestions),
  "summary": string (2-3 sentence summary of the candidate),
  "isJavaDeveloper": boolean (whether this is a Java developer),
  "yearsOfExperience": number (estimated years of experience),
  "keyTechnologies": string[] (main technologies the candidate knows)
}

Evaluation criteria:
1. Technical Skills (40%): Java proficiency, frameworks (Spring, Spring Boot, etc.), databases, tools
2. Experience (30%): Relevance and depth of work experience, progression
3. Education (15%): Relevant degree, certifications, continuous learning
4. Projects (15%): Quality and complexity of projects, open source contributions

Focus on Java development skills and experience. Be objective and constructive in your evaluation.`

export class ResumeEvaluator {
  private openai: OpenAI

  constructor(private config: ResumeEvaluatorConfig) {
    if (!config.apiKey) {
      throw new ResumeEvaluatorError('API key is required')
    }

    const isOpenRouter = config.baseUrl?.includes('openrouter')
    
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://api.openai.com/v1',
      defaultHeaders: isOpenRouter ? {
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : '//boss-zhipin-helper',
        'X-Title': 'Niuma Helper'
      } : undefined,
      dangerouslyAllowBrowser: true
    })
  }

  async parseResume(file: File): Promise<ResumeData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = async (event) => {
        try {
          const content = event.target?.result
          
          if (typeof content === 'string') {
            if (file.type === 'application/pdf') {
              const base64Content = content.split(',')[1]
              resolve({
                fileName: file.name,
                fileType: file.type,
                content: `PDF Resume: ${file.name}`,
                base64Content
              })
            } else if (file.type === 'text/plain' || file.type === 'text/markdown') {
              resolve({
                fileName: file.name,
                fileType: file.type,
                content: content,
              })
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
              const base64Content = content.split(',')[1]
              resolve({
                fileName: file.name,
                fileType: file.type,
                content: `DOCX Resume: ${file.name}`,
                base64Content
              })
            } else {
              reject(new ResumeEvaluatorError(`Unsupported file type: ${file.type}`))
            }
          } else {
            reject(new ResumeEvaluatorError('Failed to read file content'))
          }
        } catch (error) {
          reject(new ResumeEvaluatorError('Error parsing resume', undefined, error))
        }
      }
      
      reader.onerror = () => {
        reject(new ResumeEvaluatorError('Error reading file'))
      }
      
      if (file.type === 'text/plain' || file.type === 'text/markdown') {
        reader.readAsText(file)
      } else {
        reader.readAsDataURL(file)
      }
    })
  }

  async evaluateResume(resumeData: ResumeData, apiSettings?: APISettings): Promise<ResumeEvaluation> {
    try {
      // Create a temporary client if apiSettings are provided
      let client = this.openai
      if (apiSettings) {
        const isOpenRouter = apiSettings.baseUrl?.includes('openrouter') || !apiSettings.openrouterApiKey.startsWith('sk-')
        client = new OpenAI({
          apiKey: apiSettings.openrouterApiKey,
          baseURL: isOpenRouter ? (apiSettings.baseUrl || 'https://openrouter.ai/api/v1') : 'https://api.openai.com/v1',
          defaultHeaders: isOpenRouter ? {
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'chrome-extension://niuma-helper',
            'X-Title': 'Niuma Helper'
          } : undefined,
          dangerouslyAllowBrowser: true
        })
      }

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: EVALUATION_PROMPT
        }
      ]

      if (resumeData.base64Content) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please analyze this resume and provide evaluation in JSON format.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${resumeData.fileType};base64,${resumeData.base64Content}`,
                detail: 'high'
              }
            }
          ]
        })
      } else {
        messages.push({
          role: 'user',
          content: `Please analyze this resume and provide evaluation in JSON format:\n\n${resumeData.content}`
        })
      }

      // Use apiSettings if provided, otherwise fall back to config
      const model = apiSettings ? 
        (apiSettings.baseUrl?.includes('openrouter') ? apiSettings.openrouterModel : 'gpt-4o') : 
        (this.config.model || 'gpt-4o')
      
      const response = await client.chat.completions.create({
        model,
        messages,
        temperature: apiSettings?.temperature ?? this.config.temperature ?? 0.3,
        response_format: { type: 'json_object' },
        max_tokens: apiSettings?.maxTokens ?? this.config.maxTokens ?? 2000
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new ResumeEvaluatorError('No response from AI model')
      }

      const evaluation = JSON.parse(content) as ResumeEvaluation
      
      return evaluation
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new ResumeEvaluatorError(
          error.message || `API request failed with status ${error.status}`,
          error.status,
          error
        )
      }
      
      if (error instanceof Error) {
        throw new ResumeEvaluatorError(error.message, undefined, error)
      }
      
      throw new ResumeEvaluatorError('An unknown error occurred during evaluation')
    }
  }

  async evaluateResumeStream(
    resumeData: ResumeData,
    onChunk: (chunk: string) => void,
    apiSettings?: APISettings
  ): Promise<ResumeEvaluation> {
    try {
      // Create a temporary client if apiSettings are provided
      let client = this.openai
      if (apiSettings) {
        const isOpenRouter = apiSettings.baseUrl?.includes('openrouter') || !apiSettings.openrouterApiKey.startsWith('sk-')
        client = new OpenAI({
          apiKey: apiSettings.openrouterApiKey,
          baseURL: isOpenRouter ? (apiSettings.baseUrl || 'https://openrouter.ai/api/v1') : 'https://api.openai.com/v1',
          defaultHeaders: isOpenRouter ? {
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'chrome-extension://niuma-helper',
            'X-Title': 'Niuma Helper'
          } : undefined,
          dangerouslyAllowBrowser: true
        })
      }

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: 'You are an expert technical recruiter. Provide a detailed analysis of the resume, then conclude with a JSON evaluation in the format specified.'
        }
      ]

      if (resumeData.base64Content) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this resume. First provide detailed insights, then end with JSON evaluation:\n${EVALUATION_PROMPT}`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${resumeData.fileType};base64,${resumeData.base64Content}`,
                detail: 'high'
              }
            }
          ]
        })
      } else {
        messages.push({
          role: 'user',
          content: `Analyze this resume. First provide detailed insights, then end with JSON evaluation:\n${EVALUATION_PROMPT}\n\nResume:\n${resumeData.content}`
        })
      }

      // Use apiSettings if provided, otherwise fall back to config
      const model = apiSettings ? 
        (apiSettings.baseUrl?.includes('openrouter') ? apiSettings.openrouterModel : 'gpt-4o') : 
        (this.config.model || 'gpt-4o')

      const stream = await client.chat.completions.create({
        model,
        messages,
        temperature: apiSettings?.temperature ?? this.config.temperature ?? 0.3,
        max_tokens: apiSettings?.maxTokens ?? this.config.maxTokens ?? 3000,
        stream: true
      })

      let fullContent = ''
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        fullContent += content
        onChunk(content)
      }

      const jsonMatch = fullContent.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new ResumeEvaluatorError('No JSON evaluation found in response')
      }

      const evaluation = JSON.parse(jsonMatch[0]) as ResumeEvaluation
      
      return evaluation
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        throw new ResumeEvaluatorError(
          error.message || `API request failed with status ${error.status}`,
          error.status,
          error
        )
      }
      
      if (error instanceof Error) {
        throw new ResumeEvaluatorError(error.message, undefined, error)
      }
      
      throw new ResumeEvaluatorError('An unknown error occurred during evaluation')
    }
  }
}

export function createResumeEvaluator(config: ResumeEvaluatorConfig): ResumeEvaluator {
  return new ResumeEvaluator(config)
}

export function createResumeEvaluatorFromSettings(apiSettings: APISettings): ResumeEvaluator {
  // Determine if using OpenRouter or direct OpenAI based on the API key and base URL
  const isOpenRouter = apiSettings.baseUrl?.includes('openrouter') || !apiSettings.openrouterApiKey.startsWith('sk-')
  
  return new ResumeEvaluator({
    apiKey: apiSettings.openrouterApiKey,
    baseUrl: isOpenRouter ? (apiSettings.baseUrl || 'https://openrouter.ai/api/v1') : 'https://api.openai.com/v1',
    model: isOpenRouter ? (apiSettings.openrouterModel || 'openai/gpt-4o') : 'gpt-4o',
    temperature: apiSettings.temperature,
    maxTokens: apiSettings.maxTokens
  })
}