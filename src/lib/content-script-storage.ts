/**
 * 内容脚本存储访问层
 * 由于内容脚本无法直接访问 IndexedDB，
 * 通过消息传递与后台脚本通信来获取数据
 */

import type { Book, BookChapter } from "./types";

/**
 * 发送消息到后台脚本并等待响应
 */
function sendMessageToBackground<T>(
  action: string,
  payload?: any
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action, payload },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("[ContentScript] Message error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || "Unknown error"));
        }
      }
    );
  });
}

/**
 * 内容脚本存储管理器
 * 提供与 StorageManager 兼容的 API，但通过消息传递实现
 */
export const ContentScriptStorageManager = {
  /**
   * 获取书籍的章节内容
   */
  async getBookChapters(bookId: string): Promise<BookChapter[]> {
    try {
      console.log(`[ContentScriptStorage] Getting chapters for book: ${bookId}`);
      const chapters = await sendMessageToBackground<BookChapter[]>(
        "GET_BOOK_CHAPTERS",
        { bookId }
      );
      console.log(`[ContentScriptStorage] Got ${chapters.length} chapters`);
      return chapters;
    } catch (error) {
      console.error("[ContentScriptStorage] Failed to get chapters:", error);
      return [];
    }
  },

  /**
   * 获取书架列表
   */
  async getBookshelf(): Promise<Book[]> {
    try {
      console.log(`[ContentScriptStorage] Getting bookshelf`);
      const books = await sendMessageToBackground<Book[]>("GET_BOOKSHELF");
      console.log(`[ContentScriptStorage] Got ${books.length} books`);
      return books;
    } catch (error) {
      console.error("[ContentScriptStorage] Failed to get bookshelf:", error);
      return [];
    }
  },

  /**
   * 获取当前激活的书籍ID
   */
  async getActiveBookId(): Promise<string | null> {
    try {
      console.log(`[ContentScriptStorage] Getting active book ID`);
      const bookId = await sendMessageToBackground<string | null>(
        "GET_ACTIVE_BOOK_ID"
      );
      console.log(`[ContentScriptStorage] Active book ID: ${bookId}`);
      return bookId;
    } catch (error) {
      console.error("[ContentScriptStorage] Failed to get active book ID:", error);
      return null;
    }
  },
};
