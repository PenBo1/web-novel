# 存储系统快速参考

## 快速开始

### 导入

```typescript
import { 
  ThemeStorage,
  UIStorage,
  ShortcutsStorage,
  AppStorage,
  ActiveStorage,
  STORAGE_KEYS_LOCAL,
  STORAGE_KEYS_CHROME,
} from "@/lib/storage";
```

## 常用操作

### 主题管理

```typescript
// 获取主题
const pluginTheme = ThemeStorage.getPluginTheme();      // "dark" | "light" | "system"
const readerTheme = ThemeStorage.getReaderTheme();      // "dark" | "light" | "system"

// 设置主题
ThemeStorage.setPluginTheme("dark");
ThemeStorage.setReaderTheme("light");
```

### UI 设置

```typescript
// 获取所有设置
const settings = UIStorage.getAll();
// {
//   readerVisible: boolean,
//   readerPosition: "top" | "bottom",
//   readerFontSize: number,
//   readerLineHeight: number,
//   defaultShow: boolean,
//   pageSize: number,
// }

// 获取单个设置
UIStorage.getReaderVisible();      // boolean
UIStorage.getReaderPosition();     // "top" | "bottom"
UIStorage.getReaderFontSize();     // number
UIStorage.getReaderLineHeight();   // number
UIStorage.getDefaultShow();        // boolean
UIStorage.getPageSize();           // number

// 设置单个值
UIStorage.setReaderVisible(true);
UIStorage.setReaderPosition("bottom");
UIStorage.setReaderFontSize(14);
UIStorage.setReaderLineHeight(1.6);
UIStorage.setDefaultShow(true);
UIStorage.setPageSize(60);
```

### 快捷键配置

```typescript
// 获取快捷键
const shortcuts = ShortcutsStorage.getConfig();
// [
//   { id: "toggleReader", label: "显示/隐藏阅读条", keys: ["Alt", "C"] },
//   { id: "nextPage", label: "下一页", keys: ["ArrowRight"] },
//   ...
// ]

// 设置快捷键
ShortcutsStorage.setConfig([
  { id: "toggleReader", label: "显示/隐藏阅读条", keys: ["Alt", "C"] },
  { id: "nextPage", label: "下一页", keys: ["ArrowRight"] },
]);
```

### 应用状态

```typescript
// 获取最后访问时间
const lastVisit = AppStorage.getLastVisit();  // number (timestamp)

// 更新最后访问时间
AppStorage.setLastVisit(Date.now());

// 获取版本
const version = AppStorage.getVersion();      // string

// 设置版本
AppStorage.setVersion("0.0.2");
```

### 活跃状态（异步）

```typescript
// 获取活跃状态
const bookId = await ActiveStorage.getBookId();           // string | null
const chapterIndex = await ActiveStorage.getChapterIndex(); // number
const scrollPosition = await ActiveStorage.getScrollPosition(); // number
const chapters = await ActiveStorage.getChapters();       // any[]

// 设置活跃状态
await ActiveStorage.setBookId("book-123");
await ActiveStorage.setChapterIndex(5);
await ActiveStorage.setScrollPosition(100);
await ActiveStorage.setChapters([...]);

// 获取所有活跃状态
const activeState = await ActiveStorage.getAll();
// {
//   bookId: string | null,
//   chapterIndex: number,
//   scrollPosition: number,
//   chapters: any[],
// }

// 清除活跃状态
await ActiveStorage.clear();
```

## 键名常量

### localStorage 键

```typescript
STORAGE_KEYS_LOCAL.THEME.PLUGIN              // "Web-Novel:theme:plugin"
STORAGE_KEYS_LOCAL.THEME.READER              // "Web-Novel:theme:reader"
STORAGE_KEYS_LOCAL.SHORTCUTS.CONFIG          // "Web-Novel:shortcuts:config"
STORAGE_KEYS_LOCAL.UI.READER_VISIBLE         // "Web-Novel:ui:reader-visible"
STORAGE_KEYS_LOCAL.UI.READER_POSITION        // "Web-Novel:ui:reader-position"
STORAGE_KEYS_LOCAL.UI.READER_FONT_SIZE       // "Web-Novel:ui:reader-font-size"
STORAGE_KEYS_LOCAL.UI.READER_LINE_HEIGHT     // "Web-Novel:ui:reader-line-height"
STORAGE_KEYS_LOCAL.UI.DEFAULT_SHOW           // "Web-Novel:ui:default-show"
STORAGE_KEYS_LOCAL.UI.PAGE_SIZE              // "Web-Novel:ui:page-size"
STORAGE_KEYS_LOCAL.APP.LAST_VISIT            // "Web-Novel:app:last-visit"
STORAGE_KEYS_LOCAL.APP.VERSION               // "Web-Novel:app:version"
```

### chrome.storage.local 键

```typescript
STORAGE_KEYS_CHROME.ACTIVE.BOOK_ID           // "wn:active:book-id"
STORAGE_KEYS_CHROME.ACTIVE.CHAPTER_INDEX     // "wn:active:chapter-index"
STORAGE_KEYS_CHROME.ACTIVE.SCROLL_POSITION   // "wn:active:scroll-position"
STORAGE_KEYS_CHROME.ACTIVE.CHAPTERS          // "wn:active:chapters"
STORAGE_KEYS_CHROME.SYNC.LAST_SYNC           // "wn:sync:last-sync"
```

## 默认值

```typescript
STORAGE_DEFAULTS.THEME.PLUGIN                // "system"
STORAGE_DEFAULTS.THEME.READER                // "system"
STORAGE_DEFAULTS.UI.READER_VISIBLE           // true
STORAGE_DEFAULTS.UI.READER_POSITION          // "bottom"
STORAGE_DEFAULTS.UI.READER_FONT_SIZE         // 13
STORAGE_DEFAULTS.UI.READER_LINE_HEIGHT       // 1.5
STORAGE_DEFAULTS.UI.DEFAULT_SHOW             // true
STORAGE_DEFAULTS.UI.PAGE_SIZE                // 50
STORAGE_DEFAULTS.ACTIVE.BOOK_ID              // null
STORAGE_DEFAULTS.ACTIVE.CHAPTER_INDEX        // 0
STORAGE_DEFAULTS.ACTIVE.SCROLL_POSITION      // 0
STORAGE_DEFAULTS.ACTIVE.CHAPTERS             // []
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

## 常见模式

### 初始化应用

```typescript
import { ThemeManager } from "@/lib/theme-manager";
import { AppStorage } from "@/lib/storage";

// 更新最后访问时间
AppStorage.setLastVisit(Date.now());

// 初始化主题
ThemeManager.initializeTheme();
```

### 读取用户配置

```typescript
const settings = {
  theme: ThemeStorage.getPluginTheme(),
  ui: UIStorage.getAll(),
  shortcuts: ShortcutsStorage.getConfig(),
};
```

### 保存用户配置

```typescript
function saveSettings(settings: any) {
  ThemeStorage.setPluginTheme(settings.theme);
  UIStorage.setReaderFontSize(settings.ui.readerFontSize);
  UIStorage.setReaderLineHeight(settings.ui.readerLineHeight);
  ShortcutsStorage.setConfig(settings.shortcuts);
}
```

### 跨上下文通信

```typescript
// Content Script - 更新活跃状态
await ActiveStorage.setBookId("book-123");
await ActiveStorage.setChapterIndex(5);

// Popup - 读取活跃状态
const bookId = await ActiveStorage.getBookId();
const chapterIndex = await ActiveStorage.getChapterIndex();
```

## 注意事项

⚠️ **localStorage 是同步的** - 不需要 await
```typescript
const theme = ThemeStorage.getPluginTheme();  // ✅ 正确
```

⚠️ **chrome.storage.local 是异步的** - 需要 await
```typescript
const bookId = await ActiveStorage.getBookId();  // ✅ 正确
const bookId = ActiveStorage.getBookId();        // ❌ 错误
```

⚠️ **所有 API 都返回有效值** - 无需检查 null
```typescript
const fontSize = UIStorage.getReaderFontSize();  // 总是返回数字，不会是 null
```

⚠️ **使用常量而不是硬编码字符串**
```typescript
// ✅ 正确
const theme = localStorage.getItem(STORAGE_KEYS_LOCAL.THEME.PLUGIN);

// ❌ 错误
const theme = localStorage.getItem("Web-Novel:theme:plugin");
```

## 文件结构

```
src/lib/storage/
├── constants.ts          # 键名定义和默认值
├── local-storage.ts      # localStorage 管理
├── chrome-storage.ts     # chrome.storage.local 管理
├── index.ts              # 统一导出
├── README.md             # 本文件
├── MIGRATION.md          # 迁移指南
└── ARCHITECTURE.md       # 架构文档
```

## 相关文档

- [迁移指南](./MIGRATION.md) - 从旧系统迁移到新系统
- [架构文档](./ARCHITECTURE.md) - 详细的系统架构说明
