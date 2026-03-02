/**
 * 存储系统常量定义
 * 统一管理所有存储键名，确保规范和一致性
 * 
 * 存储策略：
 * - localStorage: 用户配置（主题、快捷键、UI设置）
 * - chrome.storage.local: 活跃状态（当前书籍、进度）
 * - IndexedDB: 大数据（书籍、章节、下载记录）
 */

// ============ 前缀定义 ============
const LS_PREFIX = "web-novel" as const;
const CHROME_PREFIX = "wn" as const;

// ============ localStorage 键定义 ============
export const STORAGE_KEYS_LOCAL = {
  // 主题设置
  THEME: {
    PLUGIN: `${LS_PREFIX}:theme:plugin`,
    READER: `${LS_PREFIX}:theme:reader`,
  },

  // 快捷键设置
  SHORTCUTS: {
    CONFIG: `${LS_PREFIX}:shortcuts:config`,
  },

  // UI 设置
  UI: {
    READER_VISIBLE: `${LS_PREFIX}:ui:reader-visible`,
    READER_POSITION: `${LS_PREFIX}:ui:reader-position`,
    READER_FONT_SIZE: `${LS_PREFIX}:ui:reader-font-size`,
    READER_LINE_HEIGHT: `${LS_PREFIX}:ui:reader-line-height`,
    DEFAULT_SHOW: `${LS_PREFIX}:ui:default-show`,
    PAGE_SIZE: `${LS_PREFIX}:ui:page-size`,
  },

  // 应用状态
  APP: {
    LAST_VISIT: `${LS_PREFIX}:app:last-visit`,
    VERSION: `${LS_PREFIX}:app:version`,
  },
} as const;

// ============ chrome.storage.local 键定义 ============
export const STORAGE_KEYS_CHROME = {
  // 活跃书籍状态
  ACTIVE: {
    BOOK_ID: `${CHROME_PREFIX}:active:book-id`,
    CHAPTER_INDEX: `${CHROME_PREFIX}:active:chapter-index`,
    SCROLL_POSITION: `${CHROME_PREFIX}:active:scroll-position`,
    CHAPTERS: `${CHROME_PREFIX}:active:chapters`,
  },

  // 同步标记
  SYNC: {
    LAST_SYNC: `${CHROME_PREFIX}:sync:last-sync`,
  },
} as const;

// ============ 类型定义 ============
export type ThemeMode = "dark" | "light" | "system";
export type ReaderPosition = "top" | "bottom";

// ============ 默认值定义 ============
export const STORAGE_DEFAULTS = {
  THEME: {
    PLUGIN: "system" as ThemeMode,
    READER: "system" as ThemeMode,
  },
  UI: {
    READER_VISIBLE: true,
    READER_POSITION: "bottom" as ReaderPosition,
    READER_FONT_SIZE: 13,
    READER_LINE_HEIGHT: 1.5,
    DEFAULT_SHOW: true,
    PAGE_SIZE: 50,
  },
  ACTIVE: {
    BOOK_ID: null as string | null,
    CHAPTER_INDEX: 0,
    SCROLL_POSITION: 0,
    CHAPTERS: [] as any[],
  },
} as const;

// ============ 版本信息 ============
export const APP_VERSION = "0.0.1";
