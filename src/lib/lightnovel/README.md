# 轻小说下载模块

## 项目结构

```
src/lib/lightnovel/
├── types.ts           # 类型定义
├── url-parser.ts      # URL 和 ID 解析
├── html-cleaner.ts    # HTML 内容清理
├── bili-parser.ts     # 哔哩轻小说解析器
├── wenku-parser.ts    # 轻小说文库解析器
├── downloader.ts      # 下载管理器
├── hooks.ts           # React hooks
└── README.md          # 本文件

src/tabs/
├── lightnovel.tsx     # 主页面组件
└── lightnovel/
    └── components.tsx # UI 组件库
```

## 模块说明

### types.ts
定义所有类型接口，包括：
- `Chapter`: 章节信息
- `Volume`: 卷信息
- `NovelInfo`: 小说完整信息
- `DownloadProgress`: 下载进度
- `ParseResult`: 解析结果

### url-parser.ts
处理 URL 和 ID 的解析：
- `extractBiliNovelId()`: 提取哔哩轻小说 ID
- `extractWenkuNovelId()`: 提取轻小说文库 ID
- `resolveUrl()`: 解析相对 URL

### html-cleaner.ts
HTML 内容清理工具：
- `cleanBiliContent()`: 清理哔哩轻小说内容
- `cleanWenkuContent()`: 清理轻小说文库内容
- `extractChapterContent()`: 根据来源提取章节内容

### bili-parser.ts
哔哩轻小说解析器：
- `parseBilibiliNovel()`: 完整解析流程
- 内部函数：获取信息、获取目录

### wenku-parser.ts
轻小说文库解析器：
- `parseWenkuNovel()`: 完整解析流程
- 内部函数：获取信息、获取目录

### downloader.ts
下载管理器：
- `calculateTotalChapters()`: 计算总章节数
- `downloadNovelChapters()`: 下载章节
- 内部函数：单章下载、错误处理

### hooks.ts
React 自定义 hooks：
- `useNovelParser()`: 解析 hook
- `useNovelDownloader()`: 下载 hook
- `useVolumeSelection()`: 卷选择 hook

### components.tsx
UI 组件库：
- `SourceSelector`: 来源选择器
- `SearchInput`: 搜索输入框
- `UsageExample`: 使用示例
- `NovelInfoCard`: 小说信息卡片
- `VolumeSelector`: 卷选择器
- `ChapterRangeInput`: 章节范围输入
- `DownloadProgressBar`: 下载进度条
- `ImportantNotice`: 重要提示

### lightnovel.tsx
主页面组件，负责：
- 状态管理
- 事件处理
- 页面布局

## 设计原则

### 1. 关注点分离
- **类型定义**: 集中在 `types.ts`
- **业务逻辑**: 分散在各个解析器和工具
- **UI 组件**: 独立在 `components.tsx`
- **状态管理**: 通过 hooks 封装

### 2. 低耦合
- 各模块独立，可单独测试
- 通过类型接口进行通信
- 避免循环依赖

### 3. 高内聚
- 相关功能聚集在一起
- 每个模块职责单一
- 易于维护和扩展

### 4. 可维护性
- 清晰的文件结构
- 详细的中文注释
- 统一的命名规范
- 类型安全

## 使用示例

### 解析小说
```typescript
const { parseNovel, isLoading } = useNovelParser()
const novelInfo = await parseNovel("123456", "bili")
```

### 下载小说
```typescript
const { downloadNovel, downloadProgress } = useNovelDownloader()
await downloadNovel(novelInfo, selectedVolumes, 1, 100, true)
```

### 管理卷选择
```typescript
const { selectedVolumes, toggleVolume, toggleAllVolumes } = useVolumeSelection()
toggleVolume(0)  // 切换第一卷
toggleAllVolumes(novelInfo.volumes.length)  // 全选
```

## 扩展指南

### 添加新的小说来源
1. 在 `src/lib/lightnovel/` 中创建 `xxx-parser.ts`
2. 实现 `parseXxxNovel()` 函数
3. 在 `hooks.ts` 中的 `useNovelParser` 添加条件
4. 在 `components.tsx` 中的 `SourceSelector` 添加按钮

### 修改 HTML 清理规则
编辑 `html-cleaner.ts` 中的 `cleanBiliContent()` 或 `cleanWenkuContent()`

### 添加新的 UI 组件
在 `components.tsx` 中添加新组件，然后在 `lightnovel.tsx` 中使用

## 性能优化

- 下载速率限制：300ms/章
- 错误重试：单章失败不影响其他章节
- 进度实时更新：用户可随时了解下载状态

## 错误处理

- 网络错误：显示具体错误信息
- 解析错误：提示用户检查输入
- 下载错误：记录失败章节，继续下载其他章节
