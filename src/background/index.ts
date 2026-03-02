import axios from "axios";
import { IDBStorageManager } from "@/lib/idb-storage";

/**
 * Web-novel 后台 Service Worker
 * 重点：使用 Axios 进行网络请求代理 + IndexedDB 数据提供
 */
console.log("[Background] Web-novel service worker initialized with Axios and IndexedDB support.");

// 不再在 onInstalled 时初始化存储，改为在应用启动时由各个页面初始化

/**
 * 跨域请求代理监听
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ============ IndexedDB 数据请求 ============
  if (message.action === "GET_BOOK_CHAPTERS") {
    const { bookId } = message.payload;
    console.log(`[Background] GET_BOOK_CHAPTERS request for book: ${bookId}`);
    
    IDBStorageManager.getBookChapters(bookId)
      .then((chapters) => {
        console.log(`[Background] Returning ${chapters.length} chapters for book ${bookId}`);
        sendResponse({ success: true, data: chapters });
      })
      .catch((error) => {
        console.error(`[Background] Failed to get chapters:`, error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // 支持异步 sendResponse
  }

  if (message.action === "GET_BOOKSHELF") {
    console.log(`[Background] GET_BOOKSHELF request`);
    
    IDBStorageManager.getBookshelf()
      .then((books) => {
        console.log(`[Background] Returning ${books.length} books`);
        sendResponse({ success: true, data: books });
      })
      .catch((error) => {
        console.error(`[Background] Failed to get bookshelf:`, error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }

  if (message.action === "GET_ACTIVE_BOOK_ID") {
    console.log(`[Background] GET_ACTIVE_BOOK_ID request`);
    
    IDBStorageManager.getActiveBookId()
      .then((bookId) => {
        console.log(`[Background] Active book ID: ${bookId}`);
        sendResponse({ success: true, data: bookId });
      })
      .catch((error) => {
        console.error(`[Background] Failed to get active book ID:`, error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }

  // ============ 网络请求代理 ============
  if (message.action === "SCRAPER_FETCH") {
    const { url, method, data, headers } = message.payload;

    // 调试日志：如果这里不打印，说明消息没有传导到后台
    console.log(
      `[Background] 收到抓取请求: ${method?.toUpperCase() || "GET"} -> ${url}`,
    );

    // 如果数据是 JSON 字符串且包含冒号，尝试转换为 URLSearchParams (小说站通用格式)
    let requestData = data;
    let contentType = "application/x-www-form-urlencoded";

    if (method?.toUpperCase() === "POST" && typeof data === "string") {
      if (data.includes("{") && data.includes(":")) {
        try {
          const cleanStr = data.replace(/(\w+):/g, '"$1":').replace(/'/g, '"');
          const obj = JSON.parse(cleanStr);
          const params = new URLSearchParams();
          for (const key in obj) {
            params.append(key, obj[key]);
          }
          requestData = params.toString();
        } catch (e) {
          requestData = data;
        }
      }
    }

    axios({
      url,
      method: method || "get",
      data: requestData,
      timeout: 20000, // 增加超时到 20s
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Content-Type": contentType,
        ...headers,
      },
      // 已移除不兼容的 adapter 配置，使用 Axios 默认适配器
    })
      .then((response) => {
        console.log(
          `[Background] 抓取成功: ${url} (长度: ${String(response.data).length})`,
        );
        sendResponse({ success: true, data: response.data });
      })
      .catch((error) => {
        console.error(`[Background] 抓取失败 [${url}]:`, error.message);
        sendResponse({ success: false, error: error.message });
      });

    return true; // 必须返回 true 以支持异步 sendResponse
  }
});
