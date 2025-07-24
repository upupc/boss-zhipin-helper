import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Hand, Square, Users, MessageCircle, FileText, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { useSettings } from '@/hooks/use-settings'
import {createResumeEvaluatorFromSettings, type ResumeEvaluation, ResumeEvaluatorError} from '@/lib/resume-evaluator'

interface RecruitTabProps {}

interface Geek {
  name: string
  content: string
  matchedKeywords?: string
  status?: string
  messageCount?: number
}

interface ResumeFile {
  name: string
  path: string
  size: number
  lastModified: Date
  file?: File
  evaluation?: ResumeEvaluation
  isEvaluating?: boolean,
  tips?: string
}

// Module level helper functions
const sendGreetingMessage = async (tabId: number, index: number) => {
  return await browser.tabs.sendMessage(tabId, { 
    action: 'doGreeting',
    index: index 
  })
}

const checkLoginStatus = async (tabId: number) => {
  return await browser.tabs.sendMessage(tabId, { 
    action: 'checkLoginStatus'
  })
}

const filterGeeksOnPage = async (tabId: number, filterKeywords: string) => {
  return await browser.tabs.sendMessage(tabId, { 
    action: 'filterGeeks',
    filterKeywords: filterKeywords
  })
}

const createOrGetBossTab = async () => {
  const tabs = await browser.tabs.query({ url: '*://*.zhipin.com/*' })
  
  if (tabs.length === 0) {
    const newTab = await browser.tabs.create({ url: 'https://www.zhipin.com' })
    await new Promise(resolve => setTimeout(resolve, 3000))
    return newTab
  }
  
  return tabs[0]
}

const navigateToRecommendPage = async (targetTab: any, existingTabs: any[]) => {
  const recommendUrl = 'https://www.zhipin.com/web/chat/recommend'
  
  if (targetTab.url === recommendUrl) {
    return targetTab
  }
  
  // Check if any other tab is on the recommend page
  for (const tab of existingTabs) {
    if (tab.url === recommendUrl) {
      return tab
    }
  }
  
  // Navigate to recommend page
  if (targetTab.id) {
    const updatedTab = await browser.tabs.update(targetTab.id, { url: recommendUrl })
    await new Promise(resolve => setTimeout(resolve, 3000))
    return updatedTab
  }
  
  return targetTab
}

const fetchChatUserList = async (tabId: number, filterKeywords: string) => {
  return await browser.tabs.sendMessage(tabId, { 
    action: 'filterChatUsers',
    filterKeywords: filterKeywords
  })
}

const sendDownloadResumeMessage = async (tabId: number, index: number) => {
  return await browser.tabs.sendMessage(tabId, { 
    action: 'doDownloadResume',
    index: index 
  })
}

// Download resumes for users with new chat messages
const downloadResumesForUsers = async (
  tabId: number, 
  users: Geek[], 
  onUpdate?: (users: Geek[]) => void
) => {
  const updatedUsers = [...users]
  
  for (let index = 0; index < updatedUsers.length; index++) {
    const user = updatedUsers[index]
    console.log(`正在下载第 ${index + 1}/${updatedUsers.length} 个用户的简历: ${user.name}`)
    
    try {
      const response = await sendDownloadResumeMessage(tabId, index)
      
      if (response.success) {
        console.log(`成功触发 ${user.name} 的简历下载`)
        updatedUsers[index].status = '已下载简历'
      } else {
        console.error(`下载 ${user.name} 的简历失败:`, response.error)
        updatedUsers[index].status = '下载失败'
      }
      
      if (onUpdate) {
        onUpdate([...updatedUsers])
      }
    } catch (error) {
      console.error(`发送下载简历消息失败:`, error)
      updatedUsers[index].status = '下载失败'
      if (onUpdate) {
        onUpdate([...updatedUsers])
      }
    }
    
    // Add delay between downloads to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  return updatedUsers
}

// Global state for greeting control
let globalShouldStopGreeting = false
let globalShouldStopScanning = false;

// Module level clear list method
const clearList = (
  setFilteredGeeks: (geeks: Geek[]) => void,
  setChatUsers: (users: Geek[]) => void,
  setResumeFiles: (files: ResumeFile[]) => void
) => {
  setFilteredGeeks([])
  setChatUsers([])
  setResumeFiles([])
}

const sendGreetingsToGeeks = async (
  tabId: number, 
  geeks: Geek[], 
  onUpdate: (geeks: Geek[]) => void
) => {
  const updatedGeeks = [...geeks]
  
  for (let index = 0; index < updatedGeeks.length; index++) {
    if (globalShouldStopGreeting) {
      console.log('用户已停止自动打招呼')
      break
    }
    
    const geek = updatedGeeks[index]
    console.log(`正在处理第 ${index + 1}/${updatedGeeks.length} 个候选人: ${geek.name}`)
    
    try {
      const greetResponse = await sendGreetingMessage(tabId, index)
      
      if (greetResponse.success) {
        console.log(`成功向 ${geek.name} 打招呼`)
        updatedGeeks[index] = greetResponse.geek
      } else {
        console.error(`向 ${geek.name} 打招呼失败:`, greetResponse.error)
        updatedGeeks[index].status = 'failed'
      }
      
      onUpdate([...updatedGeeks])
    } catch (error) {
      console.error(`发送打招呼消息失败:`, error)
      updatedGeeks[index].status = 'failed'
      onUpdate([...updatedGeeks])
    }
  }
  
  return updatedGeeks
}

const handleStopGreeting = (setIsFiltering: (value: boolean) => void) => {
  globalShouldStopGreeting = true
  setIsFiltering(false)
}

const handleFilterGeeks = async (
  filterKeywords: string,
  setIsFiltering: (value: boolean) => void,
  setFilteredGeeks: (geeks: Geek[]) => void,
  setChatUsers: (users: Geek[]) => void,
  setResumeFiles: (files: ResumeFile[]) => void
) => {
  clearList(setFilteredGeeks, setChatUsers, setResumeFiles)
  setIsFiltering(true)
  globalShouldStopGreeting = false
  
  try {
    const targetTab = await createOrGetBossTab()
    
    if (targetTab && targetTab.id) {
      const loginStatusResponse = await checkLoginStatus(targetTab.id)
      
      if (!loginStatusResponse.isLoggedIn) {
        toast.error('请先登录', {
          description: '请先登录BOSS直聘后再使用此功能',
          duration: 4000,
        })
        setIsFiltering(false)
        return
      }
    }
    
    const tabs = await browser.tabs.query({ url: '*://*.zhipin.com/*' })
    const finalTab = await navigateToRecommendPage(targetTab, tabs)
    
    if (finalTab && finalTab.id) {
      await browser.tabs.update(finalTab.id, { active: true })
      
      const response = await filterGeeksOnPage(finalTab.id, filterKeywords)
      if (response && response.geeks) {
        setFilteredGeeks(response.geeks)
        await sendGreetingsToGeeks(finalTab.id, response.geeks, setFilteredGeeks)
      }
    }
  } catch (error) {
    console.error('Error filtering geeks:', error)
    alert('筛选失败，请确保在BOSS直聘页面')
  } finally {
    setIsFiltering(false)
  }
}

const handleNewChatUsersResume = async (
  filterKeywords: string,
  setIsDownloadResumes: (value: boolean) => void,
  setChatUsers: (users: Geek[]) => void,
  setFilteredGeeks: (geeks: Geek[]) => void,
  setResumeFiles: (files: ResumeFile[]) => void
) => {
  clearList(setFilteredGeeks, setChatUsers, setResumeFiles)
  setIsDownloadResumes(true)
  
  try {
    const targetTab = await createOrGetBossTab()
    
    if (targetTab && targetTab.id) {
      const loginStatusResponse = await checkLoginStatus(targetTab.id)
      
      if (!loginStatusResponse.isLoggedIn) {
        toast.error('请先登录', {
          description: '请先登录BOSS直聘后再使用此功能',
          duration: 4000,
        })
        setIsDownloadResumes(false)
        return
      }
      if(targetTab.url!=='https://www.zhipin.com/web/chat/index'){
        // Navigate to chat page
        await browser.tabs.update(targetTab.id, { 
          url: 'https://www.zhipin.com/web/chat/index',
          active: true 
        })
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
      
      // Fetch chat users
      const response = await fetchChatUserList(targetTab.id, filterKeywords)
      if (response && response.users) {
        setChatUsers(response.users)
        toast.success(`找到 ${response.users.length} 个有新消息的用户`)
        
        // Download resumes for all users with new messages
        toast.info('开始下载简历...')
        const updatedUsers = await downloadResumesForUsers(targetTab.id, response.users, setChatUsers)
        
        // Show summary
        const successCount = updatedUsers.filter(u => u.status === '已下载简历').length
        const failedCount = updatedUsers.filter(u => u.status === '下载失败').length
        
        if (successCount > 0) {
          toast.success(`成功下载 ${successCount} 份简历`)
        }
        if (failedCount > 0) {
          toast.error(`${failedCount} 份简历下载失败`)
        }
      }
    }
  } catch (error) {
    console.error('Error fetching chat users:', error)
    toast.error('获取聊天用户失败', {
      description: '请确保在BOSS直聘聊天页面',
      duration: 4000,
    })
  } finally {
    setIsDownloadResumes(false)
  }
}

async function scanResumes(e: React.ChangeEvent<HTMLInputElement>,api:any, setResumeFiles: (value: (((prevState: ResumeFile[]) => ResumeFile[]) | ResumeFile[])) => void, setIsScanning: (value: (((prevState: boolean) => boolean) | boolean)) => void, fileInputRef: React.RefObject<HTMLInputElement | null>) {
  const files = e.target.files
  if(!files || files.length === 0) {
    setIsScanning(false)
    return;
  }
  const fileList: ResumeFile[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    // Skip directories, only process files
    if (file.size === 0) continue

    fileList.push({
      name: file.name,
      path: file.webkitRelativePath || file.name,
      size: file.size,
      lastModified: new Date(file.lastModified),
      file: file,
      tips:'待评估',
      isEvaluating: false
    })
  }

  if (fileList.length > 0) {
    toast.success(`扫描完成，找到 ${fileList.length} 个文件`)
  }

  setResumeFiles(fileList)
  // Start evaluation for all files
  for(let i = 0; i < fileList.length; i++) {
    if(globalShouldStopScanning){
      break;
    }
    await evalResume(fileList, i, setResumeFiles, api);
  }

  setIsScanning(false)
  // Reset the input so user can select the same folder again
  if (fileInputRef.current) {
    fileInputRef.current.value = ''
  }
}

let globalFilename = ''
browser.downloads.onDeterminingFilename.addListener((item,suggest) => {
  suggest({
    filename:globalFilename,
    conflictAction:'uniquify'
  })
});

async function evalResume(fileList: ResumeFile[],index:number,setResumeFiles: (value: (((prevState: ResumeFile[]) => ResumeFile[]) | ResumeFile[])) => void,api:any)  {
  const resumeFile = { ...fileList[index] }
  if (!resumeFile.file) {
    setResumeFiles(prevFiles => {
      const newFiles = [...prevFiles]
      newFiles[index] = {
        ...newFiles[index],
        isEvaluating: false,
        tips: '文件不可用'
      }
      return newFiles
    })
    toast.error('文件不可用', {
      description: '请重新选择文件夹',
      duration: 3000,
    })
    return
  }

  // Update status to evaluating
  setResumeFiles(prevFiles => {
    const newFiles = [...prevFiles]
    newFiles[index] = {
      ...newFiles[index],
      isEvaluating: true,
      tips: '评估中'
    }
    return newFiles
  })

  let fileDir = '';
  try{
    // Evaluate the resume
    const evaluation = await readFileAndEvaluate(resumeFile.file, api)
    // Update with evaluation results
    setResumeFiles(prevFiles => {
      const newFiles = [...prevFiles]
      newFiles[index] = {
        ...newFiles[index],
        evaluation: evaluation as ResumeEvaluation,
        isEvaluating: false,
        tips: '评估完成'
      }
      return newFiles
    })

    if(evaluation?.result){
      fileDir = 'eval_successes'
    }else{
      fileDir = 'eval_failed'
    }

  } catch (error) {
    fileDir = 'eval_error'

    setResumeFiles(prevFiles => {
      const newFiles = [...prevFiles]
      newFiles[index] = {
        ...newFiles[index],
        isEvaluating: false,
        tips: (error as Error).message
      }
      return newFiles
    })
  }

  try {
    // Create a blob URL from the file
    const blobUrl = URL.createObjectURL(resumeFile.file)

    globalFilename = `${fileDir}/${resumeFile.file.name}`;

    // Download the file to a "pass" subfolder
    await browser.downloads.download({
      url: blobUrl,
      filename: globalFilename,
      saveAs: false,
      conflictAction: 'uniquify'
    })

    // Clean up the blob URL
    URL.revokeObjectURL(blobUrl)

    console.log(`已保存推荐简历: ${resumeFile.name}`)

    toast.info('简历保存成功', {
      description: `已保存${resumeFile.name}的简历到eval_successes文件夹`,
      duration: 3000
    })

  } catch (downloadError) {
    console.error('保存简历失败:', downloadError)
    toast.error('保存简历失败', {
      description: `无法保存 ${resumeFile.name} 到 ${fileDir} 文件夹`,
      duration: 3000
    })
  }
}

function getErrorMessage(error:any):string {
  if(error instanceof ResumeEvaluatorError) {
    return error.error?getErrorMessage(error.error):error.message;
  }
  if(error instanceof Error) {
    return error.message;
  }
  return error.toString();
}

async function readFileAndEvaluate(file: File, apiSettings?: any): Promise<ResumeEvaluation | null> {
  try {
    // Create a resume evaluator instance
    const evaluator = createResumeEvaluatorFromSettings(apiSettings)
    
    // Show loading toast
    toast.info(`正在评估简历: ${file.name}`, {
      description: '请稍候，AI正在分析简历内容...',
      duration: 5000,
    })
    
    // Evaluate the resume
    const evaluation = await evaluator.evaluateResume(file, apiSettings)
    
    // Show success toast with basic info
    toast.success(`简历评估完成: ${file.name}`, {
      description: `${evaluation.result ? '推荐' : '不推荐'} | ${evaluation.isJavaDeveloper ? 'Java开发者' : '非Java开发者'}`,
      duration: 4000,
    })
    
    return evaluation
  } catch (error) {
    console.error('评估简历失败:', error)
    const message = getErrorMessage(error);
    toast.error(`评估失败: ${file.name}`, {
      description: message,
      duration: 4000,
    })
    throw error
  }
}

export function RecruitTab({}: RecruitTabProps) {
  const { system, api } = useSettings()
  const [filteredGeeks, setFilteredGeeks] = useState<Geek[]>([])
  const [chatUsers, setChatUsers] = useState<Geek[]>([])
  const [isFiltering, setIsFiltering] = useState(false)
  const [isDownloadResumes, setIsDownloadResumes] = useState(false)
  const [resumeFiles, setResumeFiles] = useState<ResumeFile[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
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
                  <Badge className="text-xs bg-gray-100 text-gray-600 border-0">v1.0.1</Badge>
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
                <>
                  <Button
                    size="lg"
                    onClick={() => handleFilterGeeks(system.filterKeywords || 'Java', setIsFiltering, setFilteredGeeks, setChatUsers, setResumeFiles)}
                    className="w-full bg-[#00BEBD] hover:bg-[#00BEBD]/90 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
                  >
                    <Hand className="h-4 w-4 mr-2" />
                    一键打招呼
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => handleStopGreeting(setIsFiltering)}
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
            
            {/* Chat Users Button */}
            <div className="mt-4">
              <Button
                size="lg"
                onClick={() => handleNewChatUsersResume(system.filterKeywords || 'Java', setIsDownloadResumes, setChatUsers, setFilteredGeeks, setResumeFiles)}
                disabled={isDownloadResumes}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
              >
                <Download className="h-4 w-4 mr-2" />
                {isDownloadResumes ? '正在下载简历...' : '一键下载简历'}
              </Button>
            </div>
            
            {/* Evaluate Resume Button */}
            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                // @ts-ignore - webkitdirectory is not in TypeScript types but works in browsers
                multiple
                onChange={(e) => scanResumes(e,api, setResumeFiles, setIsScanning, fileInputRef)}
                style={{ display: 'none' }}
              />
              {isScanning?(
                  <Button
                      size="lg"
                      onClick={() => {
                        globalShouldStopScanning = true;
                        setIsScanning(false);
                      }}
                      className="w-full bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    正在评估简历
                  </Button>
              ):(
                  <Button
                      size="lg"
                      onClick={() => {
                        globalShouldStopScanning = false;
                        clearList(setFilteredGeeks, setChatUsers, setResumeFiles)
                        setIsScanning(true)
                        fileInputRef.current?.click()
                      }}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    评估简历
                  </Button>
              )}

              <p className="text-xs text-gray-500 mt-2">
                点击选择简历文件夹进行评估
              </p>
            </div>
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
                      {geek.matchedKeywords && (
                        <Badge className="text-xs bg-orange-100 text-orange-700 border-0">
                          {geek.matchedKeywords}
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
        
        {/* Chat Users Results */}
        {chatUsers.length > 0 && (
          <div className="space-y-4">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">有新消息的用户</h3>
                  <p className="text-xs text-gray-500">
                    共找到 {chatUsers.length} 位用户有新消息
                  </p>
                </div>
              </div>
            </div>
            
            {/* Chat Users Grid */}
            <div className="grid gap-3">
              {chatUsers.map((user, index) => (
                <div 
                  key={index} 
                  className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-4 hover:border-purple-300 hover:shadow-md transition-all duration-200"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-sm font-semibold text-purple-600">
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-gray-800">{user.name}</h4>
                        <p className="text-xs text-gray-600 line-clamp-1">{user.content}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {user.matchedKeywords && (
                        <Badge className="text-xs bg-purple-100 text-purple-700 border-0">
                          {user.matchedKeywords}
                        </Badge>
                      )}
                      {user.status && (
                        <Badge className="text-xs bg-red-100 text-red-700 border-0">
                          {user.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Resume Files List */}
        {resumeFiles.length > 0 && (
          <div className="space-y-4">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">扫描结果</h3>
                  <p className="text-xs text-gray-500">
                    共找到 {resumeFiles.length} 个文件
                  </p>
                </div>
              </div>
            </div>
            
            {/* Files List */}
            <div className="grid gap-2">
              {resumeFiles.map((file, index) => (
                <div 
                  key={index} 
                  className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-3 hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                >
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-8 w-8 rounded bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-800 truncate" title={file.evaluation?.name || file.name}>{file.evaluation?file.evaluation.name:file.name}</h4>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB • {file.lastModified.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs">
                      {file.isEvaluating ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                          <span className="text-blue-600">评估中</span>
                        </>
                      ) : file.tips === '评估完成' ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span className="text-green-600">{file.tips}</span>
                        </>
                      ) : file.tips === '文件不可用' || file.tips === '下载失败' ? (
                        <>
                          <AlertCircle className="h-3 w-3 text-red-600" />
                          <span className="text-red-600">{file.tips}</span>
                        </>
                      ) : (
                        <span className="text-gray-500">{file.tips}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Show evaluation results if available */}
                  {file.evaluation && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">评估结果</span>
                        <Badge className={`text-xs ${file.evaluation.result ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {file.evaluation.result ? '推荐' : '不推荐'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">类型</span>
                        <Badge className={`text-xs ${file.evaluation.isJavaDeveloper ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {file.evaluation.isJavaDeveloper ? 'Java开发者' : '非Java开发者'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">年龄</span>
                        <span className="text-xs font-medium">{file.evaluation.age}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">经验</span>
                        <span className="text-xs font-medium">{file.evaluation.experience}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">学历</span>
                        <span className="text-xs font-medium">{file.evaluation.education}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">学校</span>
                        <span className="text-xs font-medium">{file.evaluation.school}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">稳定性</span>
                        <span className="text-xs font-medium">{file.evaluation.stability}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">技术能力</span>
                        <span className="text-xs font-medium">{file.evaluation.techSkills}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">行业经验</span>
                        <span className="text-xs font-medium">{file.evaluation.industryExp}</span>
                      </div>
                      
                      {file.evaluation.summary && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-1">评估总结</p>
                          <p className="text-xs text-gray-700">{file.evaluation.summary}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}