import { openDB } from "idb";
import type { DBSchema, IDBPDatabase } from "idb";
import type {
  Book,
  BookChapter,
  UserSettings,
  Shortcut,
  DownloadRecord,
} from "./types";
import type { ScraperRule } from "./scraper/types";
import { BUILTIN_RULES } from "./scraper/rules";

/**
 * IndexedDB 数据库 Schema 定义
 * 使用 IndexedDB 替代 chrome.storage.local 以支持更大的存储容量
 */
interface WebNovelDB extends DBSchema {
  books: {
    key: string;
    value: Book;
    indexes: { "by-addedAt": number };
  };
  chapters: {
    key: string;
    value: BookChapter & { bookId: string };
    indexes: { "by-bookId": string };
  };
  settings: {
    key: "user";
    value: UserSettings & { key: "user" };
  };
  shortcuts: {
    key: string;
    value: Shortcut;
  };
  rules: {
    key: string;
    value: ScraperRule;
  };
  metadata: {
    key: string;
    value: any & { key: string };
  };
  downloads: {
    key: string;
    value: DownloadRecord;
    indexes: { "by-bookId": string; "by-downloadedAt": number };
  };
}

const DB_NAME = "web-novel-db";
const DB_VERSION = 3; // v3: 移除 settings 和 shortcuts 表，迁移到 localStorage

/**
 * 初始化 IndexedDB 数据库
 */
export async function initDB(): Promise<IDBPDatabase<WebNovelDB>> {
  return openDB<WebNovelDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, tx) {
      console.log(`[IDB] Upgrading from v${oldVersion} to v${newVersion}`);

      // 书籍存储
      if (!db.objectStoreNames.contains("books")) {
        const bookStore = db.createObjectStore("books", { keyPath: "id" });
        bookStore.createIndex("by-addedAt", "addedAt");
      }

      // 章节存储
      if (!db.objectStoreNames.contains("chapters")) {
        const chapterStore = db.createObjectStore("chapters", {
          keyPath: ["bookId", "title"],
        });
        chapterStore.createIndex("by-bookId", "bookId");
      }

      // v2 -> v3: 删除 settings 和 shortcuts 表（已迁移到 localStorage）
      if (oldVersion < 3) {
        console.log("[IDB] Migrating from v2 to v3: removing settings and shortcuts tables");
        
        // 删除旧表
        if (db.objectStoreNames.contains("settings")) {
          db.deleteObjectStore("settings");
          console.log("[IDB] Deleted settings table");
        }
        if (db.objectStoreNames.contains("shortcuts")) {
          db.deleteObjectStore("shortcuts");
          console.log("[IDB] Deleted shortcuts table");
        }
      }

      // 书源规则存储
      if (!db.objectStoreNames.contains("rules")) {
        db.createObjectStore("rules", { keyPath: "id" });
      }

      // 元数据存储（用于存储活跃书籍等信息）
      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", { keyPath: "key" });
      }

      // 下载记录存储
      if (!db.objectStoreNames.contains("downloads")) {
        const downloadStore = db.createObjectStore("downloads", {
          keyPath: "id",
        });
        downloadStore.createIndex("by-bookId", "bookId");
        downloadStore.createIndex("by-downloadedAt", "downloadedAt");
      }

      console.log("[IDB] Database upgrade completed");
    },
  });
}

/**
 * IndexedDB 存储管理器
 * 提供与 StorageManager 兼容的 API，但使用 IndexedDB 作为后端
 */
export const IDBStorageManager = {
  /**
   * 获取书架列表
   */
  async getBookshelf(): Promise<Book[]> {
    try {
      const db = await initDB();
      const books = await db.getAll("books");
      return books.sort((a, b) => b.addedAt - a.addedAt);
    } catch (error) {
      console.error("Failed to get bookshelf from IDB:", error);
      return [];
    }
  },

  /**
   * 获取书籍的章节内容
   */
  async getBookChapters(bookId: string): Promise<BookChapter[]> {
    try {
      console.log(`[IDB] Loading chapters for book: ${bookId}`);
      const db = await initDB();
      const tx = db.transaction("chapters", "readonly");
      const index = tx.store.index("by-bookId");
      const chapters = await index.getAll(bookId);
      await tx.done;
      
      console.log(`[IDB] Loaded ${chapters.length} chapters for book ${bookId}`);
      
      return chapters.map(
        ({ bookId: _, ...chapter }) => chapter as BookChapter,
      );
    } catch (error) {
      console.error(`Failed to get chapters for book ${bookId}:`, error);
      return [];
    }
  },

  /**
   * 将书籍保存/更新到书架
   */
  async saveBook(book: Book, chapters: BookChapter[]): Promise<void> {
    try {
      console.log(`[IDB] Saving book: ${book.title} with ${chapters.length} chapters`);
      const db = await initDB();
      
      // 第一步：删除旧章节（单独的事务）
      const oldChaptersToDelete: string[] = [];
      {
        const tx = db.transaction("chapters", "readonly");
        const index = tx.store.index("by-bookId");
        const oldChapters = await index.getAll(book.id);
        console.log(`[IDB] Found ${oldChapters.length} old chapters to delete`);
        for (const chapter of oldChapters) {
          oldChaptersToDelete.push(chapter.title);
        }
        await tx.done;
      }

      // 第二步：删除旧章节（单独的写事务）
      if (oldChaptersToDelete.length > 0) {
        const deleteTx = db.transaction("chapters", "readwrite");
        for (const title of oldChaptersToDelete) {
          await deleteTx.store.delete([book.id, title] as any);
        }
        await deleteTx.done;
        console.log(`[IDB] Deleted ${oldChaptersToDelete.length} old chapters`);
      }

      // 第三步：保存书籍和新章节（单独的写事务）
      const saveTx = db.transaction(["books", "chapters"], "readwrite");
      
      // 保存书籍
      await saveTx.objectStore("books").put(book);
      console.log(`[IDB] Book metadata saved: ${book.id}`);

      // 保存新章节
      const chapterStore = saveTx.objectStore("chapters");
      for (const chapter of chapters) {
        await chapterStore.put({
          ...chapter,
          bookId: book.id,
        });
      }
      console.log(`[IDB] Saved ${chapters.length} new chapters`);
      
      await saveTx.done;
      console.log(`[IDB] Book save completed successfully`);
    } catch (error) {
      console.error("Failed to save book to IDB:", error);
      throw error;
    }
  },

  /**
   * 更新书籍进度
   */
  async updateBookProgress(
    bookId: string,
    chapterIndex: number,
    scroll: number,
  ): Promise<void> {
    try {
      const db = await initDB();
      
      // 先读取书籍
      const book = await db.get("books", bookId);
      if (!book) throw new Error(`Book ${bookId} not found`);

      // 然后在单独的写事务中更新
      const tx = db.transaction(["books", "metadata"], "readwrite");
      
      const updatedBook = {
        ...book,
        progress: { chapterIndex, scroll },
      };

      await tx.objectStore("books").put(updatedBook);
      await tx.objectStore("metadata").put({
        key: "activeProgress",
        chapterIndex,
        scroll,
      });

      await tx.done;

      // 同步到 chrome.storage.local（用于 Content Script 访问）
      if (typeof chrome !== "undefined" && chrome.storage) {
        try {
          await chrome.storage.local.set({
            activeCurrentIndex: chapterIndex,
            activeCurrentScroll: scroll,
          });
          console.log(`[IDB] Synced progress to chrome.storage.local: chapter ${chapterIndex}, scroll ${scroll}`);
        } catch (storageError) {
          console.warn("[IDB] Failed to sync to chrome.storage.local:", storageError);
        }
      }
    } catch (error) {
      console.error("Failed to update book progress:", error);
      throw error;
    }
  },

  /**
   * 切换当前激活的书籍
   */
  async switchBook(bookId: string): Promise<void> {
    try {
      const db = await initDB();

      // 先获取书籍数据
      const book = await db.get("books", bookId);
      if (!book) throw new Error(`Book ${bookId} not found`);

      // 检查章节是否存在
      const tx = db.transaction("chapters", "readonly");
      const index = tx.store.index("by-bookId");
      const chapters = await index.getAll(bookId);
      await tx.done;
      
      console.log(`[IDB] Switching to book ${bookId}, found ${chapters.length} chapters`);
      
      if (!chapters || chapters.length === 0) {
        console.warn(`[IDB] Warning: No chapters found for book ${bookId}, but proceeding anyway`);
      }

      // 在单独的事务中更新元数据
      const metaTx = db.transaction("metadata", "readwrite");
      await metaTx.store.put({
        key: "activeBook",
        bookId,
        title: book.title,
        author: book.author || "",
        totalChapters: book.totalChapters,
        chapterIndex: book.progress.chapterIndex,
        scroll: book.progress.scroll,
      });
      await metaTx.done;
      
      console.log(`[IDB] Book switched successfully`);

      // 同步到 chrome.storage.local（用于 Content Script 访问）
      if (typeof chrome !== "undefined" && chrome.storage) {
        try {
          await chrome.storage.local.set({
            activeBookId: bookId,
            activeCurrentIndex: book.progress.chapterIndex,
            activeCurrentScroll: book.progress.scroll,
            activeChapters: chapters.map(c => ({
              title: c.title,
              content: c.content,
            })),
          });
          console.log(`[IDB] Synced book switch to chrome.storage.local: ${bookId}`);
        } catch (storageError) {
          console.warn("[IDB] Failed to sync to chrome.storage.local:", storageError);
        }
      }
    } catch (error) {
      console.error("Failed to switch book:", error);
      throw error;
    }
  },

  /**
   * 获取当前激活的书籍ID
   */
  async getActiveBookId(): Promise<string | null> {
    try {
      const db = await initDB();
      const metadata = await db.get("metadata", "activeBook");
      return metadata?.bookId || null;
    } catch (error) {
      console.error("Failed to get active book ID:", error);
      return null;
    }
  },

  /**
   * 删除书籍及其所有相关数据
   */
  async deleteBook(bookId: string): Promise<void> {
    try {
      const db = await initDB();
      
      // 第一步：获取要删除的章节列表
      const chaptersToDelete: string[] = [];
      {
        const tx = db.transaction("chapters", "readonly");
        const index = tx.store.index("by-bookId");
        const chapters = await index.getAll(bookId);
        for (const chapter of chapters) {
          chaptersToDelete.push(chapter.title);
        }
        await tx.done;
      }

      // 第二步：删除书籍、章节和元数据
      const tx = db.transaction(["books", "chapters", "metadata"], "readwrite");

      await tx.objectStore("books").delete(bookId);
      console.log(`[IDB] Deleted book: ${bookId}`);

      for (const title of chaptersToDelete) {
        await tx.objectStore("chapters").delete([bookId, title] as any);
      }
      console.log(`[IDB] Deleted ${chaptersToDelete.length} chapters`);

      const activeBook = await tx.objectStore("metadata").get("activeBook");
      if (activeBook?.bookId === bookId) {
        await tx.objectStore("metadata").delete("activeBook");
        console.log(`[IDB] Cleared active book metadata`);
      }

      await tx.done;
    } catch (error) {
      console.error("Failed to delete book:", error);
      throw error;
    }
  },

  /**
   * 获取设置
   * 注意：v3 版本后，设置已迁移到 localStorage
   */
  async getSettings(): Promise<UserSettings> {
    try {
      // 从 localStorage 读取（新位置）
      const { ThemeManager } = await import("./theme-manager");
      const { UISettingsManager } = await import("./ui-settings-manager");
      
      const themeConfig = ThemeManager.getThemeConfig();
      const uiSettings = UISettingsManager.getUISettings();

      return {
        pluginTheme: themeConfig.plugin === "dark" ? "21st-dark" : "21st-light",
        readerTheme: themeConfig.reader === "dark" ? "21st-dark" : "21st-light",
        defaultShow: uiSettings.defaultShow,
        position: uiSettings.readerPosition,
      };
    } catch (error) {
      console.error("Failed to get settings:", error);
      return {
        pluginTheme: "21st-dark",
        readerTheme: "21st-dark",
        defaultShow: true,
        position: "bottom",
      };
    }
  },

  /**
   * 保存设置
   * 注意：v3 版本后，设置已迁移到 localStorage
   */
  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      const { ThemeManager } = await import("./theme-manager");
      const { UISettingsManager } = await import("./ui-settings-manager");

      // 将主题名称映射为 dark/light
      const pluginTheme = settings.pluginTheme?.includes("dark") ? "dark" : "light";
      const readerTheme = settings.readerTheme?.includes("dark") ? "dark" : "light";
      
      ThemeManager.setPluginTheme(pluginTheme as any);
      ThemeManager.setReaderTheme(readerTheme as any);
      UISettingsManager.setDefaultShow(settings.defaultShow ?? true);
      UISettingsManager.setReaderPosition(settings.position ?? "bottom");
    } catch (error) {
      console.error("Failed to save settings:", error);
      throw error;
    }
  },

  /**
   * 获取书源规则
   */
  async getRules(): Promise<ScraperRule[]> {
    try {
      const db = await initDB();
      const rules = await db.getAll("rules");

      if (!rules || rules.length === 0) {
        // 初始化内置规则
        const tx = db.transaction("rules", "readwrite");
        for (const rule of BUILTIN_RULES) {
          await tx.store.put(rule);
        }
        await tx.done;
        return BUILTIN_RULES;
      }

      return rules;
    } catch (error) {
      console.error("Failed to get rules:", error);
      return BUILTIN_RULES;
    }
  },

  /**
   * 保存书源规则
   */
  async saveRules(rules: ScraperRule[]): Promise<void> {
    try {
      const db = await initDB();
      const tx = db.transaction("rules", "readwrite");

      // 清空旧规则
      await tx.store.clear();

      // 保存新规则
      for (const rule of rules) {
        await tx.store.put(rule);
      }

      await tx.done;
    } catch (error) {
      console.error("Failed to save rules:", error);
      throw error;
    }
  },

  /**
   * 获取快捷键设置
   * 注意：v3 版本后，快捷键已迁移到 localStorage
   */
  async getShortcuts(): Promise<Shortcut[]> {
    try {
      const { ShortcutsManager } = await import("./shortcuts-manager");
      return ShortcutsManager.getShortcuts();
    } catch (error) {
      console.error("Failed to get shortcuts:", error);
      return this.getDefaultShortcuts();
    }
  },

  /**
   * 保存快捷键设置
   * 注意：v3 版本后，快捷键已迁移到 localStorage
   */
  async saveShortcuts(shortcuts: Shortcut[]): Promise<void> {
    try {
      const { ShortcutsManager } = await import("./shortcuts-manager");
      ShortcutsManager.setShortcuts(shortcuts);
    } catch (error) {
      console.error("Failed to save shortcuts:", error);
      throw error;
    }
  },

  /**
   * 获取默认快捷键
   */
  getDefaultShortcuts(): Shortcut[] {
    return [
      { id: "toggle", label: "显示/隐藏阅读条", keys: ["Alt", "S"] },
      { id: "prev", label: "上一页", keys: ["ArrowLeft"] },
      { id: "next", label: "下一页", keys: ["ArrowRight"] },
      { id: "boss", label: "老板键 (瞬间隐藏)", keys: ["Escape"] },
      { id: "switchBook", label: "小说切换", keys: ["Alt", "B"] },
      { id: "toggleTheme", label: "阅读条主题切换", keys: ["Alt", "T"] },
    ];
  },

  /**
   * 清空所有数据
   */
  async clearAll(): Promise<void> {
    try {
      const db = await initDB();
      const tx = db.transaction(
        ["books", "chapters", "rules", "metadata", "downloads"],
        "readwrite",
      );

      await tx.objectStore("books").clear();
      await tx.objectStore("chapters").clear();
      await tx.objectStore("rules").clear();
      await tx.objectStore("metadata").clear();
      await tx.objectStore("downloads").clear();

      await tx.done;
    } catch (error) {
      console.error("Failed to clear IDB:", error);
      throw error;
    }
  },

  /**
   * 获取存储使用情况
   */
  async getStorageInfo(): Promise<{
    totalBooks: number;
    totalChapters: number;
    estimatedSize: string;
  }> {
    try {
      const db = await initDB();
      const books = await db.getAll("books");
      const chapters = await db.getAll("chapters");

      let totalBytes = 0;
      totalBytes += JSON.stringify(books).length;
      totalBytes += JSON.stringify(chapters).length;

      const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      };

      return {
        totalBooks: books.length,
        totalChapters: chapters.length,
        estimatedSize: formatSize(totalBytes),
      };
    } catch (error) {
      console.error("Failed to get storage info:", error);
      return {
        totalBooks: 0,
        totalChapters: 0,
        estimatedSize: "0 B",
      };
    }
  },
};

/**
 * 下载记录管理器
 * 管理用户导出/下载的书籍记录
 */
export const DownloadRecordManager = {
  /**
   * 创建下载记录
   */
  async createRecord(
    bookId: string,
    book: Book,
    chapters: BookChapter[],
    format: "html" | "epub" | "txt" = "html",
  ): Promise<DownloadRecord> {
    try {
      const db = await initDB();
      const fileName = `${book.title}_${book.author || "未知作者"}.${format}`;
      const fileSize = JSON.stringify(chapters).length;

      const record: DownloadRecord = {
        id: `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        bookId,
        title: book.title,
        author: book.author,
        format,
        fileSize,
        downloadedAt: Date.now(),
        fileName,
        chapterCount: chapters.length,
        status: "success",
        sourceUrl: book.bookUrl,
      };

      await db.add("downloads", record);
      return record;
    } catch (error) {
      console.error("Failed to create download record:", error);
      throw error;
    }
  },

  /**
   * 获取所有下载记录
   */
  async getAllRecords(): Promise<DownloadRecord[]> {
    try {
      const db = await initDB();
      const records = await db.getAll("downloads");
      return records.sort((a, b) => b.downloadedAt - a.downloadedAt);
    } catch (error) {
      console.error("Failed to get download records:", error);
      return [];
    }
  },

  /**
   * 获取特定书籍的下载记录
   */
  async getRecordsByBookId(bookId: string): Promise<DownloadRecord[]> {
    try {
      const db = await initDB();
      const tx = db.transaction("downloads", "readonly");
      const index = tx.store.index("by-bookId");
      const records = await index.getAll(bookId);
      await tx.done;
      return records.sort((a, b) => b.downloadedAt - a.downloadedAt);
    } catch (error) {
      console.error(`Failed to get records for book ${bookId}:`, error);
      return [];
    }
  },

  /**
   * 获取最近的下载记录
   */
  async getRecentRecords(limit: number = 10): Promise<DownloadRecord[]> {
    try {
      const db = await initDB();
      const tx = db.transaction("downloads", "readonly");
      const index = tx.store.index("by-downloadedAt");
      const records = await index.getAll();
      await tx.done;
      return records.reverse().slice(0, limit);
    } catch (error) {
      console.error("Failed to get recent records:", error);
      return [];
    }
  },

  /**
   * 删除下载记录
   */
  async deleteRecord(recordId: string): Promise<void> {
    try {
      const db = await initDB();
      await db.delete("downloads", recordId);
    } catch (error) {
      console.error("Failed to delete record:", error);
      throw error;
    }
  },

  /**
   * 删除特定书籍的所有下载记录
   */
  async deleteRecordsByBookId(bookId: string): Promise<void> {
    try {
      const db = await initDB();
      const tx = db.transaction("downloads", "readwrite");
      const index = tx.store.index("by-bookId");
      const records = await index.getAll(bookId);

      for (const record of records) {
        await tx.store.delete(record.id);
      }

      await tx.done;
    } catch (error) {
      console.error(`Failed to delete records for book ${bookId}:`, error);
      throw error;
    }
  },

  /**
   * 获取下载统计信息
   */
  async getDownloadStats(): Promise<{
    totalRecords: number;
    totalSize: number;
    formatBreakdown: { html: number; epub: number; txt: number };
    recentCount: number;
  }> {
    try {
      const db = await initDB();
      const records = await db.getAll("downloads");

      const formatBreakdown: { html: number; epub: number; txt: number } = {
        html: 0,
        epub: 0,
        txt: 0,
      };

      let totalSize = 0;
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      let recentCount = 0;

      for (const record of records) {
        formatBreakdown[record.format]++;
        totalSize += record.fileSize;
        if (record.downloadedAt > sevenDaysAgo) {
          recentCount++;
        }
      }

      return {
        totalRecords: records.length,
        totalSize,
        formatBreakdown,
        recentCount,
      };
    } catch (error) {
      console.error("Failed to get download stats:", error);
      return {
        totalRecords: 0,
        totalSize: 0,
        formatBreakdown: { html: 0, epub: 0, txt: 0 },
        recentCount: 0,
      };
    }
  },

  /**
   * 清空所有下载记录
   */
  async clearAllRecords(): Promise<void> {
    try {
      const db = await initDB();
      await db.clear("downloads");
    } catch (error) {
      console.error("Failed to clear download records:", error);
      throw error;
    }
  },
};

/**
 * 数据库初始化和迁移工具
 * 用于确保所有数据正确保存到 IndexedDB
 */
export const IDBMigrationManager = {
  /**
   * 初始化所有默认数据
   * 在应用首次启动时调用
   */
  async initializeDefaults(): Promise<void> {
    try {
      // 初始化设置
      const settings = await IDBStorageManager.getSettings();
      await IDBStorageManager.saveSettings(settings);

      // 初始化快捷键
      const shortcuts = await IDBStorageManager.getShortcuts();
      await IDBStorageManager.saveShortcuts(shortcuts);

      // 初始化规则
      const rules = await IDBStorageManager.getRules();
      await IDBStorageManager.saveRules(rules);

      console.log("[IDB] Default data initialized successfully");
    } catch (error) {
      console.error("[IDB] Failed to initialize defaults:", error);
      throw error;
    }
  },

  /**
   * 验证数据完整性
   */
  async verifyDataIntegrity(): Promise<{
    rules: boolean;
    books: boolean;
    chapters: boolean;
  }> {
    try {
      const db = await initDB();

      const rules = await db.getAll("rules");
      const books = await db.getAll("books");
      const chapters = await db.getAll("chapters");

      return {
        rules: rules.length > 0,
        books: books.length > 0,
        chapters: chapters.length > 0,
      };
    } catch (error) {
      console.error("[IDB] Failed to verify data integrity:", error);
      return {
        rules: false,
        books: false,
        chapters: false,
      };
    }
  },

  /**
   * 清理并重新初始化数据库
   * 谨慎使用！
   */
  async resetDatabase(): Promise<void> {
    try {
      await IDBStorageManager.clearAll();
      await this.initializeDefaults();
      console.log("[IDB] Database reset successfully");
    } catch (error) {
      console.error("[IDB] Failed to reset database:", error);
      throw error;
    }
  },

  /**
   * 导出所有数据为 JSON
   */
  async exportAllData(): Promise<{
    settings: any;
    shortcuts: Shortcut[];
    rules: ScraperRule[];
    books: Book[];
    chapters: any[];
    downloads: DownloadRecord[];
  }> {
    try {
      const db = await initDB();

      // 从 localStorage 读取设置和快捷键
      const { ThemeManager } = await import("./theme-manager");
      const { ShortcutsManager } = await import("./shortcuts-manager");
      const { UISettingsManager } = await import("./ui-settings-manager");

      const themeConfig = ThemeManager.getThemeConfig();
      const uiSettings = UISettingsManager.getUISettings();
      const settings = {
        theme: themeConfig,
        ui: uiSettings,
      };

      const shortcuts = ShortcutsManager.getShortcuts();

      // 从 IDB 读取其他数据
      const rules = await db.getAll("rules");
      const books = await db.getAll("books");
      const chapters = await db.getAll("chapters");
      const downloads = await db.getAll("downloads");

      return {
        settings,
        shortcuts,
        rules,
        books,
        chapters,
        downloads,
      };
    } catch (error) {
      console.error("[IDB] Failed to export data:", error);
      throw error;
    }
  },
};
