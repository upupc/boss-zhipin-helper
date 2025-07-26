// Direct HTTP implementation - OpenAI SDK removed
import OpenAI from 'openai'
import type { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type {ResponseFormatJSONSchema} from "openai/resources/shared";
import { createQwenClient, type QwenClient,type QwenMessage,type QwenRequestParams} from '@/lib/qwen-client'
import type { APISettings } from '@/hooks/use-settings'

export interface ResumeData {
  fileName: string
  fileType: string
  content: string
  base64Content?: string
}

export interface ResumeEvaluation {
  result: boolean
  name: string
  age: string
  experience: string
  education: string
  school: string
  stability: string
  techSkills: string
  industryExp: string
  isJavaDeveloper: boolean
  summary: string
}

export interface ResumeContent {
  name: string
  age: number
  schools: string[]
  content: string
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
    public details?: any,
    public error?:Error
  ) {
    super(message)
    this.name = 'ResumeEvaluatorError'
  }
}

const EVALUATION_PROMPT = `# 招聘简历筛选评估提示词

## 任务说明
请根据以下标准评估候选人简历是否符合招聘要求。每个条件都是必须满足的硬性要求（除非特别标注为"优先考虑"）。

## 评估标准

### 硬性要求（必须全部满足）

1. **年龄要求**
   - 候选人年龄必须在22-30岁之间（包含22岁和30岁）
   - 如简历未明确标注年龄，可通过毕业时间等信息合理推算

2. **工作经验年限**
   - 候选人工作经验必须不超过5年
   - 实习经历不计入正式工作经验
   - 如无工作经验（如应届生），视为符合此条件

3. **学历要求**
   - 必须具备硕士研究生及以上学历（已毕业或即将毕业）
   - 在读研究生需要明确毕业时间在合理范围内

4. **院校要求**
   - 毕业院校必须满足以下条件之一：
     - 中国985工程院校
     - 中国211工程院校  
     - QS世界大学排名前100名院校
   - 如涉及海外院校，以最新QS排名为准

5. **工作稳定性**
   - 近5年内更换工作单位少于3次
   - 对于工作经验不足5年的候选人，按实际工作年限计算
   - 同一集团内部调动不算换工作

6. **技术能力要求**
   - 必须精通Java编程语言
   - 判断标准：简历中明确表述具备Java开发能力，并有相关项目经验佐证
   - 如简历仅提及"了解"或"熟悉"需要进一步确认是否达到精通水平

### 加分项（优先考虑条件）

7. **行业经验**
   - 具备金融、物流或电商平台相关工作经验者优先考虑
   - 相关项目经历也可作为加分因素
   - 此项不作为硬性淘汰条件

## 评估流程

1. **逐条验证**：按顺序检查每个硬性要求
2. **记录依据**：对每个判断提供简历中的具体依据
3. **综合判断**：
   - 如所有硬性要求均满足，输出"符合要求"
   - 如任一硬性要求不满足，输出"不符合要求"
   - 简要说明符合/不符合的具体原因

## 输出格式
请按照如下结构输出JSON字符串：
{
  "result": boolean(整体评估结果，符合为true，不符合为false),
  "age": string(符合/不符合,依据),
  "experience": string(符合/不符合,依据),
  "education": string(符合/不符合,依据),
  "school": string(符合/不符合,依据),
  "stability": string(符合/不符合,依据),
  "techSkills": string(符合/不符合,依据),
  "industryExp": string(符合/不符合,依据),
  "isJavaDeveloper": boolean(true/false),
  "summary": string(对整体情况做总结，不超过50字)
}
`

const RESUME_PARSE_PROMPT = `# 角色
你是一个简历阅读专家，你能够非常还原的将简历的内容整理成结构化的数据。

# 输出格式
按照下面的格式返回JSON字符串
{
  "name": string (姓名),
  "age": number (年龄),
  "schools": string[] (毕业院校，按时间排序),
  "content": string(简历的原始文本内容，按照markdown格式整理) ,
}
`
const response_format:ResponseFormatJSONSchema = {
  "type": "json_schema",
  "json_schema": {
    "name": "response_schema",
    "strict": true,
    "description":"解析输入的文件，提取候选人的名称、年龄、毕业院校分别到name,age,schools字段，原始的简历文本以markdown的格式保存到content字段",
    "schema": {
      "type": "object",
      "properties": {
        "name": {"type": "string"},
        "age": {"type": "number"},
        "schools": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "content": {"type": "string"},
      },
      "required": ["name", "age", "schools", "content"]
    }
  }
}

const response_format2:ResponseFormatJSONSchema = {
  "type": "json_schema",
  "json_schema": {
    "name": "response_schema",
    "strict": true,
    "description":"评估简历内容，提取相关字段",
    "schema": {
      "type": "object",
      "properties": {
        "result": {"type": "boolean","description": "候选是否匹配岗位要求，所有条件都满足才算匹配"},
        "age": {"type": "string","description": "候选人年龄是否满足要求"},
        "experience": {"type": "string","description": "候选人工作经验，主要指工作年限，是否满足要求"},
        "education": {"type": "string","description": "候选人学历是否满足要求"},
        "school": {"type": "string","description": "候选人毕业院校是否满足要求"},
        "stability": {"type": "string","description": "候选人稳定性是否满足要求"},
        "techSkills": {"type": "string","description": "候选人编程技能是否满足要求"},
        "industryExp": {"type": "string","description": "候选人行业经验是否满足要求"},
        "isJavaDeveloper": {"type": "boolean","description": "候选人学历是否精通java"},
        "summary": {"type": "boolean","description": "候选人简历信息的综合评价"}
      },
      "required": ["result", "age", "experience", "education","school", "stability", "techSkills", "industryExp", "isJavaDeveloper", "summary"]
    }
  }
}


export class ResumeEvaluator {
  private readonly apiEndpoint: string
  private readonly headers: Record<string, string>

  constructor(private readonly config: ResumeEvaluatorConfig) {
    if (!config.apiKey) {
      throw new ResumeEvaluatorError('API key is required')
    }

    const isOpenRouter = config.baseUrl?.includes('openrouter')
    const baseURL = config.baseUrl || 'https://api.openai.com/v1'
    this.apiEndpoint = `${baseURL}/chat/completions`
    
    // Set headers
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    }
    
    if (isOpenRouter) {
      this.headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.href : '//boss-zhipin-helper'
      this.headers['X-Title'] = 'Niuma Helper'
    }
  }

  async evaluateResume(file: File, apiSettings?: any): Promise<ResumeEvaluation> {
    // Use provided apiSettings or fall back to config
    const api = apiSettings || {
      baseUrl: this.config.baseUrl || 'https://api.openai.com/v1',
      openrouterApiKey: this.config.apiKey,
      openrouterModel: this.config.model || 'gpt-4o',
      provider: '',
      temperature: this.config.temperature || 0.7,
      maxTokens: this.config.maxTokens || 4096
    }
    
    try {
      const isOpenRouter = api.baseUrl.includes('openrouter')
      const isAliyunDashscope = api.baseUrl.includes('https://dashscope.aliyuncs.com')

      // Step 1: Upload file using files.create API
      const model = isOpenRouter?api.provider + '/' + api.openrouterModel:api.openrouterModel;
      const fileModel = isAliyunDashscope?'qwen-long-latest':model


      const fileId = await this.uploadLocalFile(api,file)
      if (!fileId) {
        throw new ResumeEvaluatorError('No file ID returned from upload')
      }

      const openai = new OpenAI({
        apiKey: api.openrouterApiKey,
        baseURL: api.baseUrl,
        defaultHeaders: {
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.href : 'chrome-extension://niuma-helper',
          'X-Title': 'Niuma Helper'
        },
        dangerouslyAllowBrowser: true
      })


      let messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: RESUME_PARSE_PROMPT
        },
        {
          role: 'system',
          content: `fileid://${fileId}`
        },
        {
          role: 'user',
          content: '请阅读这份简历并按要求返回内容。'
        }
      ]

      //使用qwen-long解析PDF简历内容
      let response:ChatCompletion = await openai.chat.completions.create({
        model: fileModel,
        max_completion_tokens: 524288,
        temperature: 0.7,
        messages: messages,
        stream: false,
        response_format:isAliyunDashscope?{"type": "json_object"}:response_format
      })
      let fullContent = response.choices[0].message.content;
      if (!fullContent) {
        throw new ResumeEvaluatorError('No content in API response')
      }

      try {
        const resumeContent = JSON.parse(fullContent) as ResumeContent

        messages = [
          {
            role: 'system',
            content: EVALUATION_PROMPT
          },
          {
            role: 'user',
            content: `详细和严格的评估下面这份简历的内容：\n${resumeContent.content}`
          }
        ]

        if(isAliyunDashscope){
          const qwenClient = createQwenClient(api.openrouterApiKey,api.baseUrl)

          const qwenMessages:QwenMessage[] = messages as QwenMessage[]

          const qwenRequestParams:QwenRequestParams = {
            model: model,
            max_tokens: 16384,
            temperature: 0.7,
            messages: qwenMessages,
            stream: false,
          }
          fullContent = await qwenClient.chat(qwenRequestParams)
        }else{
          response = await openai.chat.completions.create({
            model: model,
            max_completion_tokens: api.maxTokens,
            temperature: api.temperature,
            messages: messages,
            stream: false,
            response_format:response_format2
          })
          fullContent = response.choices[0].message.content;
        }

        if (!fullContent) {
          throw new ResumeEvaluatorError('No content in API response')
        }
        const resumeResult = JSON.parse(fullContent) as ResumeEvaluation
        resumeResult.name = resumeContent.name
        return resumeResult
      } catch (parseError) {
        throw new ResumeEvaluatorError('Failed to parse API response', undefined, fullContent, parseError as Error)
      }
    } catch (error) {
      if (error instanceof ResumeEvaluatorError) {
        throw error
      }
      throw new ResumeEvaluatorError('Resume evaluation failed', undefined,'', error as Error)
    }
  }

  async uploadLocalFile(apiSettings: APISettings, input:File): Promise<string> {
    try {
      const fileUploadEndpoint = apiSettings.baseUrl + '/files';
      const formData = new FormData()
      formData.append('file', input)
      formData.append('purpose', 'file-extract')

      // Upload file
      const uploadResponse = await fetch(fileUploadEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiSettings.openrouterApiKey}`
          // Note: Don't set Content-Type for FormData
        },
        body: formData
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => null)
        throw new ResumeEvaluatorError(
            `File upload failed: ${uploadResponse.statusText}`,
            uploadResponse.status,
            errorData
        )
      }
      console.log('文件上传成功:', input);
      const uploadData = await uploadResponse.json()
      return uploadData.id
    } catch (error) {
      console.error('文件上传失败:', error);
      throw error
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