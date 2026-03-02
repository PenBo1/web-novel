# 存储系统迁移指南

## 概述

本文档说明如何从旧的存储系统迁移到新的统一存储系统。

## 新存储系统特点

✅ **统一的键名规范** - 所有键名集中定义在 `constants.ts`
✅ **类型安全** - 提供类型化的 API
✅ **易于维护** - 分模块管理，职责清晰
✅ **完整的默认值** - 所有存储都有明确的默认值
✅ **便捷的 API** - 提供高级 API（如 `ThemeStorage.getPluginTheme()`）

## 迁移步骤

### 1. 替换导入

**旧方式**:
```typescript
import { LOCAL_STORAGE_KEYS, getLocalStorage, setLocalStorage } from "./local-storage-keys";
import { STORAGE_KEYS } from "./storage";
```

**新方式**:
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

### 2. 替换 localStorage 操作

**旧方式**:
```typescript
const theme = getLocalStorage(LOCAL_STORAGE_KEYS.THEME.PLUGIN, "system");
setLocalStorage(LOCAL_STORAGE_KEYS.THEME.PLUGIN, "dark");
```

**新方式**:
```typescript
const theme = ThemeStorage.getPluginTheme();
ThemeStorage.setPluginTheme("dark");
```

### 3. 替换 chrome.storage.local 操作

**旧方式**:
```typescript
const data = await chrome.storage.local.get([STORAGE_KEYS.ACTIVE_BOOK_ID]);
await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_BOOK_ID]: bookId });
```

**新方式**:
```typescript
const bookId = await ActiveStorage.getBookId();
await ActiveStorage.setBookId(bookId);
```

## 模块对应关系

| 旧模块 | 新模块 | 说明 |
|--------|--------|------|
| `local-storage-keys.ts` | `storage/constants.ts` + `storage/local-storage.ts` | 键定义 + 操作 API |
| `storage.ts` | `storage/chrome-storage.ts` | chrome.storage 操作 |
| `theme-manager.ts` | `storage/local-storage.ts` (ThemeStorage) | 主题管理 |
| `shortcuts-manager.ts` | `storage/local-storage.ts` (ShortcutsStorage) | 快捷键管理 |
| `ui-settings-manager.ts` | `storage/local-storage.ts` (UIStorage) | UI 设置管理 |
| `app-state-manager.ts` | `storage/local-storage.ts` (AppStorage) | 应用状态管理 |
| `content-script-storage-helper.ts` | `storage/chrome-storage.ts` (ActiveStorage) | 活跃状态管理 |

## 键名对应关系

### localStorage 键

| 旧键 | 新键 | 位置 |
|------|------|------|
| `Web-Novel:theme:plugin` | `STORAGE_KEYS_LOCAL.THEME.PLUGIN` | `constants.ts` |
| `Web-Novel:theme:reader` | `STORAGE_KEYS_LOCAL.THEME.READER` | `constants.ts` |
| `Web-Novel:shortcuts:config` | `STORAGE_KEYS_LOCAL.SHORTCUTS.CONFIG` | `constants.ts` |
| `Web-Novel:ui:reader-visible` | `STORAGE_KEYS_LOCAL.UI.READER_VISIBLE` | `constants.ts` |
| `Web-Novel:ui:reader-position` | `STORAGE_KEYS_LOCAL.UI.READER_POSITION` | `constants.ts` |
| `Web-Novel:ui:reader-font-size` | `STORAGE_KEYS_LOCAL.UI.READER_FONT_SIZE` | `constants.ts` |
| `Web-Novel:ui:reader-line-height` | `STORAGE_KEYS_LOCAL.UI.READER_LINE_HEIGHT` | `constants.ts` |
| `Web-Novel:ui:default-show` | `STORAGE_KEYS_LOCAL.UI.DEFAULT_SHOW` | `constants.ts` |
| `Web-Novel:ui:page-size` | `STORAGE_KEYS_LOCAL.UI.PAGE_SIZE` | `constants.ts` |
| `Web-Novel:app:last-visit` | `STORAGE_KEYS_LOCAL.APP.LAST_VISIT` | `constants.ts` |
| `Web-Novel:app:version` | `STORAGE_KEYS_LOCAL.APP.VERSION` | `constants.ts` |

### chrome.storage.local 键

| 旧键 | 新键 | 位置 |
|------|------|------|
| `activeBookId` | `STORAGE_KEYS_CHROME.ACTIVE.BOOK_ID` | `constants.ts` |
| `activeCurrentIndex` | `STORAGE_KEYS_CHROME.ACTIVE.CHAPTER_INDEX` | `constants.ts` |
| `activeCurrentScroll` | `STORAGE_KEYS_CHROME.ACTIVE.SCROLL_POSITION` | `constants.ts` |
| `activeChapters` | `STORAGE_KEYS_CHROME.ACTIVE.CHAPTERS` | `constants.ts` |

## 使用示例

### 主题管理

```typescript
import { ThemeStorage } from "@/lib/storage";

// 获取主题
const pluginTheme = ThemeStorage.getPluginTheme();
const readerTheme = ThemeStorage.getReaderTheme();

// 设置主题
ThemeStorage.setPluginTheme("dark");
ThemeStorage.setReaderTheme("light");
```

### UI 设置

```typescript
import { UIStorage } from "@/lib/storage";

// 获取所有 UI 设置
const settings = UIStorage.getAll();

// 获取单个设置
const fontSize = UIStorage.getReaderFontSize();
const position = UIStorage.getReaderPosition();

// 设置单个值
UIStorage.setReaderFontSize(14);
UIStorage.setReaderPosition("top");
```

### 活跃状态

```typescript
import { ActiveStorage } from "@/lib/storage";

// 获取活跃状态
const bookId = await ActiveStorage.getBookId();
const chapterIndex = await ActiveStorage.getChapterIndex();
const scrollPosition = await ActiveStorage.getScrollPosition();

// 设置活跃状态
await ActiveStorage.setBookId("book-123");
await ActiveStorage.setChapterIndex(5);
await ActiveStorage.setScrollPosition(100);

// 获取所有活跃状态
const activeState = await ActiveStorage.getAll();

// 清除活跃状态
await ActiveStorage.clear();
```

### 快捷键配置

```typescript
import { ShortcutsStorage } from "@/lib/storage";

// 获取快捷键配置
const shortcuts = ShortcutsStorage.getConfig();

// 设置快捷键配置
ShortcutsStorage.setConfig([
  { id: "toggleReader", label: "显示/隐藏阅读条", keys: ["Alt", "C"] },
  // ...
]);
```

### 应用状态

```typescript
import { AppStorage } from "@/lib/storage";

// 获取最后访问时间
const lastVisit = AppStorage.getLastVisit();

// 更新最后访问时间
AppStorage.setLastVisit(Date.now());

// 获取版本
const version = AppStorage.getVersion();

// 设置版本
AppStorage.setVersion("0.0.2");
```

## 数据导出和清除

```typescript
import { 
  exportLocalStorage, 
  clearAllLocalStorage,
  exportChromeStorage,
  clearAllChromeStorage,
} from "@/lib/storage";

// 导出 localStorage 数据
const localData = exportLocalStorage();
console.log(localData);

// 清除所有 localStorage 数据
clearAllLocalStorage();

// 导出 chrome.storage.local 数据
const chromeData = await exportChromeStorage();
console.log(chromeData);

// 清除所有 chrome.storage.local 数据
await clearAllChromeStorage();
```

## 注意事项

1. **异步操作** - `chrome.storage.local` 的所有操作都是异步的，需要使用 `await`
2. **localStorage 同步** - `localStorage` 的操作是同步的，可以直接使用
3. **默认值** - 所有 API 都会返回默认值，无需手动处理 `null` 或 `undefined`
4. **类型安全** - 使用 TypeScript 时，所有 API 都提供完整的类型提示

## 旧文件清理

迁移完成后，可以删除以下旧文件：

- `src/lib/local-storage-keys.ts`
- `src/lib/storage.ts`
- `src/lib/theme-manager.ts`
- `src/lib/shortcuts-manager.ts`
- `src/lib/ui-settings-manager.ts`
- `src/lib/app-state-manager.ts`
- `src/lib/content-script-storage-helper.ts`
- `src/lib/storage-bootstrap.ts`

## 验证迁移

迁移完成后，请验证以下内容：

1. ✅ 所有存储操作都使用新 API
2. ✅ 没有直接访问 `localStorage` 或 `chrome.storage.local`
3. ✅ 所有键名都来自 `STORAGE_KEYS_LOCAL` 或 `STORAGE_KEYS_CHROME`
4. ✅ 应用启动时能正确读取所有存储数据
5. ✅ 主题、快捷键、UI 设置等功能正常工作
