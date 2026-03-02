import type { Book, BookChapter, UserSettings, Shortcut } from "./types";
import type { ScraperRule } from "./scraper/types";
import { BUILTIN_RULES } from "./scraper/rules";
import { IDBStorageManager, IDBMigrationManager } from "./idb-storage";

/**
 * 存储键名常量，避免硬编码字符串散落在各处
 * 统一管理所有存储键，便于维护和迁移
 *
 * 存储策略：
 * - localStorage: 用户配置（主题、快捷键、UI设置）
 * - chrome.storage.local: 活跃状态（当前书籍、进度）
 * - IndexedDB: 大数据（书籍、章节、规则）
 */
export const STORAGE_KEYS = {
  // localStorage 键（web-novel: 前缀）
  THEME_PLUGIN: "web-novel:theme:plugin",
  THEME_READER: "web-novel:theme:reader",
  SHORTCUTS_CONFIG: "web-novel:shortcuts:config",
  UI_READER_VISIBLE: "web-novel:ui:reader-visible",
  UI_READER_POSITION: "web-novel:ui:reader-position",
  UI_READER_FONT_SIZE: "web-novel:ui:reader-font-size",
  UI_READER_LINE_HEIGHT: "web-novel:ui:reader-line-height",
  READER_DEFAULT_SHOW: "web-novel:reader:default-show",
  READER_PAGE_SIZE: "web-novel:reader:page-size",
  APP_LAST_VISIT: "web-novel:app:last-visit",
  APP_VERSION: "web-novel:app:version",
  
  // chrome.storage.local 键（无前缀）
  ACTIVE_BOOK_ID: "activeBookId",
  ACTIVE_CURRENT_INDEX: "activeCurrentIndex",
  ACTIVE_CURRENT_SCROLL: "activeCurrentScroll",
  ACTIVE_CHAPTERS: "activeChapters",
} as const;

/**
 * 书架操作工具类
 * 统一管理所有存储操作，使用 IndexedDB 作为主存储
 * 确保数据一致性并支持更大的存储容量
 */
export const StorageManager = {
  /**
   * 获取书架列表
   * @returns 书籍数组
   */
  async getBookshelf(): Promise<Book[]> {
    return IDBStorageManager.getBookshelf();
  },

  /**
   * 获取书籍的章节内容
   * @param bookId 书籍ID
   * @returns 章节数组
   */
  async getBookChapters(bookId: string): Promise<BookChapter[]> {
    return IDBStorageManager.getBookChapters(bookId);
  },

  /**
   * 将书籍保存/更新到书架
   * 同时保存章节内容
   * @param book 书籍对象
   * @param chapters 章节数组
   */
  async saveBook(book: Book, chapters: BookChapter[]): Promise<void> {
    return IDBStorageManager.saveBook(book, chapters);
  },

  /**
   * 更新书籍进度
   * @param bookId 书籍ID
   * @param chapterIndex 当前章节索引
   * @param scroll 滚动位置
   */
  async updateBookProgress(
    bookId: string,
    chapterIndex: number,
    scroll: number,
  ): Promise<void> {
    return IDBStorageManager.updateBookProgress(bookId, chapterIndex, scroll);
  },

  /**
   * 切换当前激活的书籍
   * @param bookId 书籍ID
   */
  async switchBook(bookId: string): Promise<void> {
    await IDBStorageManager.switchBook(bookId);
    // 同步更新 chrome.storage.local 以通知 Content Script
    if (typeof chrome !== "undefined" && chrome.storage) {
      try {
        await chrome.storage.local.set({ activeBookId: bookId });
        console.log(`[StorageManager] Synced activeBookId to chrome.storage.local: ${bookId}`);
      } catch (error) {
        console.warn("[StorageManager] Failed to sync to chrome.storage.local:", error);
      }
    }
  },

  /**
   * 获取当前激活的书籍ID
   * @returns 书籍ID或null
   */
  async getActiveBookId(): Promise<string | null> {
    return IDBStorageManager.getActiveBookId();
  },

  /**
   * 删除书籍及其所有相关数据
   * @param bookId 书籍ID
   */
  async deleteBook(bookId: string): Promise<void> {
    return IDBStorageManager.deleteBook(bookId);
  },

  /**
   * 加载设置
   * @returns 用户设置对象
   */
  async getSettings(): Promise<UserSettings> {
    return IDBStorageManager.getSettings();
  },

  /**
   * 保存设置
   * @param settings 用户设置对象
   */
  async saveSettings(settings: UserSettings): Promise<void> {
    return IDBStorageManager.saveSettings(settings);
  },

  /**
   * 获取书源规则
   * @returns 书源规则数组
   */
  async getRules(): Promise<ScraperRule[]> {
    return IDBStorageManager.getRules();
  },

  /**
   * 保存书源规则
   * @param rules 书源规则数组
   */
  async saveRules(rules: ScraperRule[]): Promise<void> {
    return IDBStorageManager.saveRules(rules);
  },

  /**
   * 获取默认快捷键
   * @returns 默认快捷键数组
   */
  getDefaultShortcuts(): Shortcut[] {
    return IDBStorageManager.getDefaultShortcuts();
  },

  /**
   * 获取快捷键设置
   * @returns 快捷键数组
   */
  async getShortcuts(): Promise<Shortcut[]> {
    return IDBStorageManager.getShortcuts();
  },

  /**
   * 保存快捷键设置
   * @param shortcuts 快捷键数组
   */
  async saveShortcuts(shortcuts: Shortcut[]): Promise<void> {
    return IDBStorageManager.saveShortcuts(shortcuts);
  },

  /**
   * 清空所有数据（谨慎使用）
   */
  async clearAll(): Promise<void> {
    return IDBStorageManager.clearAll();
  },

  /**
   * 获取存储使用情况
   * @returns 存储使用信息
   */
  async getStorageInfo(): Promise<{
    totalBooks: number;
    totalChapters: number;
    estimatedSize: string;
  }> {
    return IDBStorageManager.getStorageInfo();
  },

  /**
   * 初始化默认数据
   * 确保数据库中有基础配置
   */
  async initializeDefaults(): Promise<void> {
    return IDBMigrationManager.initializeDefaults();
  },
};
