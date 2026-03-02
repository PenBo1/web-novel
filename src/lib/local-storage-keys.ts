/**
 * localStorage 存储键规范
 * 
 * 存储策略：
 * - IndexedDB: 大数据（书籍、章节、下载记录）
 * - chrome.storage.local: 活跃状态（当前书籍、进度）
 * - localStorage: 用户配置（主题、快捷键、UI设置）
 * 
 * 命名规范：
 * - 前缀: "Web-Novel:" 用于区分其他扩展
 * - 分类: "theme:", "shortcuts:", "ui:", "reader:", "app:"
 * - 示例: "Web-Novel:theme:plugin" 表示插件主题
 */

export const LOCAL_STORAGE_KEYS = {
  // ============ 主题设置 ============
  THEME: {
    // 插件页面主题 (dark/light/system)
    PLUGIN: "Web-Novel:theme:plugin",
    // 阅读条主题 (dark/light/system)
    READER: "Web-Novel:theme:reader",
  },

  // ============ 快捷键设置 ============
  SHORTCUTS: {
    // 快捷键配置 JSON 数组
    CONFIG: "Web-Novel:shortcuts:config",
  },

  // ============ UI 设置 ============
  UI: {
    // 阅读条是否显示
    READER_VISIBLE: "Web-Novel:ui:reader-visible",
    // 阅读条位置 (top/bottom)
    READER_POSITION: "Web-Novel:ui:reader-position",
    // 阅读条字体大小
    READER_FONT_SIZE: "Web-Novel:ui:reader-font-size",
    // 阅读条行高
    READER_LINE_HEIGHT: "Web-Novel:ui:reader-line-height",
  },

  // ============ 阅读器设置 ============
  READER: {
    // 默认显示阅读条
    DEFAULT_SHOW: "Web-Novel:reader:default-show",
    // 每屏字符数
    PAGE_SIZE: "Web-Novel:reader:page-size",
  },

  // ============ 应用状态 ============
  APP: {
    // 最后访问时间
    LAST_VISIT: "Web-Novel:app:last-visit",
    // 应用版本
    VERSION: "Web-Novel:app:version",
  },

  // ============ 活跃状态（用于 chrome.storage.local 同步） ============
  ACTIVE: {
    // 当前激活的书籍 ID
    BOOK_ID: "Web-Novel:active:book-id",
    // 当前章节索引
    CURRENT_INDEX: "Web-Novel:active:current-index",
    // 当前滚动位置
    CURRENT_SCROLL: "Web-Novel:active:current-scroll",
    // 当前章节列表
    CHAPTERS: "Web-Novel:active:chapters",
  },
} as const;

/**
 * 获取 localStorage 值
 */
export function getLocalStorage<T>(key: string, defaultValue?: T): T | null {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return defaultValue ?? null;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`[LocalStorage] Failed to get ${key}:`, error);
    return defaultValue ?? null;
  }
}

/**
 * 设置 localStorage 值
 */
export function setLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[LocalStorage] Failed to set ${key}:`, error);
  }
}

/**
 * 删除 localStorage 值
 */
export function removeLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`[LocalStorage] Failed to remove ${key}:`, error);
  }
}

/**
 * 清空所有 Web-Novel 数据
 */
export function clearAllLocalStorage(): void {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith("Web-Novel:")) {
        localStorage.removeItem(key);
      }
    }
    console.log("[LocalStorage] Cleared all Web-Novel data");
  } catch (error) {
    console.error("[LocalStorage] Failed to clear all data:", error);
  }
}

/**
 * 获取所有 Web-Novel 数据
 */
export function getAllLocalStorage(): Record<string, any> {
  try {
    const result: Record<string, any> = {};
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith("Web-Novel:")) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value;
          }
        }
      }
    }
    return result;
  } catch (error) {
    console.error("[LocalStorage] Failed to get all data:", error);
    return {};
  }
}
