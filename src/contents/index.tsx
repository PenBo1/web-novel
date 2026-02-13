import { useEffect, useRef, useState } from "react"
import type { PlasmoCSConfig } from "plasmo"
import { BUILTIN_THEMES } from "@/lib/themes/builtin-themes"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

type BookChapter = { title: string; content: string }
type Shortcut = { id: string; label: string; keys: string[] }
type BookInfo = { 
  id: string; 
  title: string; 
  author?: string; 
  cover?: string; 
  totalChapters: number; 
  addedAt: number;
  progress?: { chapterIndex: number; scroll: number }
}

const DEFAULT_SHORTCUTS = [
  { id: "toggleReader", label: "显示/隐藏阅读条", keys: ["Alt", "C"] },
  { id: "nextPage", label: "下一页", keys: ["ArrowRight"] },
  { id: "prevPage", label: "上一页", keys: ["ArrowLeft"] },
  { id: "nextChapter", label: "下一章", keys: ["Alt", "ArrowDown"] },
  { id: "prevChapter", label: "上一章", keys: ["Alt", "ArrowUp"] },
  { id: "selectNovel", label: "选择小说", keys: ["Alt", "S"] },
  { id: "switchTheme", label: "切换主题", keys: ["Alt", "T"] }
]

export default function Reader() {
  const [isVisible, setIsVisible] = useState(false)
  const [chapters, setChapters] = useState<BookChapter[]>([])
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [currentScroll, setCurrentScroll] = useState(0)
  const [settings, setSettings] = useState({
    readerTheme: "21st-dark",
    defaultShow: true,
    position: "bottom"
  })
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS)
  const [pageSize, setPageSize] = useState(50)
  const [activeBookId, setActiveBookId] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize data
  useEffect(() => {
    // Cleanup legacy DOM from demo version to prevent double bars
    const cleanupLegacy = () => {
      const legacy = document.getElementById("page-footer-host")
      if (legacy) legacy.remove()
    }
    
    cleanupLegacy()
    
    // Watch for late injection of legacy script
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
    
    const init = async () => {
      const data = await chrome.storage.local.get([
        "bookChapters",
        "currentChapterIndex",
        "currentScroll",
        "isVisible",
        "settings",
        "shortcuts",
        "activeBookId"
      ])
      
      if (data.bookChapters) setChapters(data.bookChapters)
      if (data.activeBookId) setActiveBookId(data.activeBookId)
      
      // Try to recover from localStorage if storage.local is missing but we have an ID
      if (typeof data.currentChapterIndex === "number") {
          setCurrentChapterIndex(data.currentChapterIndex)
      } else if (data.activeBookId) {
          const local = localStorage.getItem(`web_novel_progress_${data.activeBookId}`)
          if (local) {
              try {
                  const parsed = JSON.parse(local)
                  setCurrentChapterIndex(parsed.chapterIndex || 0)
                  setCurrentScroll(parsed.scroll || 0)
              } catch (e) {}
          }
      }

      if (typeof data.currentScroll === "number") setCurrentScroll(data.currentScroll)
      
      // Visibility logic: use saved state, or default if not set
      if (typeof data.isVisible === "boolean") {
        setIsVisible(data.isVisible)
      } else {
        setIsVisible(data.settings?.defaultShow ?? true)
      }

      if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }))
      if (data.shortcuts) setShortcuts(data.shortcuts)
    }
    init()

    const handleChange = (changes: chrome.storage.StorageChange, area: string) => {
      if (area !== "local") return
      if (changes.bookChapters) {
        setChapters(changes.bookChapters.newValue || [])
        // Only reset if activeBookId also changed, otherwise it might be a reload
        if (changes.activeBookId) {
             setCurrentChapterIndex(0)
             setCurrentScroll(0)
        }
      }
      if (changes.activeBookId) setActiveBookId(changes.activeBookId.newValue)
      if (changes.isVisible) setIsVisible(changes.isVisible.newValue)
      if (changes.settings) setSettings(prev => ({ ...prev, ...changes.settings.newValue }))
      if (changes.shortcuts) setShortcuts(changes.shortcuts.newValue)
      
      // Sync progress if updated elsewhere (e.g. popup reset)
      if (changes.currentChapterIndex) setCurrentChapterIndex(changes.currentChapterIndex.newValue)
      if (changes.currentScroll) setCurrentScroll(changes.currentScroll.newValue)
    }

    chrome.storage.onChanged.addListener(handleChange)
    return () => {
      chrome.storage.onChanged.removeListener(handleChange)
      observer.disconnect()
    }
  }, [])

  // Page Size Calculation
  useEffect(() => {
    const calculatePageSize = () => {
      // Create dummy element to measure char width
      const span = document.createElement("span")
      span.style.fontFamily = "'JetBrains Mono', Consolas, 'Courier New', monospace"
      span.style.fontSize = "13px"
      span.style.position = "absolute"
      span.style.visibility = "hidden"
      span.textContent = "我" // Wide char
      document.body.appendChild(span)
      const charWidth = span.getBoundingClientRect().width
      document.body.removeChild(span)

      const safeCharWidth = charWidth > 0 ? charWidth : 14
      const availableWidth = window.innerWidth - 120 // 120px buffer for info/padding
      const newSize = Math.floor(availableWidth / safeCharWidth)
      setPageSize(newSize > 0 ? newSize : 50)
    }

    calculatePageSize()
    window.addEventListener("resize", calculatePageSize)
    return () => window.removeEventListener("resize", calculatePageSize)
  }, [])

  // Save Progress
  useEffect(() => {
    if (!activeBookId) return

    const save = async () => {
      // 1. Save global state (fast, for current session)
      const updates: any = {
        currentChapterIndex,
        currentScroll
      }
      
      // 2. Save to bookshelf (persistent, for multi-book support)
      // We read first to avoid overwriting other books
      const data = await chrome.storage.local.get("bookshelf")
      const books = (data.bookshelf as BookInfo[]) || []
      
      let changed = false
      const newShelf = books.map(b => {
          if (b.id === activeBookId) {
              if (b.progress?.chapterIndex !== currentChapterIndex || b.progress?.scroll !== currentScroll) {
                  changed = true
                  return { ...b, progress: { chapterIndex: currentChapterIndex, scroll: currentScroll } }
              }
          }
          return b
      })

      if (changed) {
          updates.bookshelf = newShelf
      }

      await chrome.storage.local.set(updates)

      // 3. Save to localStorage (Backup / User Request)
      try {
          localStorage.setItem(`web_novel_progress_${activeBookId}`, JSON.stringify({
              chapterIndex: currentChapterIndex,
              scroll: currentScroll,
              updatedAt: Date.now()
          }))
      } catch (e) {
          // Ignore quota exceeded etc.
      }
    }

    // Debounce 500ms
    const timer = setTimeout(save, 500)
    return () => clearTimeout(timer)
  }, [currentChapterIndex, currentScroll, activeBookId])

  // Current Content
  const currentChapter = chapters[currentChapterIndex]
  const contentText = currentChapter?.content || ""
  
  // Ensure scroll is valid
  useEffect(() => {
    if (contentText && currentScroll >= contentText.length) {
        setCurrentScroll(Math.max(0, contentText.length - pageSize))
    }
  }, [contentText, pageSize]) // Don't add currentScroll here to avoid loops

  const displayText = contentText
    ? contentText.substring(currentScroll, currentScroll + pageSize).replace(/[\r\n]+/g, "  ")
    : "请在插件中上传并选择书籍..."

  const percent = contentText.length > 0 
    ? ((currentScroll / contentText.length) * 100).toFixed(1) 
    : "0.0"

  // Navigation Handlers
  const next = () => {
    if (!contentText) return
    if (currentScroll + pageSize < contentText.length) {
      setCurrentScroll(prev => prev + pageSize)
    } else if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex(prev => prev + 1)
      setCurrentScroll(0)
    }
  }

  const prev = () => {
    if (!contentText) return
    if (currentScroll - pageSize >= 0) {
      setCurrentScroll(prev => prev - pageSize)
    } else if (currentChapterIndex > 0) {
      // Go to end of prev chapter
      const prevIdx = currentChapterIndex - 1
      const prevLen = chapters[prevIdx].content.length
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
    chrome.storage.local.set({ isVisible: newVal })
  }

  const switchTheme = () => {
    const current = settings.readerTheme
    let nextTheme = "21st-dark"
    if (current === "21st-dark") nextTheme = "21st-light"
    else if (current === "21st-light") nextTheme = "21st-dark"
    // If user has some other theme, default to 21st-dark or toggle to light?
    // Let's toggle to 21st-light if it's currently a dark theme, else 21st-dark
    else if (current.includes("dark")) nextTheme = "21st-light"
    
    setSettings(prev => ({ ...prev, readerTheme: nextTheme }))
    chrome.storage.local.set({ settings: { ...settings, readerTheme: nextTheme } })
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore inputs
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable) return

      // Helper to check match
      const match = (id: string) => {
        const config = shortcuts.find(s => s.id === id)
        if (!config || config.keys.length === 0) return false
        
        // Check modifiers
        const hasCtrl = config.keys.includes("Ctrl")
        const hasAlt = config.keys.includes("Alt")
        const hasShift = config.keys.includes("Shift")
        const hasMeta = config.keys.includes("Meta")
        
        if (e.ctrlKey !== hasCtrl) return false
        if (e.altKey !== hasAlt) return false
        if (e.shiftKey !== hasShift) return false
        if (e.metaKey !== hasMeta) return false

        // Check main key
        const mainKey = config.keys.find(k => !["Ctrl", "Alt", "Shift", "Meta"].includes(k))
        if (!mainKey) return false // Modifier only?

        // Normalize
        let pressed = e.key
        if (e.code.startsWith("Arrow")) pressed = e.code
        else if (pressed === " ") pressed = "Space"
        else if (pressed.length === 1) pressed = pressed.toUpperCase()

        return pressed === mainKey
      }

      const switchNextBook = async () => {
        const data = await chrome.storage.local.get(["bookshelf", "activeBookId", "currentChapterIndex", "currentScroll"])
        const books = (data.bookshelf as BookInfo[]) || []
        if (books.length === 0) return

        // Save current progress
        const shelf = books.map(b => 
             b.id === data.activeBookId
             ? { ...b, progress: { chapterIndex: data.currentChapterIndex ?? 0, scroll: data.currentScroll ?? 0 } }
             : b
        )
        await chrome.storage.local.set({ bookshelf: shelf })

        // Sort by added time desc (same as popup)
        shelf.sort((a, b) => b.addedAt - a.addedAt)
        
        const activeId = data.activeBookId
        const currentIndex = shelf.findIndex(b => b.id === activeId)
        
        // If current not found or last, go to first. Else next.
        const nextIndex = (currentIndex + 1) % shelf.length
        const nextBook = shelf[nextIndex]
        
        // Load next book content
        const contentData = await chrome.storage.local.get(`book_content_${nextBook.id}`)
        const chapters = contentData[`book_content_${nextBook.id}`]
        
        if (!chapters) {
           console.error("Book content missing for", nextBook.title)
           return
        }
        
        await chrome.storage.local.set({
          bookChapters: chapters,
          bookTitle: nextBook.title,
          bookAuthor: nextBook.author,
          totalChapters: nextBook.totalChapters,
          currentChapterIndex: nextBook.progress?.chapterIndex ?? 0,
          currentScroll: nextBook.progress?.scroll ?? 0,
          activeBookId: nextBook.id
        })
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

    // Use capture=true to ensure we handle shortcuts before the website
    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [isVisible, shortcuts, chapters, currentChapterIndex, currentScroll, pageSize, settings]) // dependencies for closures

  // Styles
  const theme = BUILTIN_THEMES.find(t => t.id === settings.readerTheme) || BUILTIN_THEMES[0]
  const position = settings.position || "bottom"
  
  const baseBarStyle: React.CSSProperties = {
      position: "fixed",
      background: theme.colors["editor.background"] || "#0a0a0a",
      color: theme.colors["editor.foreground"] || "#f4f4f5",
      fontSize: "13px",
      lineHeight: (position === "left" || position === "right") ? "normal" : "28px",
      padding: (position === "left" || position === "right") ? "16px 0" : "0 16px",
      boxSizing: "border-box",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      overflow: "hidden",
      whiteSpace: "pre",
      cursor: "default",
      userSelect: "none",
      boxShadow: "0 0 8px rgba(0,0,0,0.1)",
      fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
      zIndex: 2147483647,
      transition: "transform 0.2s ease-in-out, opacity 0.2s",
      opacity: isVisible ? 1 : 0,
      pointerEvents: isVisible ? "auto" : "none",
  }

  let posStyle: React.CSSProperties = {}
  if (position === "top") {
      posStyle = {
          top: 0,
          left: 0,
          width: "100%",
          height: "28px",
          borderBottom: `1px solid ${theme.colors["panel.border"] || "#27272a"}`,
          transform: isVisible ? "translateY(0)" : "translateY(-100%)",
      }
  } else if (position === "bottom") {
      posStyle = {
          bottom: 0,
          left: 0,
          width: "100%",
          height: "28px",
          borderTop: `1px solid ${theme.colors["panel.border"] || "#27272a"}`,
          transform: isVisible ? "translateY(0)" : "translateY(100%)",
      }
  } else if (position === "left") {
      posStyle = {
          top: 0,
          left: 0,
          width: "28px",
          height: "100%",
          borderRight: `1px solid ${theme.colors["panel.border"] || "#27272a"}`,
          transform: isVisible ? "translateX(0)" : "translateX(-100%)",
          flexDirection: "column",
          writingMode: "vertical-rl",
      }
  } else if (position === "right") {
      posStyle = {
          top: 0,
          right: 0,
          width: "28px",
          height: "100%",
          borderLeft: `1px solid ${theme.colors["panel.border"] || "#27272a"}`,
          transform: isVisible ? "translateX(0)" : "translateX(100%)",
          flexDirection: "column",
          writingMode: "vertical-rl",
      }
  }

  const styles = {
    bar: { ...baseBarStyle, ...posStyle },
    content: {
      flex: 1,
      marginRight: (position === "left" || position === "right") ? 0 : "15px",
      marginBottom: (position === "left" || position === "right") ? "15px" : 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    info: {
      fontSize: "11px",
      opacity: 0.6,
      minWidth: (position === "left" || position === "right") ? "auto" : "60px",
      minHeight: (position === "left" || position === "right") ? "60px" : "auto",
      textAlign: (position === "left" || position === "right") ? "center" : "right" as const,
      fontVariantNumeric: "tabular-nums",
    }
  }

  if (!chapters.length && !isVisible) return null

  return (
    <div style={styles.bar}>
      <span style={styles.content}>{displayText}</span>
      <span style={styles.info}>
        Ch:{currentChapterIndex + 1} {percent}%
      </span>
    </div>
  )
}
