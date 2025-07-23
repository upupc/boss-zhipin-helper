import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSettings } from '@/hooks/use-settings'
import { useTheme } from '@/hooks/use-theme'
import { RecruitTab } from '@/components/tabs/recruit-tab'
import { ChatTab } from '@/components/tabs/chat-tab'
import { SettingsTab } from '@/components/tabs/settings-tab'
import {
  Heart,
  Users,
  MessageSquare,
  Settings
} from 'lucide-react'

function App() {
  const { appearance, ui, loading, updateAppearance, updateUI } = useSettings()
  useTheme({
    theme: appearance.theme,
    onThemeChange: (theme) => updateAppearance({ theme })
  })

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
              智能牛马助手
            </h1>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-[#00BEBD] rounded-full animate-pulse"></span>
              你是否经常抱怨会议太多，杂事太多，没时间写代码，来试试本插件吧，愿天下牛马只用写代码
            </p>
          </div>
          <Badge variant="outline" className="text-xs border-[#00BEBD]/30 text-[#00BEBD]">
            Pro
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={ui.activeTab} onValueChange={(value) => updateUI({ activeTab: value })} className="h-full flex flex-col gap-0">
          <TabsList className="h-auto rounded-none border-b bg-white/50 p-0 w-full">
            <TabsTrigger
              value="home"
              className="data-[state=active]:after:bg-[#00BEBD] data-[state=active]:text-[#00BEBD] relative rounded-none py-2 px-4 flex items-center gap-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none flex-1 text-gray-600"
            >
              <Users className="h-4 w-4" />
              招聘
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
            <RecruitTab />
          </TabsContent>

          <TabsContent value="chat" className="flex-1 overflow-hidden flex flex-col">
            <ChatTab />
          </TabsContent>

          <TabsContent value="settings" className="flex-1 overflow-hidden">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App