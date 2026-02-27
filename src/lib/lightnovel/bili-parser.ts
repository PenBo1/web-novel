// 哔哩轻小说解析器，完整实现参考 bili_novel_source.dart

import type { Volume, NovelInfo, Chapter } from "./types"
import { extractBiliNovelId } from "./url-parser"
import { cleanBiliContent, replaceImageSrc, removeElements, removeElementsByPattern } from "./html-cleaner"

const BILI_DOMAIN = "https://www.bilinovel.com"
const USER_AGENT = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
const COOKIE = "night=0"

// 下载速率限制
const DOWNLOAD_DELAY = 100

/**
 * 获取哔哩轻小说的基本信息
 */
export const fetchBiliNovelInfo = async (novelId: string) => {
  const url = `${BILI_DOMAIN}/novel/${novelId}.html`
  const response = await fetch(url, {
    headers: {
      "Accept-Language": "zh-CN,zh;q=0.9",
      "User-Agent": USER_AGENT
    }
  })

  if (!response.ok) {
    throw new Error("获取小说信息失败，请检查 ID 是否正确")
  }

  const arrayBuffer = await response.arrayBuffer()
  const decoder = new TextDecoder("utf-8")
  const html = decoder.decode(arrayBuffer)
  
  const doc = new DOMParser().parseFromString(html, "text/html")

  return {
    title: doc.querySelector(".book-title")?.textContent?.trim(),
    author: doc.querySelector(".book-rand-a span")?.textContent?.trim(),
    cover: doc.querySelector(".book-layout img")?.getAttribute("src"),
    status: doc.querySelector(".book-cell .book-meta+.book-meta")?.textContent?.trim(),
    description: doc.querySelector("#bookSummary")?.textContent?.trim()
  }
}

/**
 * 获取哔哩轻小说的目录
 */
export const fetchBiliCatalog = async (novelId: string): Promise<Volume[]> => {
  const url = `${BILI_DOMAIN}/novel/${novelId}/catalog`
  const response = await fetch(url, {
    headers: {
      "Accept-Language": "zh-CN,zh;q=0.9",
      "User-Agent": USER_AGENT
    }
  })

  if (!response.ok) {
    throw new Error("获取目录失败")
  }

  const arrayBuffer = await response.arrayBuffer()
  const decoder = new TextDecoder("utf-8")
  const html = decoder.decode(arrayBuffer)
  
  const doc = new DOMParser().parseFromString(html, "text/html")

  const volumes: Volume[] = []
  let currentVolume: Volume | null = null

  const items = doc.querySelectorAll(".volume-chapters > li")

  items.forEach((item) => {
    if (item.classList.contains("chapter-bar")) {
      // 卷标题
      if (currentVolume) {
        volumes.push(currentVolume)
      }
      currentVolume = {
        title: item.textContent?.trim() || "",
        chapters: []
      }
    } else if (item.classList.contains("volume-cover")) {
      // 卷封面
      const img = item.querySelector("a img")
      if (img && currentVolume) {
        currentVolume.cover = img.getAttribute("src") || undefined
      }
    } else if (item.classList.contains("jsChapter")) {
      // 章节
      const link = item.querySelector("a")
      if (link && currentVolume) {
        const href = link.getAttribute("href")
        if (href && !href.includes("javascript")) {
          currentVolume.chapters.push({
            title: link.textContent?.trim() || "",
            url: `${BILI_DOMAIN}${href}`
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
 * 获取 shuffle 参数
 */
const getShuffleParams = (doc: Document): { fixedLength: number; seed: number; a: number; c: number; mod: number } | null => {
  const scripts = doc.querySelectorAll("script")
  let script: Element | null = null
  
  for (const s of scripts) {
    const src = s.getAttribute("src") || ""
    if (src.includes("chapterlog.js?v")) {
      script = s
      break
    }
  }
  
  if (!script) {
    return null
  }
  
  const chapterIdMatch = doc.documentElement.outerHTML.match(/chapterid:'(\d+)'/)
  const chapterId = chapterIdMatch ? parseInt(chapterIdMatch[1]) : null
  
  if (!chapterId) {
    return null
  }
  
  return {
    fixedLength: 20,
    seed: chapterId * 126 + 232,
    a: 9302,
    c: 49397,
    mod: 233280
  }
}

/**
 * 打乱数组（Fisher-Yates 算法）
 */
const shuffleArray = (arr: number[], params: { seed: number; a: number; c: number; mod: number }): void => {
  let seed = params.seed
  const a = params.a
  const c = params.c
  const mod = params.mod
  
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * a + c) % mod
    const j = Math.floor((seed / mod) * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
}

/**
 * 打乱内容中的段落
 */
const shuffleContent = (content: Element, params: { fixedLength: number; seed: number; a: number; c: number; mod: number }): void => {
  const pElements = Array.from(content.querySelectorAll("p")).filter(p => p.textContent?.trim())
  
  if (pElements.length === 0) {
    return
  }
  
  const fixed: number[] = []
  const shuffled: number[] = []
  
  for (let i = 0; i < pElements.length; i++) {
    if (i < params.fixedLength) {
      fixed.push(i)
    } else {
      shuffled.push(i)
    }
  }
  
  if (pElements.length > params.fixedLength) {
    shuffleArray(shuffled, params)
  }
  
  const indices = [...fixed, ...shuffled]
  const mapped: Element[] = new Array(pElements.length)
  
  for (let i = 0; i < pElements.length; i++) {
    mapped[indices[i]] = pElements[i]
  }
  
  let replacedIndex = 0
  const children = Array.from(content.children)
  
  for (let i = 0; i < children.length; i++) {
    const node = children[i]
    if (node.tagName.toLowerCase() === "p" && node.textContent?.trim()) {
      const newElement = mapped[replacedIndex++].cloneNode(true) as Element
      content.replaceChild(newElement, node)
    }
  }
}

/**
 * 获取章节一页内容
 */
const getChapterPage = async (url: string): Promise<{
  title?: string
  content: Element
  prevPageUrl?: string
  nextPageUrl?: string
  prevChapterUrl?: string
  nextChapterUrl?: string
}> => {
  await new Promise(resolve => setTimeout(resolve, DOWNLOAD_DELAY))
  
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "*/*",
      "Accept-Language": "zh-CN,zh;q=0.9",
      "Cookie": COOKIE
    }
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  
  const arrayBuffer = await response.arrayBuffer()
  const decoder = new TextDecoder("utf-8")
  const html = decoder.decode(arrayBuffer)
  
  const doc = new DOMParser().parseFromString(html, "text/html")
  
  let title: string | undefined
  if (!url.includes("_")) {
    title = doc.querySelector("#atitle")?.textContent?.trim()
  }
  
  const selectors = ["#acontent", ".bcontent"]
  let content: Element | null = null
  for (const selector of selectors) {
    content = doc.querySelector(selector)
    if (content) break
  }
  
  if (!content) {
    throw new Error("无法提取章节内容")
  }
  
  // 按照 Dart 实现的顺序移除元素
  removeElements(Array.from(content.querySelectorAll("div")))
  removeElements(Array.from(content.querySelectorAll("ins")))
  removeElements(Array.from(content.querySelectorAll("figure")))
  removeElements(Array.from(content.querySelectorAll("fig")))
  removeElements(Array.from(content.querySelectorAll("br")))
  removeElements(Array.from(content.querySelectorAll("script")))
  removeElements(Array.from(content.querySelectorAll(".tp")))
  removeElements(Array.from(content.querySelectorAll(".bd")))
  removeElementsByPattern(content, "[a-z]\\d{4}", { matchId: true })
  
  // 处理内容打乱
  const shuffleParams = getShuffleParams(doc)
  if (shuffleParams) {
    shuffleContent(content, shuffleParams)
  }
  
  // 处理图片懒加载
  replaceImageSrc(content)
  
  // 解析导航链接
  let prevPageUrl: string | undefined
  let nextPageUrl: string | undefined
  let prevChapterUrl: string | undefined
  let nextChapterUrl: string | undefined
  
  const urlMatch = doc.documentElement.outerHTML.match(/url_previous:'(.*?)',url_next:'(.*?)'/)
  const prevUrl = urlMatch?.[1]
  const nextUrl = urlMatch?.[2]
  
  const prevLink = doc.querySelector("#footlink a:first-child")
  const nextLink = doc.querySelector("#footlink a:last-child")
  
  if (prevLink && (prevLink.textContent === "上一页" || prevLink.textContent === "上一頁") && prevUrl) {
    prevPageUrl = BILI_DOMAIN + prevUrl
  } else if (prevLink && prevUrl) {
    prevChapterUrl = BILI_DOMAIN + prevUrl
  }
  
  if (nextLink && (nextLink.textContent === "下一页" || nextLink.textContent === "下一頁") && nextUrl) {
    nextPageUrl = BILI_DOMAIN + nextUrl
  } else if (nextLink && nextUrl) {
    nextChapterUrl = BILI_DOMAIN + nextUrl
  }
  
  return {
    title,
    content,
    prevPageUrl,
    nextPageUrl,
    prevChapterUrl,
    nextChapterUrl
  }
}

/**
 * 解析哔哩轻小说
 */
export const parseBilibiliNovel = async (input: string): Promise<NovelInfo> => {
  // 提取 ID
  const novelId = extractBiliNovelId(input)

  // 获取基本信息
  const info = await fetchBiliNovelInfo(novelId)

  if (!info.title) {
    throw new Error("无法获取小说信息，请检查 ID 是否正确")
  }

  // 获取目录
  const volumes = await fetchBiliCatalog(novelId)

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
    source: "bili"
  }
}

/**
 * 获取章节内容（用于下载）
 */
export const getBiliChapterContent = async (chapter: Chapter): Promise<string> => {
  const doc = new DOMParser().parseFromString("<html><body></body></html>", "text/html")
  
  let nextPageUrl: string | undefined = chapter.url
  
  while (nextPageUrl) {
    const page = await getChapterPage(nextPageUrl)
    
    // 将内容添加到文档
    const children = Array.from(page.content.children)
    children.forEach(child => {
      doc.body?.appendChild(child.cloneNode(true))
    })
    
    nextPageUrl = page.nextPageUrl
  }
  
  // 移除换行符
  if (doc.body) {
    removeLineBreaks(doc.body)
  }
  
  return doc.body?.innerHTML || ""
}

/**
 * 递归移除元素中的换行符
 */
const removeLineBreaks = (element: Element): void => {
  if (element.children.length > 0) {
    Array.from(element.children).forEach(child => {
      removeLineBreaks(child as Element)
    })
  } else if (element.textContent) {
    element.textContent = element.textContent.replace(/\n/g, "")
  }
}
