import { useEffect, useRef, useState } from "react"
import JSZip from "jszip"
import { BookOpen, Download, HelpCircle, Library, Search, ExternalLink, Info, Globe, MessageSquare, Star, Database, Settings, Command, History, BookMarked, Cloud } from "lucide-react"
import { useTheme } from "next-themes"
import { ThemeProvider } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { STORAGE_KEYS, StorageManager } from "@/lib/storage"
import { BUILTIN_RULES } from "@/lib/scraper/rules"
import type { Book, BookChapter, Shortcut } from "@/lib/types"
import "~styles/globals.css"

/**
 * 插件 Popup 主入口
 */
function Popup() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PopupBody />
    </ThemeProvider>
  )
}

/**
 * Popup 主体内容组件
 */
function PopupBody() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [status, setStatus] = useState("请选择一个 .epub 文件…")
  const [isBusy, setIsBusy] = useState(false)
  const [currentBook, setCurrentBook] = useState<Book | null>(null)
  const [bookshelf, setBookshelf] = useState<Book[]>([])
  const [settings, setSettings] = useState({
    pluginTheme: "21st-dark",
    readerTheme: "21st-dark",
    defaultShow: true,
    position: "bottom" as "bottom" | "top"
  })
  const [activeTab, setActiveTab] = useState("bookshelf")
  const { setTheme } = useTheme()

  // 初始化
  useEffect(() => {
    initData()
  }, [])

  const initData = async () => {
    // 1. 加载设置
    const currentSettings = await StorageManager.getSettings()
    setSettings(currentSettings)
    // 适配 next-themes：将主题 ID 映射为 dark/light
    const themeMode = currentSettings.pluginTheme.includes("light") ? "light" : "dark"
    setTheme(themeMode)

    // 2. 加载书架
    await loadBookshelf()
  }

  const loadBookshelf = async () => {
    const books = await StorageManager.getBookshelf()
    const activeId = (await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_BOOK_ID))[STORAGE_KEYS.ACTIVE_BOOK_ID]
    
    books.sort((a, b) => b.addedAt - a.addedAt)
    setBookshelf(books)

    if (activeId) {
      const active = books.find(b => b.id === activeId)
      setCurrentBook(active || null)
    } else {
      setCurrentBook(null)
    }
  }

  const saveSettings = async (newSettings: any) => {
    setSettings(newSettings)
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: newSettings })
  }

  const onPickFile = () => fileInputRef.current?.click()

  /**
   * 处理本地 EPUB 导入
   */
  const onFileChange = async (file: File | null) => {
    if (!file) return
    setIsBusy(true)
    try {
      const { info, chapters } = await importEpubFile(file, setStatus)
      
      const newBook: Book = {
        id: crypto.randomUUID(),
        title: info.title,
        author: info.author,
        cover: info.cover,
        totalChapters: chapters.length,
        addedAt: Date.now(),
        progress: { chapterIndex: 0, scroll: 0 }
      }

      await StorageManager.saveBook(newBook, chapters)
      await StorageManager.switchBook(newBook.id)
      await loadBookshelf()
      setStatus("导入成功。")
    } catch (e: any) {
      setStatus(`导入失败：${e?.message ?? String(e)}`)
    } finally {
      setIsBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const onClear = async () => {
    if (!confirm("确定要清空所有书籍吗？此操作不可恢复。")) return
    setIsBusy(true)
    try {
      const bookshelf = await StorageManager.getBookshelf()
      for (const book of bookshelf) {
        await StorageManager.deleteBook(book.id)
      }
      setBookshelf([])
      setCurrentBook(null)
      setStatus("已清空书架。")
    } catch (e: any) {
      setStatus(`清空失败：${e?.message ?? String(e)}`)
    } finally {
      setIsBusy(false)
    }
  }

  const onSetCurrent = async (book: Book) => {
    if (currentBook?.id === book.id) return
    setIsBusy(true)
    try {
      await StorageManager.switchBook(book.id)
      await loadBookshelf()
      setStatus(`已切换到《${book.title}》`)
    } catch (e: any) {
      setStatus(`切换失败：${e?.message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const onDeleteBook = async (book: Book) => {
    if (!confirm(`确定要删除《${book.title}》吗？`)) return
    setIsBusy(true)
    try {
      await StorageManager.deleteBook(book.id)
      await loadBookshelf()
      setStatus("删除成功")
    } catch (e: any) {
      setStatus(`删除失败：${e?.message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const onResetProgress = async () => {
    if (!currentBook) return
    await chrome.storage.local.set({ 
      [STORAGE_KEYS.ACTIVE_CURRENT_INDEX]: 0, 
      [STORAGE_KEYS.ACTIVE_CURRENT_SCROLL]: 0 
    })
    // 同步更新书籍列表中的进度
    const bookshelf = await StorageManager.getBookshelf()
    const newShelf = bookshelf.map(b => b.id === currentBook.id ? { ...b, progress: { chapterIndex: 0, scroll: 0 } } : b)
    await chrome.storage.local.set({ [STORAGE_KEYS.BOOKSHELF]: newShelf })
    await loadBookshelf()
    setStatus("进度已重置")
  }

  const openTab = (path: string) => {
    chrome.tabs.create({ url: chrome.runtime.getURL(`${path === "options" ? "options" : `tabs/${path}`}.html`) })
  }

  return (
    <div className="w-[520px] min-h-[600px] bg-background text-foreground font-sans flex flex-col">
      {/* 头部导航 */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <div className="font-bold text-lg">Web-novel</div>
          <div className="text-xs text-muted-foreground mt-0.5">沉浸式网页阅读扩展</div>
        </div>
        <div className="flex gap-1 items-center">
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openTab("bookshelf")}>
                            <Library className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>我的书架</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openTab("reader")}>
                            <BookMarked className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>阅读</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openTab("search")}>
                            <Search className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>全网搜索</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openTab("download")}>
                            <Download className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>下载管理</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openTab("lightnovel")}>
                            <Cloud className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>轻小说下载</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openTab("options")}>
                            <Settings className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>设置</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openTab("help")}>
                            <HelpCircle className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>帮助中心</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openTab("changelog")}>
                            <History className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>更新日志</TooltipContent>
                </Tooltip>
             </TooltipProvider>
             <div className="w-[1px] h-4 bg-border mx-1" />
             <Button variant="outline" size="sm" className="h-7 text-xs ml-1" onClick={onPickFile} disabled={isBusy}>
                {isBusy ? "处理中…" : "本地导入"}
             </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
          <div className="px-5 pb-2">
            <TabsList className="w-full grid grid-cols-3 h-auto bg-muted p-1">
              <TabsTrigger value="bookshelf" className="text-[13px] h-8">书架</TabsTrigger>
              <TabsTrigger value="search" className="text-[13px] h-8">发现</TabsTrigger>
              <TabsTrigger value="help" className="text-[13px] h-8">关于</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="bookshelf" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0 data-[state=inactive]:hidden">
            <input ref={fileInputRef} type="file" accept=".epub" className="hidden" onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />

            {/* 当前阅读卡片 */}
            {currentBook && (
              <div className="rounded-xl border bg-muted/10 p-3 flex gap-3 items-start relative overflow-hidden group">
                 <div className="w-14 h-20 shrink-0 bg-muted rounded shadow-sm overflow-hidden border">
                    {currentBook.cover ? (
                        <img src={currentBook.cover} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-6 h-6 opacity-50" />
                        </div>
                    )}
                 </div>
                 <div className="flex-1 min-w-0 z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="default" className="text-[10px] px-1.5 h-4">正在读</Badge>
                        <span className="text-xs text-muted-foreground">{currentBook.totalChapters} 章</span>
                    </div>
                    <h3 className="font-bold text-base leading-tight truncate mb-1">{currentBook.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{currentBook.author || "佚名"}</p>
                    <div className="mt-2 flex gap-2">
                        <Button size="sm" className="h-6 text-xs" variant="secondary" disabled>阅读中...</Button>
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={onResetProgress}>重置进度</Button>
                    </div>
                 </div>
              </div>
            )}

            {/* 书架列表 */}
            <div className="space-y-2">
               <div className="flex items-center justify-between">
                 <h3 className="font-semibold text-sm">我的收藏 ({bookshelf.length})</h3>
                 {bookshelf.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs hover:text-destructive" onClick={onClear}>清空</Button>
                 )}
               </div>
               {bookshelf.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3 pb-4">
                      {bookshelf.map(book => (
                        <div key={book.id} className="group relative flex flex-col gap-2">
                           <div className="aspect-[2/3] w-full bg-muted rounded-lg border shadow-sm overflow-hidden relative transition-all hover:shadow-md">
                                {book.cover ? (
                                    <img src={book.cover} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-2">
                                        <BookOpen className="w-8 h-8 opacity-50 mb-1" />
                                        <span className="text-[10px] line-clamp-2">{book.title}</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 backdrop-blur-[1px]">
                                    {currentBook?.id !== book.id && (
                                        <Button size="sm" className="h-7 w-full text-xs" onClick={() => onSetCurrent(book)}>阅读</Button>
                                    )}
                                    <Button size="sm" variant="destructive" className="h-7 w-full text-xs" onClick={() => onDeleteBook(book)}>删除</Button>
                                </div>
                                {currentBook?.id === book.id && (
                                    <div className="absolute top-2 right-2 flex h-2.5 w-2.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                    </div>
                                )}
                           </div>
                           <div className="text-xs truncate font-medium">{book.title}</div>
                        </div>
                      ))}
                    </div>
               ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-muted/5" onClick={onPickFile}>
                       <Library className="w-12 h-12 mb-3 opacity-20" />
                       <div className="text-sm font-medium">书架空空如也</div>
                       <div className="text-xs text-muted-foreground mt-1">从本地导入或全网搜索</div>
                    </div>
               )}
            </div>
            <div className="text-xs text-muted-foreground text-center opacity-80">{status}</div>
          </TabsContent>

          <TabsContent value="search" className="flex-1 overflow-y-auto p-8 text-center space-y-4 mt-0 data-[state=inactive]:hidden">
             <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"><Search className="w-8 h-8 text-primary" /></div>
             <h3 className="font-bold">发现精彩小说</h3>
             <p className="text-sm text-muted-foreground">前往聚合搜索页，一键抓取全网小说到书架。</p>
             <div className="flex gap-2 justify-center">
                 <Button onClick={() => openTab("search")} size="sm">进入搜索中心</Button>
                 <Button variant="outline" size="sm" onClick={() => openTab("rules")}>查看书源</Button>
             </div>
          </TabsContent>

          <TabsContent value="help" className="flex-1 overflow-y-auto p-6 space-y-6 mt-0 data-[state=inactive]:hidden">
             <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"><BookOpen className="w-8 h-8 text-primary" /></div>
                <div>
                  <h3 className="font-bold text-lg">Web-novel</h3>
                  <p className="text-xs text-muted-foreground mt-1">v0.0.1</p>
                </div>
             </div>

             <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold mb-1">关于</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Web-novel 是一款沉浸式网页阅读扩展。支持导入 EPUB 文件，在任意网页底部显示阅读条，提供章节/进度保存与快捷键导航功能。</p>
                </div>

                <div>
                  <p className="font-semibold mb-1">主要功能</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>导入本地 EPUB 文件到书架</li>
                    <li>全网小说搜索与聚合</li>
                    <li>网页阅读条快速阅读</li>
                    <li>章节进度自动保存</li>
                    <li>自定义快捷键导航</li>
                    <li>明暗主题切换</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-1">开发者</p>
                  <p className="text-xs text-muted-foreground">PenBo</p>
                </div>
             </div>

             <div className="flex gap-2 justify-center pt-2">
                 <Button onClick={() => openTab("help")} size="sm" variant="outline">使用手册</Button>
                 <Button onClick={() => openTab("options")} size="sm" variant="outline">设置</Button>
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

/**
 * EPUB 解析辅助逻辑
 */
async function importEpubFile(file: File, onProgress: (t: string) => void) {
  onProgress("正在解析 EPUB...")
  const zip = await JSZip.loadAsync(file)
  const containerXml = await readZipFileAsString(zip, "META-INF/container.xml")
  const containerDoc = new DOMParser().parseFromString(containerXml, "application/xml")
  const opfPath = containerDoc.querySelector("rootfile")?.getAttribute("full-path")
  if (!opfPath) throw new Error("无效的 EPUB 格式")

  const opfContent = await readZipFileAsString(zip, opfPath)
  const opfDoc = new DOMParser().parseFromString(opfContent, "application/xml")
  const title = getEpubMeta(opfDoc, "title") || file.name.replace(".epub", "")
  const author = getEpubMeta(opfDoc, "creator") || "未知"
  const cover = await extractCoverImage(zip, opfDoc, opfPath)

  onProgress("提取章节内容...")
  const manifest = new Map<string, string>()
  const itemEls = Array.from(opfDoc.getElementsByTagName("*")).filter(el => el.localName === "item")
  itemEls.forEach(el => {
    const id = el.getAttribute("id")
    const href = el.getAttribute("href")
    if (id && href) manifest.set(id, href)
  })

  const spineRefs = Array.from(opfDoc.getElementsByTagName("*")).filter(el => el.localName === "itemref")
  const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : ""
  
  const chapters: BookChapter[] = []
  for (const ref of spineRefs) {
    const idref = ref.getAttribute("idref")
    const href = manifest.get(idref || "")
    if (href) {
      const fullPath = opfDir + href
      const content = await readZipFileAsString(zip, fullPath)
      const doc = new DOMParser().parseFromString(content, "text/html")
      const body = doc.body.innerHTML || ""
      const chapTitle = doc.title || `第 ${chapters.length + 1} 章`
      chapters.push({ title: chapTitle, content: body })
    }
  }

  return { info: { title, author, cover }, chapters }
}

// 基础 Zip 读取辅助
async function readZipFileAsString(zip: JSZip, path: string) {
  const file = zip.file(path)
  if (!file) return ""
  return await file.async("string")
}

// 获取 EPUB 元数据
function getEpubMeta(doc: Document, name: string) {
  const els = Array.from(doc.getElementsByTagName("*")).filter(el => el.localName === name)
  return els[0]?.textContent || ""
}

// 提取封面
async function extractCoverImage(zip: JSZip, opfDoc: Document, opfPath: string) {
  // 简化的封面提取逻辑
  const items = Array.from(opfDoc.getElementsByTagName("*")).filter(el => el.localName === "item")
  const coverItem = items.find(i => i.getAttribute("id")?.includes("cover")) || items.find(i => i.getAttribute("media-type")?.startsWith("image/"))
  if (coverItem) {
    const href = coverItem.getAttribute("href")
    const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : ""
    const imgFile = zip.file(opfDir + href)
    if (imgFile) {
      const base64 = await imgFile.async("base64")
      const mime = coverItem.getAttribute("media-type") || "image/jpeg"
      return `data:${mime};base64,${base64}`
    }
  }
  return undefined
}

export default Popup
