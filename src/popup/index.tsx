import { useEffect, useMemo, useRef, useState } from "react"
import JSZip from "jszip"
import { BookOpen, Library } from "lucide-react"
import { useTheme } from "next-themes"
import { ThemeProvider } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { BUILTIN_THEMES } from "@/lib/themes/builtin-themes"
import "~styles/globals.css"

type BookChapter = { title: string; content: string }
type BookInfo = { 
  id: string; 
  title: string; 
  author?: string; 
  cover?: string; 
  totalChapters: number; 
  addedAt: number;
  progress?: { chapterIndex: number; scroll: number }
}

const WEB_NOVEL_STORAGE_KEYS = [
  "bookChapters",
  "bookTitle",
  "bookAuthor",
  "totalChapters",
  "currentChapterIndex",
  "currentScroll",
  "isVisible",
  "shortcuts",
  "settings",
  "bookshelf",
  "activeBookId"
] as const

const DEFAULT_SHORTCUTS = [
  { id: "toggleReader", label: "显示/隐藏阅读条", keys: ["Alt", "C"] },
  { id: "nextPage", label: "下一页", keys: ["ArrowRight"] },
  { id: "prevPage", label: "上一页", keys: ["ArrowLeft"] },
  { id: "nextChapter", label: "下一章", keys: ["Alt", "ArrowDown"] },
  { id: "prevChapter", label: "上一章", keys: ["Alt", "ArrowUp"] },
  { id: "selectNovel", label: "选择小说", keys: ["Alt", "S"] },
  { id: "switchTheme", label: "切换主题", keys: ["Alt", "T"] }
]

function Popup() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PopupBody />
    </ThemeProvider>
  )
}

function PopupBody() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [status, setStatus] = useState("请选择一个 .epub 文件…")
  const [isBusy, setIsBusy] = useState(false)
  const [currentBook, setCurrentBook] = useState<BookInfo | null>(null)
  const [bookshelf, setBookshelf] = useState<BookInfo[]>([])
  const [settings, setSettings] = useState({
    pluginTheme: "21st-dark",
    readerTheme: "21st-dark",
    defaultShow: true,
    position: "bottom"
  })
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS)
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const { setTheme } = useTheme()

  useEffect(() => {
    initData()
    loadSettings()
  }, [])

  useEffect(() => {
    if (!recordingId) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      // Ignore if only modifiers are pressed
      if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return

      const keys: string[] = []
      if (e.ctrlKey) keys.push("Ctrl")
      if (e.altKey) keys.push("Alt")
      if (e.shiftKey) keys.push("Shift")
      if (e.metaKey) keys.push("Meta")

      let mainKey = e.key
      if (e.code.startsWith("Arrow")) {
         mainKey = e.code // ArrowRight, ArrowLeft etc.
      } else if (mainKey === " ") {
         mainKey = "Space"
      } else if (mainKey.length === 1) {
         mainKey = mainKey.toUpperCase()
      }
      
      keys.push(mainKey)

      // Check conflict
      const isConflict = shortcuts.some(s => s.id !== recordingId && JSON.stringify(s.keys) === JSON.stringify(keys))
      if (isConflict) {
          // You could show a toast here, but for now we just return
          // Maybe reset recordingId to stop recording or keep it to let user try again
          // Let's reset and maybe show status if we had a toast system, but user just said "judge"
          // I will alert using window.alert (works in popup) or just ignore.
          // Since "alert" might block or be annoying, I'll just not save and maybe set a status message if I had one for errors.
          // But I don't have an error state for shortcuts.
          // I'll add a temporary error status or just ignore the input.
          // User said: "need to judge... do not appear shortcut conflict".
          // If I just ignore, it looks like it's not working.
          // I'll use `window.alert` as it is simple and effective for now.
          window.alert(`快捷键冲突：该组合键已被“${shortcuts.find(s => JSON.stringify(s.keys) === JSON.stringify(keys))?.label}”占用`)
          return
      }
      
      // Update shortcuts
      const newShortcuts = shortcuts.map(s => s.id === recordingId ? { ...s, keys } : s)
      saveShortcuts(newShortcuts)
      setRecordingId(null)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [recordingId, shortcuts])

  const initData = async () => {
    await migrateLegacyData()
    await loadBookshelf()
  }

  const loadBookshelf = async () => {
    const data = await chrome.storage.local.get(["bookshelf", "activeBookId"])
    const books = (data.bookshelf as BookInfo[]) || []
    const activeId = data.activeBookId as string | undefined
    
    // Sort by added time desc
    books.sort((a, b) => b.addedAt - a.addedAt)
    setBookshelf(books)

    if (activeId) {
      const active = books.find(b => b.id === activeId)
      setCurrentBook(active || null)
    } else {
      setCurrentBook(null)
    }
  }

  const loadSettings = async () => {
    const data = await chrome.storage.local.get(["settings", "shortcuts"])
    if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }))
    if (data.shortcuts) {
       // Merge saved shortcuts with default ones to ensure new ones appear
       setShortcuts(prev => {
         const saved = data.shortcuts as typeof DEFAULT_SHORTCUTS
         return prev.map(p => {
           const s = saved.find(x => x.id === p.id)
           return s ? s : p
         })
       })
    }
  }

  const saveSettings = async (newSettings: any) => {
    setSettings(newSettings)
    await chrome.storage.local.set({ settings: newSettings })
  }

  const saveShortcuts = async (newShortcuts: any) => {
    setShortcuts(newShortcuts)
    await chrome.storage.local.set({ shortcuts: newShortcuts })
  }

  const onPickFile = () => fileInputRef.current?.click()

  const onFileChange = async (file: File | null) => {
    if (!file) return
    setIsBusy(true)
    try {
      const info = await importEpubFile(file, setStatus)
      await loadBookshelf() // Reload list
      setStatus("导入成功。")
    } catch (e: any) {
      setStatus(`导入失败：${e?.message ?? String(e)}`)
    } finally {
      setIsBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const onClear = async () => {
    // Clear ALL books
    if (!confirm("确定要清空所有书籍吗？此操作不可恢复。")) return
    setIsBusy(true)
    try {
      await clearAllBooks()
      setBookshelf([])
      setCurrentBook(null)
      setStatus("已清空书架。")
    } catch (e: any) {
      setStatus(`清空失败：${e?.message ?? String(e)}`)
    } finally {
      setIsBusy(false)
    }
  }

  const onSetCurrent = async (book: BookInfo) => {
    if (currentBook?.id === book.id) return
    setIsBusy(true)
    try {
      // Save current progress before switching
      if (currentBook) {
        const { currentChapterIndex = 0, currentScroll = 0 } = await chrome.storage.local.get(["currentChapterIndex", "currentScroll"])
        const data = await chrome.storage.local.get("bookshelf")
        const shelf = (data.bookshelf as BookInfo[]) || []
        const newShelf = shelf.map(b => 
           b.id === currentBook.id 
             ? { ...b, progress: { chapterIndex: currentChapterIndex as number, scroll: currentScroll as number } }
             : b
        )
        await chrome.storage.local.set({ bookshelf: newShelf })
        // We don't strictly need to setBookshelf here because loadBookshelf will run after switch
      }

      await switchBook(book.id)
      await loadBookshelf()
      setStatus(`已切换到《${book.title}》`)
    } catch (e: any) {
      setStatus(`切换失败：${e?.message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const onDeleteBook = async (book: BookInfo) => {
    if (!confirm(`确定要删除《${book.title}》吗？`)) return
    setIsBusy(true)
    try {
      await deleteBook(book.id)
      await loadBookshelf()
      setStatus("删除成功")
    } catch (e: any) {
      setStatus(`删除失败：${e?.message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const onResetProgress = async () => {
    await chrome.storage.local.set({ currentChapterIndex: 0, currentScroll: 0 })
    setStatus("进度已重置")
  }

  return (
    <div className="w-[520px] min-h-[600px] bg-background text-foreground font-sans flex flex-col">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <div className="font-bold text-lg">Web-novel</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            沉浸式网页阅读扩展
          </div>
        </div>
        <div className="flex gap-2">
             <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onPickFile} disabled={isBusy}>
                {isBusy ? "处理中…" : "导入书籍"}
             </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs defaultValue="bookshelf" className="w-full flex-1 flex flex-col">
          <div className="px-5 pb-2">
            <TabsList className="w-full grid grid-cols-3 h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
              <TabsTrigger 
                value="bookshelf" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
              >
                书架
              </TabsTrigger>
              <TabsTrigger 
                value="options" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
              >
                选项
              </TabsTrigger>
              <TabsTrigger 
                value="shortcuts" 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow"
              >
                快捷键
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="bookshelf" className="flex-1 overflow-y-auto p-4 space-y-4 data-[state=inactive]:hidden mt-0">
            {/* Hidden Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".epub"
                className="hidden"
                onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
              />

            {/* Current Reading Banner */}
            {currentBook && (
              <div className="rounded-xl border bg-muted/10 p-3 flex gap-3 items-start relative overflow-hidden group">
                 <div className="w-14 h-20 shrink-0 bg-muted rounded shadow-sm overflow-hidden border">
                    {currentBook.cover ? (
                        <img src={currentBook.cover} alt={currentBook.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                            <BookOpen className="w-6 h-6 opacity-50" />
                        </div>
                    )}
                 </div>
                 <div className="flex-1 min-w-0 z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="default" className="bg-primary/80 hover:bg-primary/80 text-[10px] px-1.5 h-4">正在阅读</Badge>
                        <div className="text-xs text-muted-foreground">
                            {currentBook.totalChapters} 章
                        </div>
                    </div>
                    <h3 className="font-bold text-base leading-tight truncate mb-1" title={currentBook.title}>{currentBook.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{currentBook.author || "佚名"}</p>
                    
                    <div className="mt-2 flex gap-2">
                        <Button size="sm" className="h-6 text-xs px-3" onClick={() => onSetCurrent(currentBook)} variant="secondary" disabled>
                            阅读中
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-muted-foreground hover:text-destructive" onClick={onResetProgress}>
                            重置进度
                        </Button>
                    </div>
                 </div>
                 {/* Decorative background blur */}
                 {currentBook.cover && (
                     <div 
                        className="absolute inset-0 opacity-10 blur-3xl scale-150 z-0 pointer-events-none"
                        style={{ backgroundImage: `url(${currentBook.cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                     />
                 )}
              </div>
            )}

            <div className="space-y-2">
               <div className="flex items-center justify-between">
                 <h3 className="font-semibold text-sm flex items-center gap-2">
                    全部书籍
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{bookshelf.length}</span>
                 </h3>
                 {bookshelf.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-destructive px-2" onClick={onClear}>
                        清空书架
                    </Button>
                 )}
               </div>

               {bookshelf.length > 0 ? (
                   <div className="grid grid-cols-3 gap-3 pb-4">
                     {bookshelf.map(book => (
                       <div key={book.id} className="group relative flex flex-col gap-2">
                          <div className="aspect-[2/3] w-full bg-muted rounded-lg border shadow-sm overflow-hidden relative transition-all hover:shadow-md hover:ring-2 hover:ring-primary/20">
                                {book.cover ? (
                                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground p-2 text-center">
                                        <BookOpen className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-[10px] leading-tight line-clamp-2">{book.title}</span>
                                    </div>
                                )}
                                
                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 backdrop-blur-[1px]">
                                    {currentBook?.id !== book.id && (
                                        <Button size="sm" className="h-7 w-full text-xs" onClick={() => onSetCurrent(book)}>
                                            阅读
                                        </Button>
                                    )}
                                    <Button size="sm" variant="destructive" className="h-7 w-full text-xs opacity-90 hover:opacity-100" onClick={() => onDeleteBook(book)}>
                                        删除
                                    </Button>
                                </div>

                                {currentBook?.id === book.id && (
                                    <div className="absolute top-2 right-2">
                                        <span className="relative flex h-2.5 w-2.5">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                        </span>
                                    </div>
                                )}
                          </div>
                          <div className="space-y-0.5">
                             <div className="font-medium text-xs truncate leading-tight" title={book.title}>{book.title}</div>
                             <div className="text-[10px] text-muted-foreground truncate">{book.author || "Unknown"}</div>
                          </div>
                       </div>
                     ))}
                   </div>
               ) : (
                   <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer" onClick={onPickFile}>
                      <Library className="w-12 h-12 mb-3 opacity-20" />
                      <div className="text-sm font-medium">暂无书籍</div>
                      <div className="text-xs text-muted-foreground mt-1 mb-3">点击导入 .epub 电子书</div>
                      <Button size="sm" variant="secondary" className="h-7 text-xs">选择文件</Button>
                   </div>
               )}
            </div>

            <div className="text-xs text-muted-foreground break-words text-center min-h-[1.2em] opacity-80">{status}</div>
          </TabsContent>

          <TabsContent value="options" className="p-4 space-y-4 mt-0">
            <div className="rounded-xl border p-3 space-y-3">
              <div className="space-y-1">
                <h3 className="font-semibold text-sm">主题</h3>
                <p className="text-xs text-muted-foreground">插件页面与阅读条主题可分别设置。</p>
              </div>
              
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                   <Label htmlFor="plugin-theme" className="text-sm font-medium">插件页面主题</Label>
                   <div className="text-xs text-muted-foreground">影响扩展 Popup 本身。</div>
                </div>
                <Select 
                    value={settings.pluginTheme} 
                    onValueChange={(v) => {
                      saveSettings({ ...settings, pluginTheme: v })
                      setTheme(v)
                    }}
                  >
                    <SelectTrigger id="plugin-theme" className="w-[140px] h-8 text-xs">
                      <SelectValue placeholder="选择主题" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {BUILTIN_THEMES.map(theme => (
                          <SelectItem key={theme.id} value={theme.id}>{theme.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <Label htmlFor="reader-theme" className="text-sm font-medium">阅读条主题</Label>
                  <div className="text-xs text-muted-foreground">影响网页底部阅读条。</div>
                </div>
                <Select 
                    value={settings.readerTheme} 
                    onValueChange={(v) => saveSettings({ ...settings, readerTheme: v })}
                  >
                    <SelectTrigger id="reader-theme" className="w-[140px] h-8 text-xs">
                      <SelectValue placeholder="选择主题" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {BUILTIN_THEMES.map(theme => (
                          <SelectItem key={theme.id} value={theme.id}>{theme.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <Label htmlFor="reader-position" className="text-sm font-medium">阅读条位置</Label>
                  <div className="text-xs text-muted-foreground">选择阅读条在屏幕上的位置。</div>
                </div>
                <Select 
                    value={settings.position} 
                    onValueChange={(v) => saveSettings({ ...settings, position: v })}
                  >
                    <SelectTrigger id="reader-position" className="w-[140px] h-8 text-xs">
                      <SelectValue placeholder="选择位置" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="bottom">底部 (Bottom)</SelectItem>
                        <SelectItem value="top">顶部 (Top)</SelectItem>
                        <SelectItem value="left">左侧 (Left)</SelectItem>
                        <SelectItem value="right">右侧 (Right)</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
              </div>
            </div>

            <div className="rounded-xl border p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">默认显示阅读条</Label>
                <div className="text-xs text-muted-foreground">仅在没有历史状态时使用；之后以你最近一次显示/隐藏为准。</div>
              </div>
              <Switch 
                checked={settings.defaultShow}
                onCheckedChange={(c) => saveSettings({ ...settings, defaultShow: c })}
              />
            </div>

            <div className="rounded-xl border p-3 flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold">重置当前书进度</Label>
                <div className="text-xs text-muted-foreground">把当前书的章节与滚动位置重置为 0。</div>
              </div>
              <Button variant="secondary" size="sm" className="h-7" onClick={onResetProgress}>重置</Button>
            </div>
            
             <div className="rounded-xl border p-3 space-y-2">
                <h3 className="font-semibold text-sm">使用说明</h3>
                <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
                  <li>在“书架”上传 EPUB（可上传多本）</li>
                  <li>选择一本“设为当前”，刷新网页</li>
                  <li>按 ArrowRight / ArrowLeft 翻页</li>
                  <li>按 Alt + ArrowDown / Alt + ArrowUp 切换章节</li>
                  <li>按 Alt + C 显示/隐藏阅读条</li>
                </ol>
             </div>
          </TabsContent>

          <TabsContent value="shortcuts" className="p-4 space-y-4 mt-0">
             <div className="rounded-xl border p-3">
                <div className="space-y-1 mb-4">
                  <h3 className="font-semibold text-sm">快捷键</h3>
                  <p className="text-xs text-muted-foreground">这里设置的是“网页阅读条”的快捷键。</p>
                </div>
                
                <div className="space-y-3">
                  {shortcuts.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {item.keys.length > 0 ? (
                            <Kbd className="bg-muted text-muted-foreground">
                              {item.keys.join(" + ")}
                            </Kbd>
                          ) : "未设置"}
                        </div>
                      </div>
                      <div className="flex gap-2">
                         <Button 
                           variant={recordingId === item.id ? "default" : "outline"} 
                           className="h-7 text-xs w-16"
                           size="sm" 
                           onClick={() => setRecordingId(recordingId === item.id ? null : item.id)}
                         >
                           {recordingId === item.id ? "录制中" : "录制"}
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="sm" 
                           className="h-7 text-xs w-16 text-muted-foreground hover:text-destructive"
                           onClick={() => {
                             const newShortcuts = shortcuts.map(s => s.id === item.id ? { ...s, keys: [] } : s)
                             saveShortcuts(newShortcuts)
                             setRecordingId(null)
                         }}>清空</Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-6">
                  <Button className="flex-1 h-8 text-xs" variant="secondary" onClick={() => saveShortcuts(DEFAULT_SHORTCUTS)}>恢复默认</Button>
                  <Button className="flex-1 h-8 text-xs" variant="secondary" onClick={() => {
                      const empty = shortcuts.map(s => ({ ...s, keys: [] }))
                      saveShortcuts(empty)
                  }}>清除自定义</Button>
                </div>

                {recordingId && (
                   <div className="mt-4 text-xs text-muted-foreground animate-pulse text-center">
                      正在录制：请按下一个组合键...
                   </div>
                )}
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

async function loadCurrentBookInfo(): Promise<BookInfo | null> {
  const data = await chrome.storage.local.get(["bookTitle", "bookAuthor", "totalChapters", "bookChapters"])
  const title = (data.bookTitle as string | undefined) ?? null
  const author = (data.bookAuthor as string | undefined) ?? undefined
  const total =
    (data.totalChapters as number | undefined) ??
    (Array.isArray(data.bookChapters) ? (data.bookChapters as any[]).length : 0)

  if (!title && !total) return null
  return { title: title ?? "Unknown", author, totalChapters: total }
}

async function clearAllBooks() {
  const data = await chrome.storage.local.get("bookshelf")
  const books = (data.bookshelf as BookInfo[]) || []
  
  const keysToRemove = [...WEB_NOVEL_STORAGE_KEYS] as unknown as string[]
  // Remove all book content
  books.forEach(b => keysToRemove.push(`book_content_${b.id}`))
  keysToRemove.push("activeBookId")
  
  await chrome.storage.local.remove(keysToRemove)
  await chrome.storage.local.set({ bookshelf: [] })
}

async function migrateLegacyData() {
  const data = await chrome.storage.local.get(["bookshelf", "bookTitle", "bookChapters", "activeBookId"])
  if (data.bookshelf) return // Already migrated
  
  if (!data.bookTitle || !data.bookChapters) {
    // No legacy data or empty
    await chrome.storage.local.set({ bookshelf: [] })
    return
  }

  // Create a book from legacy data
  const legacyId = crypto.randomUUID()
  const legacyBook: BookInfo = {
    id: legacyId,
    title: data.bookTitle,
    author: data.bookAuthor,
    totalChapters: data.bookChapters.length,
    addedAt: Date.now()
  }

  await chrome.storage.local.set({
    bookshelf: [legacyBook],
    [`book_content_${legacyId}`]: data.bookChapters,
    activeBookId: legacyId
  })
}

async function saveBookToLibrary(info: BookInfo, chapters: BookChapter[]) {
  const data = await chrome.storage.local.get("bookshelf")
  const bookshelf = (data.bookshelf as BookInfo[]) || []
  
  // Check if update or new
  const existingIndex = bookshelf.findIndex(b => b.id === info.id)
  const newShelf = [...bookshelf]
  
  if (existingIndex >= 0) {
    newShelf[existingIndex] = info
  } else {
    newShelf.push(info)
  }

  await chrome.storage.local.set({
    bookshelf: newShelf,
    [`book_content_${info.id}`]: chapters
  })
}

async function switchBook(id: string) {
  const data = await chrome.storage.local.get(["bookshelf", `book_content_${id}`, "activeBookId", "currentChapterIndex", "currentScroll"])
  const books = (data.bookshelf as BookInfo[]) || []
  const targetBook = books.find(b => b.id === id)
  const targetContent = data[`book_content_${id}`]

  if (!targetBook || !targetContent) throw new Error("书籍数据不存在")

  // Update Active Book Slots
  await chrome.storage.local.set({
    bookChapters: targetContent,
    bookTitle: targetBook.title,
    bookAuthor: targetBook.author,
    totalChapters: targetBook.totalChapters,
    currentChapterIndex: targetBook.progress?.chapterIndex ?? 0,
    currentScroll: targetBook.progress?.scroll ?? 0,
    activeBookId: id
  })
}

async function deleteBook(id: string) {
  const data = await chrome.storage.local.get(["bookshelf", "activeBookId"])
  const books = (data.bookshelf as BookInfo[]) || []
  const newShelf = books.filter(b => b.id !== id)
  
  const keysToRemove: string[] = [`book_content_${id}`]
  
  if (data.activeBookId === id) {
    // If deleting active book, clear active slots
    keysToRemove.push("bookChapters", "bookTitle", "bookAuthor", "totalChapters", "activeBookId", "currentChapterIndex")
  }

  await chrome.storage.local.set({ bookshelf: newShelf })
  await chrome.storage.local.remove(keysToRemove)
}

async function importEpubFile(file: File, onProgress: (text: string) => void): Promise<BookInfo> {
  if (!/\.epub$/i.test(file.name)) throw new Error("请选择 .epub 文件")

  onProgress("初始化解析器…")
  const zip = await JSZip.loadAsync(file)

  onProgress("读取 EPUB 结构…")
  const containerXml = await readZipFileAsString(zip, "META-INF/container.xml")
  const containerDoc = new DOMParser().parseFromString(containerXml, "application/xml")
  const rootfile = containerDoc.querySelector("rootfile")
  const opfPath = rootfile?.getAttribute("full-path")
  if (!opfPath) throw new Error("EPUB 格式不正确：找不到 OPF 路径")

  const opfContent = await readZipFileAsString(zip, opfPath)
  const opfDoc = new DOMParser().parseFromString(opfContent, "application/xml")

  const fileName = file.name.replace(/\.epub$/i, "")
  const bookTitle = getEpubMeta(opfDoc, "title") ?? fileName
  const bookAuthor = getEpubMeta(opfDoc, "creator")
  
  // Extract Cover
  onProgress("提取封面…")
  const coverBase64 = await extractCoverImage(zip, opfDoc, opfPath)

  const manifest = new Map<string, string>()
  // Handle namespaces by checking localName if getElementsByTagName returns empty or just use * and check localName
  let manifestItems = Array.from(opfDoc.getElementsByTagName("item"))
  if (manifestItems.length === 0) {
     manifestItems = Array.from(opfDoc.getElementsByTagName("*")).filter(el => el.localName === "item")
  }

  for (const item of manifestItems) {
    const id = item.getAttribute("id")
    const href = item.getAttribute("href")
    if (id && href) manifest.set(id, href)
  }

  const spine: string[] = []
  let spineItems = Array.from(opfDoc.getElementsByTagName("itemref"))
  if (spineItems.length === 0) {
      spineItems = Array.from(opfDoc.getElementsByTagName("*")).filter(el => el.localName === "itemref")
  }
  
  for (const item of spineItems) {
    const idref = item.getAttribute("idref")
    if (idref) spine.push(idref)
  }

  if (spine.length === 0) throw new Error("EPUB 内容为空：spine 为空")

  const opfDir = normalizeZipDir(opfPath)
  const chapters: BookChapter[] = []

  onProgress(`发现 ${spine.length} 个章节，开始提取…`)
  for (let i = 0; i < spine.length; i++) {
    const idref = spine[i]
    const href = manifest.get(idref)
    if (!href) continue

    const fullPath = normalizeZipPath(joinZipPath(opfDir, href))
    const htmlContent = await readZipFileAsString(zip, fullPath)
    const htmlDoc = new DOMParser().parseFromString(htmlContent, "text/html")

    htmlDoc.querySelectorAll("script, style, noscript").forEach((el) => el.remove())

    const title =
      htmlDoc.querySelector("h1, h2, h3")?.textContent?.trim() ||
      htmlDoc.querySelector("title")?.textContent?.trim() ||
      `Chapter ${chapters.length + 1}`

    const bodyRoot = htmlDoc.body ?? htmlDoc.documentElement
    let content = extractTextWithNewlines(bodyRoot).replace(/\n[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
    if (content) chapters.push({ title, content })

    if (i % 5 === 0) onProgress(`解析中：${i + 1}/${spine.length}`)
  }

  if (chapters.length === 0) throw new Error("未解析到可用章节内容")

  const newId = crypto.randomUUID()
  const info: BookInfo = {
    id: newId,
    title: bookTitle,
    author: bookAuthor ?? undefined,
    cover: coverBase64 ?? undefined,
    totalChapters: chapters.length,
    addedAt: Date.now()
  }

  onProgress("写入本地存储…")
  // Save to library
  await saveBookToLibrary(info, chapters)
  
  // Switch to this book immediately
  await switchBook(newId)

  return info
}

function getEpubMeta(opfDoc: Document, tag: string) {
  // Try with prefix and without
  const tags = ["dc:" + tag, tag]
  for (const t of tags) {
     const els = opfDoc.getElementsByTagName(t)
     if (els.length > 0) return els[0].textContent?.trim()
  }
  // Fallback to querySelector which is more robust for namespaces in HTML DOM
  // But for XML DOM it might require namespace resolver. 
  // Simple fallback: scan all tags
  const all = opfDoc.getElementsByTagName("*")
  for(let i=0; i<all.length; i++) {
      if (all[i].localName === tag) return all[i].textContent?.trim()
  }
  return null
}

async function extractCoverImage(zip: JSZip, opfDoc: Document, opfPath: string): Promise<string | null> {
    try {
        // 1. Try <meta name="cover" content="cover-id" />
        let coverId = opfDoc.querySelector('meta[name="cover"]')?.getAttribute("content")

        // 2. Try <item properties="cover-image" ... />
        if (!coverId) {
             const items = Array.from(opfDoc.getElementsByTagName("item"))
             const coverItem = items.find(item => item.getAttribute("properties")?.includes("cover-image"))
             if (coverItem) coverId = coverItem.getAttribute("id")
        }

        // 3. Try finding manifest item with id "cover"
        if (!coverId) {
            const items = Array.from(opfDoc.getElementsByTagName("item"))
             const coverItem = items.find(item => item.getAttribute("id")?.toLowerCase() === "cover")
             if (coverItem) coverId = coverItem.getAttribute("id")
        }

        if (!coverId) return null

        // Find href for coverId
        const items = Array.from(opfDoc.getElementsByTagName("item"))
        const item = items.find(i => i.getAttribute("id") === coverId)
        if (!item) return null

        const href = item.getAttribute("href")
        if (!href) return null

        // Resolve path
        const opfDir = normalizeZipDir(opfPath)
        const fullPath = normalizeZipPath(joinZipPath(opfDir, href))

        // Read file
        const file = zip.file(fullPath)
        if (!file) return null

        const blob = await file.async("blob")
        // Resize to reduce storage size (max width 200px)
        return await resizeImage(blob, 200)

    } catch (e) {
        console.error("Failed to extract cover", e)
        return null
    }
}

async function resizeImage(blob: Blob, width: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      const scale = width / img.width
      // If image is smaller than target, don't upscale, but still convert to standard format
      const finalWidth = Math.min(width, img.width)
      const finalHeight = img.height * (finalWidth / img.width)
      
      const canvas = document.createElement("canvas")
      canvas.width = finalWidth
      canvas.height = finalHeight
      const ctx = canvas.getContext("2d")
      if (!ctx) {
          resolve("") 
          return
      }
      ctx.drawImage(img, 0, 0, finalWidth, finalHeight)
      // Compress quality
      resolve(canvas.toDataURL("image/jpeg", 0.75))
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve("") // Fail silently
    }
    img.src = url
  })
}

function normalizeZipDir(path: string) {
  const parts = path.replace(/\\/g, "/").split("/")
  parts.pop() // remove filename
  return parts.join("/")
}

function joinZipPath(dir: string, file: string) {
  if (!dir) return file
  return dir + "/" + file
}

function normalizeZipPath(path: string) {
  // Handle ../
  const parts = path.replace(/\\/g, "/").split("/")
  const stack: string[] = []
  for (const part of parts) {
      if (part === ".") continue
      if (part === "..") {
          stack.pop()
      } else {
          stack.push(part)
      }
  }
  return stack.join("/").replace(/^\/+/, "")
}

async function readZipFileAsString(zip: JSZip, path: string) {
  const normalized = normalizeZipPath(path)
  const file = zip.file(normalized)
  if (!file) throw new Error(`文件不存在：${normalized}`)
  return await file.async("string")
}

function extractTextWithNewlines(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ""
  if (node.nodeType !== Node.ELEMENT_NODE) return ""

  const el = node as Element
  const tag = el.tagName?.toUpperCase?.() ?? ""
  const isBlock = ["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "BR", "LI", "SECTION", "ARTICLE"].includes(tag)

  let text = ""
  if (isBlock) text += "\n"
  for (const child of Array.from(el.childNodes)) text += extractTextWithNewlines(child)
  if (isBlock) text += "\n"
  return text
}

export default Popup
