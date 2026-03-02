/**
 * Content Script 存储辅助工具
 * 提供安全的存储读写接口，处理 undefined 和默认值
 */

import { STORAGE_KEYS } from "./storage";

export interface StorageData {
  activeBookId: string | null;
  activeCurrentIndex: number;
  activeCurrentScroll: number;
  activeChapters: any[];
}

/**
 * 从 chrome.storage.local 读取所有活跃状态数据
 */
export async function getActiveState(): Promise<StorageData> {
  try {
    const data = await chrome.storage.local.get([
      STORAGE_KEYS.ACTIVE_BOOK_ID,
      STORAGE_KEYS.ACTIVE_CURRENT_INDEX,
      STORAGE_KEYS.ACTIVE_CURRENT_SCROLL,
      STORAGE_KEYS.ACTIVE_CHAPTERS,
    ]);

    return {
      activeBookId: data[STORAGE_KEYS.ACTIVE_BOOK_ID] || null,
      activeCurrentIndex: data[STORAGE_KEYS.ACTIVE_CURRENT_INDEX] ?? 0,
      activeCurrentScroll: data[STORAGE_KEYS.ACTIVE_CURRENT_SCROLL] ?? 0,
      activeChapters: data[STORAGE_KEYS.ACTIVE_CHAPTERS] || [],
    };
  } catch (error) {
    console.error("[ContentScriptStorageHelper] Failed to get active state:", error);
    return {
      activeBookId: null,
      activeCurrentIndex: 0,
      activeCurrentScroll: 0,
      activeChapters: [],
    };
  }
}

/**
 * 更新活跃书籍 ID
 */
export async function setActiveBookId(bookId: string | null): Promise<void> {
  try {
    if (bookId === null) {
      await chrome.storage.local.remove(STORAGE_KEYS.ACTIVE_BOOK_ID);
    } else {
      await chrome.storage.local.set({
        [STORAGE_KEYS.ACTIVE_BOOK_ID]: bookId,
      });
    }
    console.log("[ContentScriptStorageHelper] Updated activeBookId:", bookId);
  } catch (error) {
    console.error("[ContentScriptStorageHelper] Failed to set activeBookId:", error);
  }
}

/**
 * 更新当前章节索引
 */
export async function setActiveCurrentIndex(index: number): Promise<void> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.ACTIVE_CURRENT_INDEX]: index,
    });
    console.log("[ContentScriptStorageHelper] Updated activeCurrentIndex:", index);
  } catch (error) {
    console.error("[ContentScriptStorageHelper] Failed to set activeCurrentIndex:", error);
  }
}

/**
 * 更新当前滚动位置
 */
export async function setActiveCurrentScroll(scroll: number): Promise<void> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.ACTIVE_CURRENT_SCROLL]: scroll,
    });
    console.log("[ContentScriptStorageHelper] Updated activeCurrentScroll:", scroll);
  } catch (error) {
    console.error("[ContentScriptStorageHelper] Failed to set activeCurrentScroll:", error);
  }
}

/**
 * 更新活跃章节列表
 */
export async function setActiveChapters(chapters: any[]): Promise<void> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.ACTIVE_CHAPTERS]: chapters,
    });
    console.log("[ContentScriptStorageHelper] Updated activeChapters:", chapters.length);
  } catch (error) {
    console.error("[ContentScriptStorageHelper] Failed to set activeChapters:", error);
  }
}

/**
 * 更新进度（同时更新索引和滚动位置）
 */
export async function updateProgress(
  index: number,
  scroll: number,
): Promise<void> {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.ACTIVE_CURRENT_INDEX]: index,
      [STORAGE_KEYS.ACTIVE_CURRENT_SCROLL]: scroll,
    });
    console.log("[ContentScriptStorageHelper] Updated progress:", { index, scroll });
  } catch (error) {
    console.error("[ContentScriptStorageHelper] Failed to update progress:", error);
  }
}

/**
 * 清空所有活跃状态
 */
export async function clearActiveState(): Promise<void> {
  try {
    await chrome.storage.local.remove([
      STORAGE_KEYS.ACTIVE_BOOK_ID,
      STORAGE_KEYS.ACTIVE_CURRENT_INDEX,
      STORAGE_KEYS.ACTIVE_CURRENT_SCROLL,
      STORAGE_KEYS.ACTIVE_CHAPTERS,
    ]);
    console.log("[ContentScriptStorageHelper] Cleared all active state");
  } catch (error) {
    console.error("[ContentScriptStorageHelper] Failed to clear active state:", error);
  }
}
