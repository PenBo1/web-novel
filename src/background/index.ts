import axios from "axios"
import { STORAGE_KEYS } from "@/lib/storage"

/**
 * Web-novel 后台 Service Worker
 * 重点：使用 Axios 进行网络请求代理
 */
console.log("[Background] Web-novel service worker initialized with Axios.")

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: {
        pluginTheme: "21st-dark",
        readerTheme: "21st-dark",
        defaultShow: true,
        position: "bottom"
      },
      [STORAGE_KEYS.SHORTCUTS]: [
        { id: "toggleReader", label: "显示/隐藏阅读条", keys: ["Alt", "C"] },
        { id: "nextPage", label: "下一页", keys: ["ArrowRight"] },
        { id: "prevPage", label: "上一页", keys: ["ArrowLeft"] },
        { id: "nextChapter", label: "下一章", keys: ["Alt", "ArrowDown"] },
        { id: "prevChapter", label: "上一章", keys: ["Alt", "ArrowUp"] },
        { id: "selectNovel", label: "选择小说", keys: ["Alt", "S"] },
        { id: "switchTheme", label: "切换主题", keys: ["Alt", "T"] }
      ],
      [STORAGE_KEYS.BOOKSHELF]: [],
      [STORAGE_KEYS.IS_VISIBLE]: true
    })
  }
})

/**
 * 跨域请求代理监听
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "SCRAPER_FETCH") {
    const { url, method, data, headers } = message.payload

    // 调试日志：如果这里不打印，说明消息没有传导到后台
    console.log(`[Background] 收到抓取请求: ${method?.toUpperCase() || 'GET'} -> ${url}`)

    // 如果数据是 JSON 字符串且包含冒号，尝试转换为 URLSearchParams (小说站通用格式)
    let requestData = data
    let contentType = "application/x-www-form-urlencoded"

    if (method?.toUpperCase() === "POST" && typeof data === "string") {
      if (data.includes("{") && data.includes(":")) {
        try {
          const cleanStr = data.replace(/(\w+):/g, '"$1":').replace(/'/g, '"')
          const obj = JSON.parse(cleanStr)
          const params = new URLSearchParams()
          for (const key in obj) {
            params.append(key, obj[key])
          }
          requestData = params.toString()
        } catch (e) {
          requestData = data
        }
      }
    }

    axios({
      url,
      method: method || "get",
      data: requestData,
      timeout: 20000, // 增加超时到 20s
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Content-Type": contentType,
        ...headers
      },
      // 已移除不兼容的 adapter 配置，使用 Axios 默认适配器

    })
      .then(response => {
        console.log(`[Background] 抓取成功: ${url} (长度: ${String(response.data).length})`)
        sendResponse({ success: true, data: response.data })
      })
      .catch(error => {
        console.error(`[Background] 抓取失败 [${url}]:`, error.message)
        sendResponse({ success: false, error: error.message })
      })

    return true // 必须返回 true 以支持异步 sendResponse
  }
})
