# 存储系统架构文档

## 系统概览

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Novel 存储系统                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │  localStorage    │  │ chrome.storage   │  │ IndexedDB  │ │
│  │                  │  │                  │  │            │ │
│  │ • 主题设置       │  │ • 活跃书籍 ID    │  │ • 书籍数据 │ │
│  │ • 快捷键配置     │  │ • 章节索引       │  │ • 章节内容 │ │
│  │ • UI 设置        │  │ • 滚动位置       │  │ • 下载记录 │ │
│  │ • 应用状态       │  │ • 章节列表       │  │ • 书源规则 │ │
│  │                  │  │                  │  │            │ │
│  └──────────────────┘  └──────────────────┘  └────────────┘ │
│         ↓                      ↓                     ↓        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │ local-storage.ts │  │ chrome-storage.ts│  │ idb-*.ts   │ │
│  │                  │  │                  │  │            │ │
│  │ • ThemeStorage   │  │ • ActiveStorage  │  │ • IDBMgr   │ │
│  │ • UIStorage      │  │ • SyncStorage    │  │ • Download │ │
│  │ • ShortcutsStore │  │                  │  │   RecordMgr│ │
│  │ • AppStorage     │  │                  │  │            │ │
│  └──────────────────┘  └──────────────────┘  └────────────┘ │
│         ↑                      ↑                     ↑        │
│  ┌──────────────────────────────────────────────────────────┐│
│  │              constants.ts (键名定义)                      ││
│  │  • STORAGE_KEYS_LOCAL                                    ││
│  │  • STORAGE_KEYS_CHROME                                   ││
│  │  • STORAGE_DEFAULTS                                      ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 存储选择标准

| 存储方式 | 容量 | 跨域 | 持久化 | 同步 | 用途 |
|---------|------|------|--------|------|------|
| localStorage | 5-10MB | ❌ | ✅ | ❌ | 用户配置 |
| chrome.storage.local | 10MB | ✅ | ✅ | ✅ | 活跃状态 |
| IndexedDB | 50MB+ | ❌ | ✅ | ❌ | 大数据 |

## 模块职责

### 1. constants.ts - 键名定义

**职责**:
- 定义所有存储键名常量
- 定义类型别名
- 定义默认值

**特点**:
- 单一职责：只定义常量
- 易于维护：所有键名集中管理
- 类型安全：导出 TypeScript 类型

**导出**:
```typescript
STORAGE_KEYS_LOCAL      // localStorage 键
STORAGE_KEYS_CHROME     // chrome.storage.local 键
STORAGE_DEFAULTS        // 所有默认值
ThemeMode               // 主题模式类型
ReaderPosition          // 阅读条位置类型
APP_VERSION             // 应用版本
```

### 2. local-storage.ts - localStorage 管理

**职责**:
- 提供 localStorage 的类型安全操作
- 实现高级 API（ThemeStorage、UIStorage 等）
- 处理数据序列化和错误

**特点**:
- 同步操作：无需 await
- 自动默认值：所有 API 都返回有效值
- 模块化 API：按功能分组

**导出**:
```typescript
// 基础操作
getLocalStorageValue()
setLocalStorageValue()
removeLocalStorageValue()
clearAllLocalStorage()
exportLocalStorage()

// 高级 API
ThemeStorage            // 主题管理
ShortcutsStorage        // 快捷键管理
UIStorage               // UI 设置管理
AppStorage              // 应用状态管理
```

### 3. chrome-storage.ts - chrome.storage.local 管理

**职责**:
- 提供 chrome.storage.local 的类型安全操作
- 实现高级 API（ActiveStorage、SyncStorage）
- 处理异步操作和错误

**特点**:
- 异步操作：需要 await
- 自动默认值：所有 API 都返回有效值
- 跨上下文通信：支持 popup ↔ content script

**导出**:
```typescript
// 基础操作
getChromeStorageValue()
setChromeStorageValue()
removeChromeStorageValue()
clearAllChromeStorage()
exportChromeStorage()

// 高级 API
ActiveStorage           // 活跃状态管理
SyncStorage             // 同步标记管理
```

### 4. index.ts - 统一导出

**职责**:
- 统一导出所有存储 API
- 提供便捷的导入路径

**导出**:
```typescript
// 所有常量、类型、函数
export * from "./constants";
export * from "./local-storage";
export * from "./chrome-storage";
```

## 数据流

### localStorage 数据流

```
用户操作
   ↓
ThemeStorage.setPluginTheme("dark")
   ↓
setLocalStorageValue(STORAGE_KEYS_LOCAL.THEME.PLUGIN, "dark")
   ↓
localStorage.setItem("Web-Novel:theme:plugin", '"dark"')
   ↓
数据持久化
```

### chrome.storage.local 数据流

```
Content Script 更新
   ↓
ActiveStorage.setBookId("book-123")
   ↓
setChromeStorageValue(STORAGE_KEYS_CHROME.ACTIVE.BOOK_ID, "book-123")
   ↓
chrome.storage.local.set({ "wn:active:book-id": "book-123" })
   ↓
Popup 读取
   ↓
ActiveStorage.getBookId()
   ↓
getChromeStorageValue(STORAGE_KEYS_CHROME.ACTIVE.BOOK_ID)
   ↓
chrome.storage.local.get("wn:active:book-id")
   ↓
返回 "book-123"
```

## 键名规范

### localStorage 键名规范

**格式**: `Web-Novel:<category>:<key>`

**示例**:
```
Web-Novel:theme:plugin          // 主题 - 插件
Web-Novel:theme:reader          // 主题 - 阅读条
Web-Novel:shortcuts:config      // 快捷键 - 配置
Web-Novel:ui:reader-visible     // UI - 阅读条可见性
Web-Novel:ui:reader-position    // UI - 阅读条位置
Web-Novel:ui:reader-font-size   // UI - 字体大小
Web-Novel:ui:reader-line-height // UI - 行高
Web-Novel:ui:default-show       // UI - 默认显示
Web-Novel:ui:page-size          // UI - 每屏字符数
Web-Novel:app:last-visit        // 应用 - 最后访问
Web-Novel:app:version           // 应用 - 版本
```

### chrome.storage.local 键名规范

**格式**: `wn:<category>:<key>`

**示例**:
```
wn:active:book-id               // 活跃 - 书籍 ID
wn:active:chapter-index         // 活跃 - 章节索引
wn:active:scroll-position       // 活跃 - 滚动位置
wn:active:chapters              // 活跃 - 章节列表
wn:sync:last-sync               // 同步 - 最后同步时间
```

## 错误处理

所有存储操作都包含错误处理：

```typescript
// localStorage
try {
  const value = localStorage.getItem(key);
  return JSON.parse(value);
} catch (error) {
  console.error(`Failed to get ${key}:`, error);
  return defaultValue;
}

// chrome.storage.local
try {
  const result = await chrome.storage.local.get(key);
  return result[key];
} catch (error) {
  console.error(`Failed to get ${key}:`, error);
  return defaultValue;
}
```

## 类型安全

所有 API 都提供完整的类型提示：

```typescript
// 类型推断
const theme = ThemeStorage.getPluginTheme();  // string
const visible = UIStorage.getReaderVisible(); // boolean
const fontSize = UIStorage.getReaderFontSize(); // number

// 异步类型
const bookId = await ActiveStorage.getBookId(); // Promise<string | null>
const index = await ActiveStorage.getChapterIndex(); // Promise<number>
```

## 性能考虑

1. **localStorage** - 同步操作，避免在循环中频繁调用
2. **chrome.storage.local** - 异步操作，使用 Promise.all() 并行读取多个值
3. **缓存** - 考虑在内存中缓存频繁访问的值

## 扩展性

新增存储类别的步骤：

1. 在 `constants.ts` 中定义新的键
2. 在 `local-storage.ts` 或 `chrome-storage.ts` 中实现新的 API
3. 在 `index.ts` 中导出新的 API
4. 更新文档

## 测试建议

```typescript
// 测试 localStorage
test("ThemeStorage.setPluginTheme", () => {
  ThemeStorage.setPluginTheme("dark");
  expect(ThemeStorage.getPluginTheme()).toBe("dark");
});

// 测试 chrome.storage.local
test("ActiveStorage.setBookId", async () => {
  await ActiveStorage.setBookId("book-123");
  const bookId = await ActiveStorage.getBookId();
  expect(bookId).toBe("book-123");
});

// 测试默认值
test("UIStorage returns default values", () => {
  clearAllLocalStorage();
  expect(UIStorage.getReaderFontSize()).toBe(13);
  expect(UIStorage.getReaderPosition()).toBe("bottom");
});
```

## 迁移检查清单

- [ ] 所有存储操作都使用新 API
- [ ] 没有直接访问 `localStorage` 或 `chrome.storage.local`
- [ ] 所有键名都来自 `STORAGE_KEYS_LOCAL` 或 `STORAGE_KEYS_CHROME`
- [ ] 所有异步操作都使用 `await`
- [ ] 所有同步操作都不使用 `await`
- [ ] 错误处理正确
- [ ] 类型检查通过
- [ ] 功能测试通过
