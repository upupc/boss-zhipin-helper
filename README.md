# Boss直聘助手 (Boss Zhipin Helper)

一个强大的浏览器扩展，为Boss直聘招聘平台提供自动化候选人筛选和打招呼功能，并集成了AI聊天助手。

## ✨ 功能特性

### 🎯 智能候选人筛选
- 自动加载并筛选最多200个候选人
- 支持自定义关键词过滤（支持多个关键词，逗号分隔）
- 智能识别可联系的候选人（带有"打招呼"按钮）
- 实时显示筛选结果和状态

### 🤖 自动打招呼系统
- 模拟人类行为的随机延迟（1-5秒）
- 平滑滚动到按钮位置再点击
- 实时状态跟踪（待处理/已打招呼/失败）
- 可随时停止自动打招呼进程

### 💬 AI聊天助手
- 集成多种AI模型（Claude、GPT-4、Gemini等）
- 支持流式响应
- 可自定义模型参数（温度、最大令牌数）
- 通过OpenRouter API提供服务

### ⚙️ 个性化设置
- 主题切换（系统/浅色/深色）
- 通知偏好设置
- 自动同步间隔配置
- API密钥和模型选择

## 🚀 快速开始

### 前置要求

- Node.js 18+
- pnpm 9.10.0+
- 现代浏览器（Chrome、Firefox、Edge、Safari）

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# Chrome（默认）
pnpm dev

# 其他浏览器
pnpm dev:firefox
pnpm dev:edge
pnpm dev:safari
```

### 生产构建

```bash
# Chrome（默认）
pnpm build

# 其他浏览器
pnpm build:firefox
pnpm build:edge
pnpm build:safari
```

### 打包扩展

```bash
# 所有浏览器
pnpm zip

# 特定浏览器
pnpm zip:chrome
pnpm zip:firefox
pnpm zip:edge
pnpm zip:safari
```

## 📁 项目结构

```
boss-zhipin-helper/
├── entrypoints/
│   ├── background.ts      # 后台服务脚本
│   ├── content.ts         # 内容注入脚本
│   └── sidepanel/         # 侧边栏UI应用
│       ├── main.tsx       # React入口
│       ├── App.tsx        # 主应用组件
│       └── index.html     # HTML模板
├── components/
│   ├── tabs/              # 标签页组件
│   │   ├── home-tab.tsx   # 主页（筛选和打招呼）
│   │   ├── chat-tab.tsx   # AI聊天界面
│   │   └── settings-tab.tsx # 设置页面
│   └── ui/                # shadcn/ui组件
├── hooks/
│   ├── use-theme.ts       # 主题管理
│   └── use-settings.ts    # 设置管理
├── lib/
│   ├── openrouter-api.ts  # OpenRouter API集成
│   └── utils.ts           # 工具函数
├── assets/                # 样式和静态资源
├── public/                # 扩展图标
└── wxt.config.ts          # WXT配置
```

## 🔧 配置说明

### API配置

使用AI聊天功能需要配置OpenRouter API密钥：

1. 访问 [OpenRouter](https://openrouter.ai/) 获取API密钥
2. 在扩展设置页面中填入API密钥
3. 选择偏好的AI模型

### 筛选关键词配置

在设置页面配置筛选关键词，多个关键词用逗号分隔，例如：
```
Java,Spring,微服务,后端开发
```

## 🔐 安全说明

- API密钥仅存储在本地浏览器存储中
- 扩展权限严格限制在必要范围内
- 所有外部API调用都经过错误处理
- 不会收集或上传任何用户数据

## 🛠️ 技术栈

- **框架**: [WXT](https://wxt.dev/) - 现代化的浏览器扩展开发框架
- **UI框架**: React 19 + TypeScript
- **样式**: Tailwind CSS 4.0 + shadcn/ui
- **AI集成**: OpenAI SDK + OpenRouter API
- **构建工具**: Vite + TypeScript

## 📝 开发注意事项

1. **组件开发**: 遵循shadcn/ui的模式保持一致性
2. **状态管理**: 使用`useSettings` hook管理持久化数据
3. **主题支持**: 使用CSS变量配合oklch色彩空间
4. **扩展API**: 使用WXT的自动导入（无需手动导入`browser`）
5. **错误处理**: 始终优雅处理API失败并给予用户反馈
6. **模拟人类行为**: 在自动化操作中添加随机延迟避免检测

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

在提交PR前，请确保：
- 代码通过类型检查：`pnpm compile`
- 遵循现有的代码风格和模式
- 测试在目标浏览器中的功能

## 📄 许可证

本项目基于 MIT 许可证开源。

## 🙏 致谢

- [WXT](https://wxt.dev/) - 优秀的浏览器扩展开发框架
- [shadcn/ui](https://ui.shadcn.com/) - 精美的UI组件库
- [OpenRouter](https://openrouter.ai/) - 统一的AI模型API服务