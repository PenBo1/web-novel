import { useEffect, useRef, useState } from "react"
import type { PlasmoCSConfig } from "plasmo"
import { BUILTIN_THEMES } from "@/lib/themes/builtin-themes"
import { ScraperEngine } from "@/lib/scraper/engine"
import { BUILTIN_RULES } from "@/lib/scraper/rules"
import { STORAGE_KEYS, StorageManager, getBookContentKey } from "@/lib/storage"
import type { Book, BookChapter, Shortcut } from "@/lib/types"

/**
 * Plasmo 内容脚本配置
 * 匹配所有网页，确保阅读条可以在任何地方呼出
 */
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "toggleReader", label: "显示/隐藏阅读条", keys: ["Alt", "C"] },
  { id: "nextPage", label: "下一页", keys: ["ArrowRight"] },
  { id: "prevPage", label: "上一页", keys: ["ArrowLeft"] },
  { id: "nextChapter", label: "下一章", keys: ["Alt", "ArrowDown"] },
  { id: "prevChapter", label: "上一章", keys: ["Alt", "ArrowUp"] },
  { id: "selectNovel", label: "选择小说", keys: ["Alt", "S"] },
  { id: "switchTheme", label: "切换主题", keys: ["Alt", "T"] }
]

/**
 * 阅读条组件
 * 注入到网页底部的核心交互界面
 */
export default function Reader() {
  const [isVisible, setIsVisible] = useState(false)
  const [chapters, setChapters] = useState<BookChapter[]>([])
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [currentScroll, setCurrentScroll] = useState(0)
  const [settings, setSettings] = useState({
    readerTheme: "21st-dark",
    defaultShow: true,
    position: "bottom" as const
  })
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS)
  const [pageSize, setPageSize] = useState(50)
  const [activeBookId, setActiveBookId] = useState<string | null>(null)
  const [isFetchingChapter, setIsFetchingChapter] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  /**
   * 初始化数据与监听存储变化
   */
  useEffect(() => {
    // 清理旧版 DOM 以防冲突
    const cleanupLegacy = () => {
      const legacy = document.getElementById("page-footer-host")
      if (legacy) legacy.remove()
    }
    cleanupLegacy()
    
    // 监听后期动态生成的旧版 DOM
    const observer = new MutationObserver((mutations) => {
      let found = false
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (n instanceof Element && n.id === "page-footer-host") {
            n.remove()
            found = true
          }
        }
      }
      if (found) cleanupLegacy()
    })
    observer.observe(document.body, { childList: true })
    
    // 初始化加载
    const init = async () => {
      const data = await chrome.storage.local.get([
        STORAGE_KEYS.ACTIVE_CHAPTERS,
        STORAGE_KEYS.ACTIVE_CURRENT_INDEX,
        STORAGE_KEYS.ACTIVE_CURRENT_SCROLL,
        STORAGE_KEYS.IS_VISIBLE,
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.SHORTCUTS,
        STORAGE_KEYS.ACTIVE_BOOK_ID
      ])
      
      if (data[STORAGE_KEYS.ACTIVE_CHAPTERS]) setChapters(data[STORAGE_KEYS.ACTIVE_CHAPTERS])
      if (data[STORAGE_KEYS.ACTIVE_BOOK_ID]) setActiveBookId(data[STORAGE_KEYS.ACTIVE_BOOK_ID])
      
      // 恢复进度
      if (typeof data[STORAGE_KEYS.ACTIVE_CURRENT_INDEX] === "number") {
          setCurrentChapterIndex(data[STORAGE_KEYS.ACTIVE_CURRENT_INDEX])
      }
      if (typeof data[STORAGE_KEYS.ACTIVE_CURRENT_SCROLL] === "number") {
          setCurrentScroll(data[STORAGE_KEYS.ACTIVE_CURRENT_SCROLL])
      }
      
      // 显示状态
      if (typeof data[STORAGE_KEYS.IS_VISIBLE] === "boolean") {
        setIsVisible(data[STORAGE_KEYS.IS_VISIBLE])
      } else {
        setIsVisible(data[STORAGE_KEYS.SETTINGS]?.defaultShow ?? true)
      }

      if (data[STORAGE_KEYS.SETTINGS]) setSettings(prev => ({ ...prev, ...data[STORAGE_KEYS.SETTINGS] }))
      if (data[STORAGE_KEYS.SHORTCUTS]) setShortcuts(data[STORAGE_KEYS.SHORTCUTS])
    }
    init()

    // 存储联动监听
    const handleChange = (changes: chrome.storage.StorageChange, area: string) => {
      if (area !== "local") return
      if (changes[STORAGE_KEYS.ACTIVE_CHAPTERS]) setChapters(changes[STORAGE_KEYS.ACTIVE_CHAPTERS].newValue || [])
      if (changes[STORAGE_KEYS.ACTIVE_BOOK_ID]) setActiveBookId(changes[STORAGE_KEYS.ACTIVE_BOOK_ID].newValue)
      if (changes[STORAGE_KEYS.IS_VISIBLE]) setIsVisible(changes[STORAGE_KEYS.IS_VISIBLE].newValue)
      if (changes[STORAGE_KEYS.SETTINGS]) {
        console.log("[WebNovel] Settings updated:", changes[STORAGE_KEYS.SETTINGS].newValue)
        setSettings(prev => ({ ...prev, ...changes[STORAGE_KEYS.SETTINGS].newValue }))
      }
      if (changes[STORAGE_KEYS.SHORTCUTS]) setShortcuts(changes[STORAGE_KEYS.SHORTCUTS].newValue)
      if (changes[STORAGE_KEYS.ACTIVE_CURRENT_INDEX]) setCurrentChapterIndex(changes[STORAGE_KEYS.ACTIVE_CURRENT_INDEX].newValue)
      if (changes[STORAGE_KEYS.ACTIVE_CURRENT_SCROLL]) setCurrentScroll(changes[STORAGE_KEYS.ACTIVE_CURRENT_SCROLL].newValue)
    }

    chrome.storage.onChanged.addListener(handleChange)
    return () => {
      chrome.storage.onChanged.removeListener(handleChange)
      observer.disconnect()
    }
  }, [])

  /**
   * 自动适应屏幕宽度计算每屏字符数
   */
  useEffect(() => {
    const calculatePageSize = () => {
      const span = document.createElement("span")
      span.style.fontFamily = "'JetBrains Mono', Consolas, 'Courier New', monospace"
      span.style.fontSize = "13px"
      span.style.position = "absolute"
      span.style.visibility = "hidden"
      span.textContent = "我" 
      document.body.appendChild(span)
      const charWidth = span.getBoundingClientRect().width
      document.body.removeChild(span)

      const safeCharWidth = charWidth > 0 ? charWidth : 14
      const availableWidth = window.innerWidth - 120 
      const newSize = Math.floor(availableWidth / safeCharWidth)
      setPageSize(newSize > 0 ? newSize : 50)
    }

    calculatePageSize()
    window.addEventListener("resize", calculatePageSize)
    return () => window.removeEventListener("resize", calculatePageSize)
  }, [])

  /**
   * 核心：自动抓取在线章节内容
   * 当选中的章节内容为空且有来源 URL 时触发
   */
  useEffect(() => {
    if (!isVisible || !activeBookId || chapters.length === 0 || isFetchingChapter) return

    const chapter = chapters[currentChapterIndex]
    if (chapter && !chapter.content && chapter.url) {
      const fetchChapter = async () => {
        setIsFetchingChapter(true)
        try {
          const bookshelf = await StorageManager.getBookshelf()
          const book = bookshelf.find(b => b.id === activeBookId)
          
          if (book?.isScraped && book.sourceId) {
            const rule = BUILTIN_RULES.find(r => r.id === book.sourceId)
            if (rule) {
              const engine = new ScraperEngine(rule)
              const content = await engine.getChapterContent(chapter.url)
              
              if (content) {
                const newChapters = [...chapters]
                // 文本清洗：HTML -> 纯文本
                const cleanContent = content
                  .replace(/<br\s*\/?>/gi, "\n")
                  .replace(/<\/p>/gi, "\n")
                  .replace(/<[^>]+>/g, "")
                  .replace(/&nbsp;/g, " ")
                  .trim()

                newChapters[currentChapterIndex] = { ...chapter, content: cleanContent }
                setChapters(newChapters)

                // 持久化缓存：更新当前槽与书籍仓库
                await chrome.storage.local.set({
                  [STORAGE_KEYS.ACTIVE_CHAPTERS]: newChapters,
                  [getBookContentKey(activeBookId)]: newChapters
                })
              }
            }
          }
        } catch (error) {
          console.error("Failed to fetch chapter content:", error)
        } finally {
          setIsFetchingChapter(false)
        }
      }
      fetchChapter()
    }
  }, [isVisible, currentChapterIndex, chapters, activeBookId, isFetchingChapter])

  /**
   * 后台静默保存阅读进度
   */
  useEffect(() => {
    if (!activeBookId) return

    const save = async () => {
      const updates: any = {
        [STORAGE_KEYS.ACTIVE_CURRENT_INDEX]: currentChapterIndex,
        [STORAGE_KEYS.ACTIVE_CURRENT_SCROLL]: currentScroll
      }
      
      const bookshelf = await StorageManager.getBookshelf()
      
      let changed = false
      const newShelf = bookshelf.map(b => {
          if (b.id === activeBookId) {
              if (b.progress?.chapterIndex !== currentChapterIndex || b.progress?.scroll !== currentScroll) {
                  changed = true
                  return { ...b, progress: { chapterIndex: currentChapterIndex, scroll: currentScroll } }
              }
          }
          return b
      })

      if (changed) updates[STORAGE_KEYS.BOOKSHELF] = newShelf
      await chrome.storage.local.set(updates)

      // 备份到 localStorage 已应对极端清除情况
      try {
          localStorage.setItem(`web_novel_progress_${activeBookId}`, JSON.stringify({
              chapterIndex: currentChapterIndex,
              scroll: currentScroll,
              updatedAt: Date.now()
          }))
      } catch (e) {}
    }

    const timer = setTimeout(save, 500)
    return () => clearTimeout(timer)
  }, [currentChapterIndex, currentScroll, activeBookId])

  /**
   * 动态获取当前主题样式
   */
  const getTheme = () => {
    const theme = BUILTIN_THEMES.find(t => t.id === settings.readerTheme) || BUILTIN_THEMES[0]
    return {
      bg: theme.colors["editor.background"],
      fg: theme.colors["editor.foreground"],
      primary: theme.colors["button.background"] || theme.colors["focusBorder"],
      border: theme.colors["sideBar.border"]
    }
  }
  const theme = getTheme()

  const currentChapter = chapters[currentChapterIndex]
  const contentText = currentChapter?.content || ""
  
  /**
   * 滚动条溢出修正
   */
  useEffect(() => {
    if (contentText && currentScroll >= contentText.length) {
        setCurrentScroll(Math.max(0, contentText.length - pageSize))
    }
  }, [contentText, pageSize])

  // 文字显示逻辑
  const displayText = isFetchingChapter 
    ? "正在从书源抓取章节内容，请稍候..."
    : (contentText
        ? contentText.substring(currentScroll, currentScroll + pageSize).replace(/[\r\n]+/g, "  ")
        : (isFetchingChapter ? "正在抓取中..." : "暂无内容，请检查书源或稍后重试"))

  const percent = contentText.length > 0 
    ? ((currentScroll / contentText.length) * 100).toFixed(1) 
    : "0.0"

  /**
   * 导航处理
   */
  const next = () => {
    if (!contentText && !isFetchingChapter) return
    if (currentScroll + pageSize < contentText.length) {
      setCurrentScroll(prev => prev + pageSize)
    } else if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex(prev => prev + 1)
      setCurrentScroll(0)
    }
  }

  const prev = () => {
    if (!contentText && !isFetchingChapter) return
    if (currentScroll - pageSize >= 0) {
      setCurrentScroll(prev => prev - pageSize)
    } else if (currentChapterIndex > 0) {
      const prevIdx = currentChapterIndex - 1
      const prevLen = chapters[prevIdx]?.content?.length || 0
      setCurrentChapterIndex(prevIdx)
      setCurrentScroll(Math.max(0, prevLen - pageSize))
    }
  }

  const nextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex(prev => prev + 1)
      setCurrentScroll(0)
    }
  }

  const prevChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(prev => prev - 1)
      setCurrentScroll(0)
    }
  }

  const toggleVisibility = () => {
    const newVal = !isVisible
    setIsVisible(newVal)
    chrome.storage.local.set({ [STORAGE_KEYS.IS_VISIBLE]: newVal })
  }

  const switchTheme = () => {
    const current = settings.readerTheme
    let nextTheme = "21st-dark"
    if (current === "21st-dark") nextTheme = "21st-light"
    else if (current === "21st-light") nextTheme = "21st-dark"
    else if (current.includes("dark")) nextTheme = "21st-light"
    
    setSettings(prev => ({ ...prev, readerTheme: nextTheme }))
    chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: { ...settings, readerTheme: nextTheme } })
  }

  /**
   * 键盘快捷键监听
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 输入框内禁用快捷键
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable) return

      const match = (id: string) => {
        const config = shortcuts.find(s => s.id === id)
        if (!config || config.keys.length === 0) return false
        
        const hasCtrl = config.keys.includes("Ctrl")
        const hasAlt = config.keys.includes("Alt")
        const hasShift = config.keys.includes("Shift")
        const hasMeta = config.keys.includes("Meta")
        
        if (e.ctrlKey !== hasCtrl) return false
        if (e.altKey !== hasAlt) return false
        if (e.shiftKey !== hasShift) return false
        if (e.metaKey !== hasMeta) return false

        const mainKey = config.keys.find(k => !["Ctrl", "Alt", "Shift", "Meta"].includes(k))
        if (!mainKey) return false 

        let pressed = e.key
        if (e.code.startsWith("Arrow")) pressed = e.code
        else if (pressed === " ") pressed = "Space"
        else if (pressed.length === 1) pressed = pressed.toUpperCase()

        return pressed === mainKey
      }

      // 切换到书架里的下一本书
      const switchNextBook = async () => {
        const bookshelf = await StorageManager.getBookshelf()
        if (bookshelf.length === 0) return
        
        bookshelf.sort((a, b) => b.addedAt - a.addedAt)
        
        const activeId = (await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_BOOK_ID))[STORAGE_KEYS.ACTIVE_BOOK_ID]
        const currentIndex = bookshelf.findIndex(b => b.id === activeId)
        const nextIndex = (currentIndex + 1) % bookshelf.length
        
        await StorageManager.switchBook(bookshelf[nextIndex].id)
      }

      if (match("toggleReader")) {
        toggleVisibility()
        e.preventDefault()
        return
      }
      if (match("switchTheme")) {
        switchTheme()
        e.preventDefault()
        return
      }
      if (match("selectNovel")) {
        switchNextBook()
        e.preventDefault()
        return
      }

      if (!isVisible) return

      if (match("nextPage")) {
        next()
        e.preventDefault()
      } else if (match("prevPage")) {
        prev()
        e.preventDefault()
      } else if (match("nextChapter")) {
        nextChapter()
        e.preventDefault()
      } else if (match("prevChapter")) {
        prevChapter()
        e.preventDefault()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isVisible, currentChapterIndex, chapters, currentScroll, pageSize, shortcuts, settings, activeBookId])

  if (!isVisible) return null

  return (
    <div 
      key={settings.readerTheme}
      id="web-novel-host"
      style={{
        position: "fixed",
        zIndex: 2147483647,
        left: 0,
        right: 0,
        top: settings.position === "top" ? 0 : "auto",
        bottom: settings.position === "top" ? "auto" : 0,
        pointerEvents: "none",
        height: "28px",
        overflow: "visible",
        display: "flex", // 确保子元素正确布局
        flexDirection: "column",
        justifyContent: settings.position === "top" ? "flex-start" : "flex-end"
      }}
    >
      <div 
        ref={containerRef}
        style={{
          pointerEvents: "auto",
          width: "100%",
          height: "28px",
          backgroundColor: theme.bg,
          color: theme.fg,
          borderTop: settings.position === "bottom" ? `1px solid ${theme.border}` : "none",
          borderBottom: settings.position === "top" ? `1px solid ${theme.border}` : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
          fontSize: "13px",
          boxSizing: "border-box",
          boxShadow: "0 -2px 8px rgba(0,0,0,0.05)",
          transition: "all 0.2s ease"
        }}
      >
        {/* 左侧：内容区域 (占据绝大部分空间) */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", marginRight: "12px" }}>
           <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "6px", 
              marginRight: "12px", 
              opacity: 0.7,
              flexShrink: 0,
              fontSize: "11px",
              fontWeight: "bold",
              userSelect: "none"
           }}>
              <div style={{ 
                width: "6px", 
                height: "6px", 
                borderRadius: "50%", 
                backgroundColor: isFetchingChapter ? "#EAB308" : theme.primary,
                opacity: isFetchingChapter ? 1 : 0.8
              }} />
              <span>{isFetchingChapter ? "FETCHING" : "READY"}</span>
           </div>

           <div style={{ 
              whiteSpace: "pre", 
              overflow: "hidden", 
              textOverflow: "ellipsis",
              lineHeight: "28px",
              cursor: "text"
           }}>
              {displayText}
           </div>
        </div>

        {/* 右侧：信息与控制区 */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0, fontSize: "11px", opacity: 0.8, userSelect: "none" }}>
           <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
             <span style={{ maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentChapter?.title || "No Chapter"}</span>
             <span style={{ opacity: 0.5 }}>|</span>
             <span style={{ fontVariantNumeric: "tabular-nums" }}>{percent}%</span>
             <span style={{ opacity: 0.5 }}>|</span>
             <span style={{ fontVariantNumeric: "tabular-nums" }}>{currentChapterIndex + 1}/{chapters.length}</span>
           </div>

           {/* 极简翻页按钮 */}
           <div style={{ display: "flex", alignItems: "center", gap: "2px", marginLeft: "4px" }}>
              <button onClick={prev} title="上一页 (←)" style={{ 
                width: "20px", height: "20px", 
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "transparent", border: "none", color: "inherit", 
                cursor: "pointer", borderRadius: "3px",
                opacity: 0.6
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "0.6"}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <button onClick={next} title="下一页 (→)" style={{ 
                width: "20px", height: "20px", 
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "transparent", border: "none", color: "inherit", 
                cursor: "pointer", borderRadius: "3px",
                opacity: 0.6
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "0.6"}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
              </button>
           </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </div>
  )
}
