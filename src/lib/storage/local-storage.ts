/**
 * localStorage 统一管理模块
 * 提供类型安全的 localStorage 操作接口
 */

import { STORAGE_KEYS_LOCAL, STORAGE_DEFAULTS } from "./constants";

/**
 * 获取 localStorage 值
 */
export function getLocalStorageValue<T>(key: string, defaultValue?: T): T | null {
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
export function setLocalStorageValue<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[LocalStorage] Failed to set ${key}:`, error);
  }
}

/**
 * 删除 localStorage 值
 */
export function removeLocalStorageValue(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`[LocalStorage] Failed to remove ${key}:`, error);
  }
}

/**
 * 清除所有 Web-Novel 数据
 */
export function clearAllLocalStorage(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith("Web-Novel:")) {
        localStorage.removeItem(key);
      }
    });
    console.log("[LocalStorage] Cleared all Web-Novel data");
  } catch (error) {
    console.error("[LocalStorage] Failed to clear all data:", error);
  }
}

/**
 * 导出所有 localStorage 数据
 */
export function exportLocalStorage(): Record<string, any> {
  const data: Record<string, any> = {};
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith("Web-Novel:")) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key) || "null");
      } catch {
        data[key] = localStorage.getItem(key);
      }
    }
  });
  return data;
}

// ============ 主题设置 ============

export const ThemeStorage = {
  getPluginTheme() {
    return getLocalStorageValue<string>(
      STORAGE_KEYS_LOCAL.THEME.PLUGIN,
      STORAGE_DEFAULTS.THEME.PLUGIN
    ) || STORAGE_DEFAULTS.THEME.PLUGIN;
  },

  setPluginTheme(theme: string) {
    setLocalStorageValue(STORAGE_KEYS_LOCAL.THEME.PLUGIN, theme);
  },

  getReaderTheme() {
    return getLocalStorageValue<string>(
      STORAGE_KEYS_LOCAL.THEME.READER,
      STORAGE_DEFAULTS.THEME.READER
    ) || STORAGE_DEFAULTS.THEME.READER;
  },

  setReaderTheme(theme: string) {
    setLocalStorageValue(STORAGE_KEYS_LOCAL.THEME.READER, theme);
  },
};

// ============ 快捷键设置 ============

export const ShortcutsStorage = {
  getConfig() {
    return getLocalStorageValue<any[]>(
      STORAGE_KEYS_LOCAL.SHORTCUTS.CONFIG,
      []
    ) || [];
  },

  setConfig(config: any[]) {
    setLocalStorageValue(STORAGE_KEYS_LOCAL.SHORTCUTS.CONFIG, config);
  },
};

// ============ UI 设置 ============

export const UIStorage = {
  getReaderVisible() {
    return getLocalStorageValue<boolean>(
      STORAGE_KEYS_LOCAL.UI.READER_VISIBLE,
      STORAGE_DEFAULTS.UI.READER_VISIBLE
    ) ?? STORAGE_DEFAULTS.UI.READER_VISIBLE;
  },

  setReaderVisible(visible: boolean) {
    setLocalStorageValue(STORAGE_KEYS_LOCAL.UI.READER_VISIBLE, visible);
  },

  getReaderPosition() {
    return getLocalStorageValue<string>(
      STORAGE_KEYS_LOCAL.UI.READER_POSITION,
      STORAGE_DEFAULTS.UI.READER_POSITION
    ) || STORAGE_DEFAULTS.UI.READER_POSITION;
  },

  setReaderPosition(position: string) {
    setLocalStorageValue(STORAGE_KEYS_LOCAL.UI.READER_POSITION, position);
  },

  getReaderFontSize() {
    return getLocalStorageValue<number>(
      STORAGE_KEYS_LOCAL.UI.READER_FONT_SIZE,
      STORAGE_DEFAULTS.UI.READER_FONT_SIZE
    ) ?? STORAGE_DEFAULTS.UI.READER_FONT_SIZE;
  },

  setReaderFontSize(size: number) {
    setLocalStorageValue(STORAGE_KEYS_LOCAL.UI.READER_FONT_SIZE, size);
  },

  getReaderLineHeight() {
    return getLocalStorageValue<number>(
      STORAGE_KEYS_LOCAL.UI.READER_LINE_HEIGHT,
      STORAGE_DEFAULTS.UI.READER_LINE_HEIGHT
    ) ?? STORAGE_DEFAULTS.UI.READER_LINE_HEIGHT;
  },

  setReaderLineHeight(height: number) {
    setLocalStorageValue(STORAGE_KEYS_LOCAL.UI.READER_LINE_HEIGHT, height);
  },

  getDefaultShow() {
    return getLocalStorageValue<boolean>(
      STORAGE_KEYS_LOCAL.UI.DEFAULT_SHOW,
      STORAGE_DEFAULTS.UI.DEFAULT_SHOW
    ) ?? STORAGE_DEFAULTS.UI.DEFAULT_SHOW;
  },

  setDefaultShow(show: boolean) {
    setLocalStorageValue(STORAGE_KEYS_LOCAL.UI.DEFAULT_SHOW, show);
  },

  getPageSize() {
    return getLocalStorageValue<number>(
      STORAGE_KEYS_LOCAL.UI.PAGE_SIZE,
      STORAGE_DEFAULTS.UI.PAGE_SIZE
    ) ?? STORAGE_DEFAULTS.UI.PAGE_SIZE;
  },

  setPageSize(size: number) {
    setLocalStorageValue(STORAGE_KEYS_LOCAL.UI.PAGE_SIZE, size);
  },

  getAll() {
    return {
      readerVisible: this.getReaderVisible(),
      readerPosition: this.getReaderPosition(),
      readerFontSize: this.getReaderFontSize(),
      readerLineHeight: this.getReaderLineHeight(),
      defaultShow: this.getDefaultShow(),
      pageSize: this.getPageSize(),
    };
  },
};

// ============ 应用状态 ============

export const AppStorage = {
  getLastVisit() {
    return getLocalStorageValue<number>(
      STORAGE_KEYS_LOCAL.APP.LAST_VISIT,
      0
    ) ?? 0;
  },

  setLastVisit(timestamp: number) {
    setLocalStorageValue(STORAGE_KEYS_LOCAL.APP.LAST_VISIT, timestamp);
  },

  getVersion() {
    return getLocalStorageValue<string>(
      STORAGE_KEYS_LOCAL.APP.VERSION,
      ""
    ) || "";
  },

  setVersion(version: string) {
    setLocalStorageValue(STORAGE_KEYS_LOCAL.APP.VERSION, version);
  },
};
