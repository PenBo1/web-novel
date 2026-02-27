// 轻小说文库解析器，完整实现参考 wenku_novel_source.dart

import type { Volume, NovelInfo, Chapter } from "./types"
import { extractWenkuNovelId, resolveUrl } from "./url-parser"
import { cleanWenkuContent, removeElements } from "./html-cleaner"

const WENKU_DOMAIN = "https://www.wenku8.net"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"

// 下载速率限制
const DOWNLOAD_DELAY = 50

/**
 * 使用 GBK 编码解码响应
 * 轻小说文库使用 GBK 编码，需要特殊处理
 */
const decodeGBK = (arrayBuffer: ArrayBuffer): string => {
  // 尝试使用 TextDecoder 的 gbk 编码（如果浏览器支持）
  try {
    const decoder = new TextDecoder("gbk")
    return decoder.decode(arrayBuffer)
  } catch {
    // 降级方案：使用 UTF-8 解码，然后尝试修复常见的 GBK 乱码
    const decoder = new TextDecoder("utf-8")
    let html = decoder.decode(arrayBuffer)
    
    // 如果包含乱码特征，尝试使用 latin1 重新解码
    if (html.includes("?") || html.includes("ufffd")) {
      try {
        const latin1Decoder = new TextDecoder("iso-8859-1")
        html = latin1Decoder.decode(arrayBuffer)
      } catch {
        // 保持原始解码结果
      }
    }
    
    return html
  }
}

/**
 * 获取轻小说文库的基本信息
 */
export const fetchWenkuNovelInfo = async (novelId: string) => {
  const url = `${WENKU_DOMAIN}/book/${novelId}.htm`
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT
    }
  })

  if (!response.ok) {
    throw new Error("获取小说信息失败，请检查 ID 是否正确")
  }

  const arrayBuffer = await response.arrayBuffer()
  const html = decodeGBK(arrayBuffer)
  
  const doc = new DOMParser().parseFromString(html, "text/html")

  const titleElement = doc.querySelector("#content table:nth-child(1) span b")
  const details = doc.querySelectorAll("#content table:nth-child(1) tr:nth-child(2) td")

  return {
    title: titleElement?.textContent?.trim(),
    author: details[1]?.textContent?.replace("小说作者：", "").trim(),
    status: details[2]?.textContent?.replace("文章状态：", "").trim(),
    cover: doc.querySelector("#content table img")?.getAttribute("src"),
    description: doc.querySelector("#content table:nth-child(3) td:nth-child(2) span:last-child")?.textContent?.trim(),
    catalogLink: doc.querySelector("legend + div > a")?.getAttribute("href")
  }
}

/**
 * 获取轻小说文库的目录
 */
export const fetchWenkuCatalog = async (catalogUrl: string): Promise<Volume[]> => {
  await new Promise(resolve => setTimeout(resolve, DOWNLOAD_DELAY))
  
  const response = await fetch(catalogUrl, {
    headers: {
      "User-Agent": USER_AGENT
    }
  })

  if (!response.ok) {
    throw new Error("获取目录失败")
  }

  const arrayBuffer = await response.arrayBuffer()
  const html = decodeGBK(arrayBuffer)
  
  const doc = new DOMParser().parseFromString(html, "text/html")

  const volumes: Volume[] = []
  let currentVolume: Volume | null = null

  const tdList = doc.querySelectorAll("table td")

  tdList.forEach((td) => {
    const styleClass = td.getAttribute("class")

    if (styleClass === "vcss") {
      // 卷标题
      if (currentVolume && currentVolume.chapters.length > 0) {
        volumes.push(currentVolume)
      }
      currentVolume = {
        title: td.textContent?.trim() || "",
        chapters: []
      }
    } else if (styleClass === "ccss" && currentVolume) {
      // 章节
      const link = td.querySelector("a")
      if (link) {
        const href = link.getAttribute("href")
        if (href) {
          currentVolume.chapters.push({
            title: link.textContent?.trim() || "",
            url: resolveUrl(catalogUrl, href)
          })
        }
      }
    }
  })

  if (currentVolume && currentVolume.chapters.length > 0) {
    volumes.push(currentVolume)
  }

  return volumes
}

/**
 * 将文本节点转换为段落元素
 */
const wrapDocument = (content: Element): Document => {
  const doc = new DOMParser().parseFromString("<html><body></body></html>", "text/html")
  
  const nodes = Array.from(content.childNodes)
  
  nodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node as Text).data.trim()
      if (text) {
        const p = doc.createElement("p")
        p.textContent = text
        doc.body?.appendChild(p)
      }
    } else {
      doc.body?.appendChild(node.cloneNode(true))
    }
  })
  
  // 移除链接标签，保留内容
  const links = doc.querySelectorAll("a")
  links.forEach(link => {
    const parent = link.parentNode
    if (parent) {
      while (link.firstChild) {
        parent.insertBefore(link.firstChild, link)
      }
      parent.removeChild(link)
    }
  })
  
  return doc
}

/**
 * 获取章节内容（用于下载）
 */
const getWenkuChapterContent = async (url: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, DOWNLOAD_DELAY))
  
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const html = decodeGBK(arrayBuffer)
  
  const doc = new DOMParser().parseFromString(html, "text/html")
  
  const content = doc.querySelector("#content")
  
  if (!content) {
    throw new Error("无法提取章节内容")
  }
  
  // 按照 Dart 实现的顺序移除元素
  removeElements(Array.from(content.querySelectorAll("#contentdp")))
  removeElements(Array.from(content.querySelectorAll("br")))
  removeElements(Array.from(content.querySelectorAll("script")))
  
  // 清理内容
  cleanWenkuContent(content)
  
  // 将文本节点转换为段落
  const wrappedDoc = wrapDocument(content)
  
  return wrappedDoc.body?.innerHTML || ""
}

/**
 * 解析轻小说文库
 */
export const parseWenkuNovel = async (input: string): Promise<NovelInfo> => {
  // 提取 ID
  const novelId = extractWenkuNovelId(input)

  // 获取基本信息
  const info = await fetchWenkuNovelInfo(novelId)

  if (!info.title) {
    throw new Error("无法获取小说信息，请检查 ID 是否正确")
  }

  if (!info.catalogLink) {
    throw new Error("无法获取目录链接")
  }

  // 解析目录 URL
  const catalogUrl = info.catalogLink.startsWith("http")
    ? info.catalogLink
    : `${WENKU_DOMAIN}${info.catalogLink.startsWith("/") ? "" : "/"}${info.catalogLink}`

  // 获取目录
  const volumes = await fetchWenkuCatalog(catalogUrl)

  if (volumes.length === 0) {
    throw new Error("未找到任何章节")
  }

  return {
    id: novelId,
    title: info.title,
    author: info.author || "未知",
    cover: info.cover,
    status: info.status || "未知",
    description: info.description,
    volumes,
    source: "wenku"
  }
}

/**
 * 获取章节内容（用于下载）
 */
export const getWenkuChapter = async (chapter: Chapter): Promise<string> => {
  return getWenkuChapterContent(chapter.url)
}
