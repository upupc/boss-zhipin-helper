import type { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources/chat/completions'

export interface QwenMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface QwenRequestParams {
  model: string;
  messages: QwenMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

interface QwenResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface QwenStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }[];
}

export class QwenClient {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string, baseURL: string = 'https://dashscope.aliyuncs.com/compatible-mode/v1') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  async chat(params: QwenRequestParams): Promise<string> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        max_tokens: params.max_tokens,
        temperature: params.temperature,
        messages: params.messages,
        stream: params.stream,
        response_format:{"type": "json_object"},
        enable_thinking:false
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Qwen API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as ChatCompletion;
    
    return data.choices[0].message.content as string;
  }
}

export function createQwenClient(apiKey: string, baseURL?: string): QwenClient {
  return new QwenClient(apiKey, baseURL);
}