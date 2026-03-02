/**
 * chrome.storage.local 统一管理模块
 * 提供类型安全的 chrome.storage.local 操作接口
 * 用于跨上下文通信（popup ↔ content script）
 */

import { STORAGE_KEYS_CHROME, STORAGE_DEFAULTS } from "./constants";

/**
 * 获取 chrome.storage.local 值
 */
export async function getChromeStorageValue<T>(
  key: string,
  defaultValue?: T
): Promise<T | null> {
  try {
    const result = await chrome.storage.local.get(key);
    const value = result[key];
    return value !== undefined ? (value as T) : defaultValue ?? null;
  } catch (error) {
    console.error(`[ChromeStorage] Failed to get ${key}:`, error);
    return defaultValue ?? null;
  }
}

/**
 * 设置 chrome.storage.local 值
 */
export async function setChromeStorageValue<T>(key: string, value: T): Promise<void> {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    console.error(`[ChromeStorage] Failed to set ${key}:`, error);
  }
}

/**
 * 删除 chrome.storage.local 值
 */
export async function removeChromeStorageValue(key: string): Promise<void> {
  try {
    await chrome.storage.local.remove(key);
  } catch (error) {
    console.error(`[ChromeStorage] Failed to remove ${key}:`, error);
  }
}

/**
 * 清除所有 web-novel 数据
 */
export async function clearAllChromeStorage(): Promise<void> {
  try {
    const keys = Object.values(STORAGE_KEYS_CHROME).flatMap((category) =>
      Object.values(category)
    );
    await chrome.storage.local.remove(keys);
    console.log("[ChromeStorage] Cleared all web-novel data");
  } catch (error) {
    console.error("[ChromeStorage] Failed to clear all data:", error);
  }
}

/**
 * 导出所有 chrome.storage.local 数据
 */
export async function exportChromeStorage(): Promise<Record<string, any>> {
  try {
    const keys = Object.values(STORAGE_KEYS_CHROME).flatMap((category) =>
      Object.values(category)
    );
    const result = await chrome.storage.local.get(keys);
    return result;
  } catch (error) {
    console.error("[ChromeStorage] Failed to export data:", error);
    return {};
  }
}

// ============ 活跃书籍状态 ============

export const ActiveStorage = {
  async getBookId(): Promise<string | null> {
    return getChromeStorageValue<string>(
      STORAGE_KEYS_CHROME.ACTIVE.BOOK_ID,
      STORAGE_DEFAULTS.ACTIVE.BOOK_ID
    );
  },

  async setBookId(bookId: string | null): Promise<void> {
    if (bookId === null) {
      await removeChromeStorageValue(STORAGE_KEYS_CHROME.ACTIVE.BOOK_ID);
    } else {
      await setChromeStorageValue(STORAGE_KEYS_CHROME.ACTIVE.BOOK_ID, bookId);
    }
  },

  async getChapterIndex(): Promise<number> {
    return (
      (await getChromeStorageValue<number>(
        STORAGE_KEYS_CHROME.ACTIVE.CHAPTER_INDEX,
        STORAGE_DEFAULTS.ACTIVE.CHAPTER_INDEX
      )) ?? STORAGE_DEFAULTS.ACTIVE.CHAPTER_INDEX
    );
  },

  async setChapterIndex(index: number): Promise<void> {
    await setChromeStorageValue(STORAGE_KEYS_CHROME.ACTIVE.CHAPTER_INDEX, index);
  },

  async getScrollPosition(): Promise<number> {
    return (
      (await getChromeStorageValue<number>(
        STORAGE_KEYS_CHROME.ACTIVE.SCROLL_POSITION,
        STORAGE_DEFAULTS.ACTIVE.SCROLL_POSITION
      )) ?? STORAGE_DEFAULTS.ACTIVE.SCROLL_POSITION
    );
  },

  async setScrollPosition(position: number): Promise<void> {
    await setChromeStorageValue(STORAGE_KEYS_CHROME.ACTIVE.SCROLL_POSITION, position);
  },

  async getChapters(): Promise<any[]> {
    return (
      (await getChromeStorageValue<any[]>(
        STORAGE_KEYS_CHROME.ACTIVE.CHAPTERS,
        STORAGE_DEFAULTS.ACTIVE.CHAPTERS
      )) ?? STORAGE_DEFAULTS.ACTIVE.CHAPTERS
    );
  },

  async setChapters(chapters: any[]): Promise<void> {
    await setChromeStorageValue(STORAGE_KEYS_CHROME.ACTIVE.CHAPTERS, chapters);
  },

  async getAll() {
    return {
      bookId: await this.getBookId(),
      chapterIndex: await this.getChapterIndex(),
      scrollPosition: await this.getScrollPosition(),
      chapters: await this.getChapters(),
    };
  },

  async clear(): Promise<void> {
    await Promise.all([
      removeChromeStorageValue(STORAGE_KEYS_CHROME.ACTIVE.BOOK_ID),
      removeChromeStorageValue(STORAGE_KEYS_CHROME.ACTIVE.CHAPTER_INDEX),
      removeChromeStorageValue(STORAGE_KEYS_CHROME.ACTIVE.SCROLL_POSITION),
      removeChromeStorageValue(STORAGE_KEYS_CHROME.ACTIVE.CHAPTERS),
    ]);
  },
};

// ============ 同步标记 ============

export const SyncStorage = {
  async getLastSync(): Promise<number> {
    return (
      (await getChromeStorageValue<number>(
        STORAGE_KEYS_CHROME.SYNC.LAST_SYNC,
        0
      )) ?? 0
    );
  },

  async setLastSync(timestamp: number): Promise<void> {
    await setChromeStorageValue(STORAGE_KEYS_CHROME.SYNC.LAST_SYNC, timestamp);
  },
};
