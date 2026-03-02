# 存储系统迁移检查清单

## 📋 迁移前准备

### 理解新系统
- [ ] 阅读 `README.md` - 快速参考
- [ ] 阅读 `MIGRATION.md` - 迁移指南
- [ ] 阅读 `ARCHITECTURE.md` - 架构文档
- [ ] 查看 `examples.ts` - 使用示例
- [ ] 理解键名规范
- [ ] 理解 API 结构

### 备份数据
- [ ] 备份当前 localStorage 数据
- [ ] 备份当前 chrome.storage.local 数据
- [ ] 记录当前配置

## 🔄 迁移步骤

### 第 1 步：替换导入

#### 文件：所有使用存储的文件

**检查项**:
- [ ] 找到所有 `import { LOCAL_STORAGE_KEYS, ... } from "./local-storage-keys"`
- [ ] 找到所有 `import { STORAGE_KEYS } from "./storage"`
- [ ] 找到所有 `import { ThemeManager } from "./theme-manager"`
- [ ] 找到所有 `import { ShortcutsManager } from "./shortcuts-manager"`
- [ ] 找到所有 `import { UISettingsManager } from "./ui-settings-manager"`
- [ ] 找到所有 `import { AppStateManager } from "./app-state-manager"`
- [ ] 找到所有 `import { getActiveState, ... } from "./content-script-storage-helper"`

**替换为**:
```typescript
import { 
  STORAGE_KEYS_LOCAL,
  STORAGE_KEYS_CHROME,
  ThemeStorage,
  UIStorage,
  ShortcutsStorage,
  AppStorage,
  ActiveStorage,
} from "@/lib/storage";
```

### 第 2 步：替换 localStorage 操作

#### 主题管理

**旧方式**:
```typescript
import { LOCAL_STORAGE_KEYS, getLocalStorage, setLocalStorage } from "./local-storage-keys";
import { ThemeManager } from "./theme-manager";

const theme = getLocalStorage(LOCAL_STORAGE_KEYS.THEME.PLUGIN, "system");
setLocalStorage(LOCAL_STORAGE_KEYS.THEME.PLUGIN, "dark");
ThemeManager.setPluginTheme("dark");
```

**新方式**:
```typescript
import { ThemeStorage } from "@/lib/storage";

const theme = ThemeStorage.getPluginTheme();
ThemeStorage.setPluginTheme("dark");
```

**检查项**:
- [ ] 替换所有 `ThemeManager.getThemeConfig()` → `{ plugin: ThemeStorage.getPluginTheme(), reader: ThemeStorage.getReaderTheme() }`
- [ ] 替换所有 `ThemeManager.setPluginTheme()` → `ThemeStorage.setPluginTheme()`
- [ ] 替换所有 `ThemeManager.setReaderTheme()` → `ThemeStorage.setReaderTheme()`
- [ ] 替换所有 `ThemeManager.initializeTheme()` → 删除（不再需要）

#### UI 设置

**旧方式**:
```typescript
import { UISettingsManager } from "./ui-settings-manager";

const settings = UISettingsManager.getUISettings();
UISettingsManager.setReaderFontSize(14);
```

**新方式**:
```typescript
import { UIStorage } from "@/lib/storage";

const settings = UIStorage.getAll();
UIStorage.setReaderFontSize(14);
```

**检查项**:
- [ ] 替换所有 `UISettingsManager.getUISettings()` → `UIStorage.getAll()`
- [ ] 替换所有 `UISettingsManager.setReaderVisible()` → `UIStorage.setReaderVisible()`
- [ ] 替换所有 `UISettingsManager.setReaderPosition()` → `UIStorage.setReaderPosition()`
- [ ] 替换所有 `UISettingsManager.setReaderFontSize()` → `UIStorage.setReaderFontSize()`
- [ ] 替换所有 `UISettingsManager.setReaderLineHeight()` → `UIStorage.setReaderLineHeight()`
- [ ] 替换所有 `UISettingsManager.setDefaultShow()` → `UIStorage.setDefaultShow()`
- [ ] 替换所有 `UISettingsManager.setPageSize()` → `UIStorage.setPageSize()`

#### 快捷键管理

**旧方式**:
```typescript
import { ShortcutsManager } from "./shortcuts-manager";

const shortcuts = ShortcutsManager.getShortcuts();
ShortcutsManager.setShortcuts(newShortcuts);
```

**新方式**:
```typescript
import { ShortcutsStorage } from "@/lib/storage";

const shortcuts = ShortcutsStorage.getConfig();
ShortcutsStorage.setConfig(newShortcuts);
```

**检查项**:
- [ ] 替换所有 `ShortcutsManager.getShortcuts()` → `ShortcutsStorage.getConfig()`
- [ ] 替换所有 `ShortcutsManager.setShortcuts()` → `ShortcutsStorage.setConfig()`
- [ ] 替换所有 `ShortcutsManager.resetShortcuts()` → 删除（使用 `setConfig(DEFAULT_SHORTCUTS)`）

#### 应用状态

**旧方式**:
```typescript
import { AppStateManager } from "./app-state-manager";

const lastVisit = AppStateManager.getLastVisit();
AppStateManager.updateLastVisit();
```

**新方式**:
```typescript
import { AppStorage } from "@/lib/storage";

const lastVisit = AppStorage.getLastVisit();
AppStorage.setLastVisit(Date.now());
```

**检查项**:
- [ ] 替换所有 `AppStateManager.getAppState()` → `{ lastVisit: AppStorage.getLastVisit(), version: AppStorage.getVersion() }`
- [ ] 替换所有 `AppStateManager.updateLastVisit()` → `AppStorage.setLastVisit(Date.now())`
- [ ] 替换所有 `AppStateManager.getLastVisit()` → `AppStorage.getLastVisit()`
- [ ] 替换所有 `AppStateManager.getVersion()` → `AppStorage.getVersion()`

### 第 3 步：替换 chrome.storage.local 操作

#### 活跃状态

**旧方式**:
```typescript
import { getActiveState, setActiveBookId, ... } from "./content-script-storage-helper";
import { STORAGE_KEYS } from "./storage";

const data = await getActiveState();
await setActiveBookId("book-123");
await chrome.storage.local.get([STORAGE_KEYS.ACTIVE_BOOK_ID]);
```

**新方式**:
```typescript
import { ActiveStorage } from "@/lib/storage";

const data = await ActiveStorage.getAll();
await ActiveStorage.setBookId("book-123");
const bookId = await ActiveStorage.getBookId();
```

**检查项**:
- [ ] 替换所有 `getActiveState()` → `ActiveStorage.getAll()`
- [ ] 替换所有 `setActiveBookId()` → `ActiveStorage.setBookId()`
- [ ] 替换所有 `setActiveCurrentIndex()` → `ActiveStorage.setChapterIndex()`
- [ ] 替换所有 `setActiveCurrentScroll()` → `ActiveStorage.setScrollPosition()`
- [ ] 替换所有 `setActiveChapters()` → `ActiveStorage.setChapters()`
- [ ] 替换所有 `chrome.storage.local.get([STORAGE_KEYS.ACTIVE_*])` → `ActiveStorage.get*()`
- [ ] 替换所有 `chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_*]: ... })` → `ActiveStorage.set*()`

### 第 4 步：更新类型定义

**检查项**:
- [ ] 检查所有类型定义是否使用了旧的存储键
- [ ] 更新所有类型导入
- [ ] 验证类型兼容性

### 第 5 步：修复编译错误

**检查项**:
- [ ] 运行 TypeScript 编译器
- [ ] 修复所有类型错误
- [ ] 修复所有导入错误
- [ ] 修复所有引用错误

## ✅ 验证步骤

### 功能验证

**检查项**:
- [ ] 主题切换功能正常
- [ ] UI 设置保存和加载正常
- [ ] 快捷键配置保存和加载正常
- [ ] 应用状态保存和加载正常
- [ ] 活跃书籍状态保存和加载正常
- [ ] 跨上下文通信正常（popup ↔ content script）

### 类型检查

**检查项**:
- [ ] 运行 `tsc --noEmit` 无错误
- [ ] 所有 API 调用都有正确的类型
- [ ] 没有 `any` 类型的滥用

### 错误处理

**检查项**:
- [ ] 所有异步操作都有错误处理
- [ ] 所有 API 调用都返回有效值
- [ ] 没有 `null` 或 `undefined` 的意外情况

### 性能测试

**检查项**:
- [ ] 应用启动时间正常
- [ ] 存储操作响应时间正常
- [ ] 没有内存泄漏

## 🧹 清理步骤

### 删除旧文件

**检查项**:
- [ ] 删除 `src/lib/local-storage-keys.ts`
- [ ] 删除 `src/lib/storage.ts`
- [ ] 删除 `src/lib/theme-manager.ts`
- [ ] 删除 `src/lib/shortcuts-manager.ts`
- [ ] 删除 `src/lib/ui-settings-manager.ts`
- [ ] 删除 `src/lib/app-state-manager.ts`
- [ ] 删除 `src/lib/content-script-storage-helper.ts`
- [ ] 删除 `src/lib/storage-bootstrap.ts`

### 更新导入路径

**检查项**:
- [ ] 搜索所有旧导入路径
- [ ] 确保没有遗漏的导入
- [ ] 验证所有导入都已更新

### 清理注释

**检查项**:
- [ ] 删除所有关于旧系统的注释
- [ ] 更新文档中的示例
- [ ] 更新 README 中的说明

## 📊 最终验证

### 完整性检查

**检查项**:
- [ ] 所有存储操作都使用新 API
- [ ] 没有直接访问 `localStorage` 或 `chrome.storage.local`
- [ ] 所有键名都来自 `STORAGE_KEYS_LOCAL` 或 `STORAGE_KEYS_CHROME`
- [ ] 所有异步操作都使用 `await`
- [ ] 所有同步操作都不使用 `await`

### 功能完整性

**检查项**:
- [ ] 所有用户配置都能正确保存和加载
- [ ] 所有活跃状态都能正确保存和加载
- [ ] 所有跨上下文通信都正常工作
- [ ] 所有错误处理都正确

### 代码质量

**检查项**:
- [ ] 代码风格一致
- [ ] 没有 linting 错误
- [ ] 没有 TypeScript 错误
- [ ] 代码可读性好

## 📝 迁移记录

### 迁移日期
- 开始日期: ___________
- 完成日期: ___________

### 迁移统计
- 修改文件数: ___________
- 删除文件数: ___________
- 新增文件数: ___________
- 修改行数: ___________

### 问题记录

| 问题 | 解决方案 | 状态 |
|------|--------|------|
| | | |
| | | |
| | | |

### 备注

___________________________________________________________________________

___________________________________________________________________________

___________________________________________________________________________

## ✨ 迁移完成

- [ ] 所有检查项都已完成
- [ ] 所有测试都已通过
- [ ] 代码已提交
- [ ] 文档已更新
- [ ] 团队已通知

**迁移完成时间**: ___________

**迁移负责人**: ___________

**审核人**: ___________
