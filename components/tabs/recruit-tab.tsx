import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Hand, Square, Users, MessageCircle, FileText } from 'lucide-react'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { useSettings } from '@/hooks/use-settings'

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
  setFilteredGeeks: (geeks: Geek[]) => void
) => {
  setIsFiltering(true)
  setFilteredGeeks([])
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
  setIsFetchingChatUsers: (value: boolean) => void,
  setChatUsers: (users: Geek[]) => void
) => {
  setIsFetchingChatUsers(true)
  setChatUsers([])
  
  try {
    const targetTab = await createOrGetBossTab()
    
    if (targetTab && targetTab.id) {
      const loginStatusResponse = await checkLoginStatus(targetTab.id)
      
      if (!loginStatusResponse.isLoggedIn) {
        toast.error('请先登录', {
          description: '请先登录BOSS直聘后再使用此功能',
          duration: 4000,
        })
        setIsFetchingChatUsers(false)
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
    setIsFetchingChatUsers(false)
  }
}

export function RecruitTab({}: RecruitTabProps) {
  const { system } = useSettings()
  const [filteredGeeks, setFilteredGeeks] = useState<Geek[]>([])
  const [chatUsers, setChatUsers] = useState<Geek[]>([])
  const [isFiltering, setIsFiltering] = useState(false)
  const [isFetchingChatUsers, setIsFetchingChatUsers] = useState(false)
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
                <>
                  <Button
                    size="lg"
                    onClick={() => handleFilterGeeks(system.filterKeywords || 'Java', setIsFiltering, setFilteredGeeks)}
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
                onClick={() => handleNewChatUsersResume(system.filterKeywords || 'Java', setIsFetchingChatUsers, setChatUsers)}
                disabled={isFetchingChatUsers}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {isFetchingChatUsers ? '正在获取聊天用户...' : '获取有新消息的用户'}
              </Button>
            </div>
            
            {/* Evaluate Resume Button */}
            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                // @ts-ignore - webkitdirectory is not in TypeScript types but works in browsers
                webkitdirectory=""
                directory=""
                multiple
                onChange={(e) => {
                  const files = e.target.files
                  if (files && files.length > 0) {
                    const fileList: ResumeFile[] = []
                    
                    for (let i = 0; i < files.length; i++) {
                      const file = files[i]
                      // Skip directories, only process files
                      if (file.size === 0) continue
                      
                      fileList.push({
                        name: file.name,
                        path: file.webkitRelativePath || file.name,
                        size: file.size,
                        lastModified: new Date(file.lastModified)
                      })
                    }
                    
                    if (fileList.length > 0) {
                      toast.success(`扫描完成，找到 ${fileList.length} 个文件`)
                    }
                    
                    setResumeFiles(fileList)
                  }
                  setIsScanning(false)
                  // Reset the input so user can select the same folder again
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                style={{ display: 'none' }}
              />
              <Button
                size="lg"
                onClick={() => {
                  setIsScanning(true)
                  setResumeFiles([])
                  fileInputRef.current?.click()
                }}
                disabled={isScanning}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition-all duration-200 border-0"
              >
                <FileText className="h-4 w-4 mr-2" />
                {isScanning ? '正在选择文件夹...' : '评估简历'}
              </Button>
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
                        <h4 className="font-medium text-sm text-gray-800 truncate">{file.name}</h4>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB • {file.lastModified.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => {
                        toast.info('评估功能开发中', {
                          description: '简历评估功能即将推出',
                          duration: 3000,
                        })
                      }}
                    >
                      评估
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}