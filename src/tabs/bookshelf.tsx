import { useState, useEffect, useRef } from "react"
import { BookOpen, Library, RotateCcw, Trash2, Upload, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThemeProvider } from "@/components/theme-provider"
import type { Book, BookChapter } from "@/lib/types"
import { StorageManager } from "@/lib/storage"
import { toast, Toaster } from "sonner"
import "~styles/globals.css"

/**
 * 书架管理页面
 * 展示所有已导入的书籍，支持阅读、删除、导入等操作
 */
export default function BookshelfPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [currentBook, setCurrentBook] = useState<Book | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [status, setStatus] = useState("加载中...")

  // 初始化加载书架数据
  useEffect(() => {
    loadBookshelf()
  }, [])

  const loadBookshelf = async () => {
    try {
      setIsLoading(true)
      const bookshelf = await StorageManager.getBookshelf()
      const activeId = await StorageManager.getActiveBookId()
      
      bookshelf.sort((a, b) => b.addedAt - a.addedAt)
      setBooks(bookshelf)

      if (activeId) {
        const active = bookshelf.find(b => b.id === activeId)
        setCurrentBook(active || null)
      } else {
        setCurrentBook(null)
      }
      setStatus("")
    } catch (error) {
      console.error("Load bookshelf error:", error)
      toast.error("加载书架失败")
    } finally {
      setIsLoading(false)
    }
  }

  const onPickFile = () => fileInputRef.current?.click()

  /**
   * 处理本地 EPUB 导入
   */
  const onFileChange = async (file: File | null) => {
    if (!file) return
    setIsBusy(true)
    setStatus("处理中...")
    try {
      const { info, chapters } = await importEpubFile(file)
      
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
      toast.success("导入成功")
      setStatus("")
    } catch (e: any) {
      toast.error(`导入失败：${e?.message ?? String(e)}`)
    } finally {
      setIsBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const onSetCurrent = async (book: Book) => {
    if (currentBook?.id === book.id) return
    setIsBusy(true)
    try {
      await StorageManager.switchBook(book.id)
      await loadBookshelf()
      toast.success(`已切换到《${book.title}》`)
      // 打开阅读页面
      setTimeout(() => {
        chrome.tabs.create({ url: chrome.runtime.getURL("tabs/reader.html") })
      }, 500)
    } catch (e: any) {
      toast.error(`切换失败：${e?.message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const onDeleteBook = async (book: Book) => {
    if (!confirm(`确定要删除《${book.title}》吗？此操作不可恢复。`)) return
    setIsBusy(true)
    try {
      await StorageManager.deleteBook(book.id)
      await loadBookshelf()
      toast.success("删除成功")
    } catch (e: any) {
      toast.error(`删除失败：${e?.message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const onResetProgress = async () => {
    if (!currentBook) return
    if (!confirm(`确定要重置《${currentBook.title}》的阅读进度吗？`)) return
    
    setIsBusy(true)
    try {
      await StorageManager.updateBookProgress(currentBook.id, 0, 0)
      await loadBookshelf()
      toast.success("进度已重置")
    } catch (e: any) {
      toast.error(`重置失败：${e?.message}`)
    } finally {
      setIsBusy(false)
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
      setBooks([])
      setCurrentBook(null)
      toast.success("已清空书架")
    } catch (e: any) {
      toast.error(`清空失败：${e?.message}`)
    } finally {
      setIsBusy(false)
    }
  }

  /**
   * 导入 EPUB 文件
   */
  async function importEpubFile(file: File) {
    const JSZip = (await import("jszip")).default
    const zip = new JSZip()
    const zipData = await zip.loadAsync(file)

    // 查找 OPF 文件
    let opfPath = ""
    for (const path of Object.keys(zipData.files)) {
      if (path.endsWith(".opf")) {
        opfPath = path
        break
      }
    }

    if (!opfPath) throw new Error("无效的 EPUB 文件：找不到 OPF 文件")

    const opfContent = await readZipFileAsString(zip, opfPath)
    const parser = new DOMParser()
    const opfDoc = parser.parseFromString(opfContent, "text/xml")

    // 提取元数据
    const info = getEpubMeta(opfDoc, file.name)
    info.cover = await extractCoverImage(zip, opfDoc, opfPath)

    // 提取章节
    const chapters: BookChapter[] = []
    const spine = opfDoc.querySelector("spine")
    if (spine) {
      const itemrefs = spine.querySelectorAll("itemref")
      for (const itemref of itemrefs) {
        const idref = itemref.getAttribute("idref")
        if (!idref) continue

        const item = opfDoc.querySelector(`manifest item[id="${idref}"]`)
        if (!item) continue

        const href = item.getAttribute("href")
        if (!href) continue

        const fullPath = opfPath.substring(0, opfPath.lastIndexOf("/") + 1) + href
        const content = await readZipFileAsString(zip, fullPath)
        const doc = parser.parseFromString(content, "text/html")

        const title = doc.querySelector("h1, h2, h3, title")?.textContent || `第 ${chapters.length + 1} 章`
        const body = doc.body?.textContent || ""

        chapters.push({ title, content: body })
      }
    }

    if (chapters.length === 0) throw new Error("无法提取章节内容")

    return { info, chapters }
  }

  async function readZipFileAsString(zip: any, path: string) {
    return await zip.file(path).async("string")
  }

  function getEpubMeta(doc: Document, name: string) {
    const title = doc.querySelector("metadata title")?.textContent || name.replace(".epub", "")
    const author = doc.querySelector("metadata creator")?.textContent || "未知作者"
    return { title, author, cover: "" }
  }

  async function extractCoverImage(zip: any, opfDoc: Document, opfPath: string) {
    try {
      const coverItem = opfDoc.querySelector('manifest item[properties*="cover"]')
      if (!coverItem) return ""

      const href = coverItem.getAttribute("href")
      if (!href) return ""

      const fullPath = opfPath.substring(0, opfPath.lastIndexOf("/") + 1) + href
      const imageData = await zip.file(fullPath).async("arraybuffer")
      const blob = new Blob([imageData])
      return URL.createObjectURL(blob)
    } catch {
      return ""
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-background text-foreground font-sans p-8 max-w-6xl mx-auto">
        {/* 页眉 */}
        <header className="flex items-center justify-between mb-8 border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Library className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">我的书架</h1>
              <p className="text-sm text-muted-foreground mt-1">管理您的电子书库，随时随地享受阅读</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.close()}>关闭页面</Button>
        </header>

        {/* 操作栏 */}
        <div className="mb-8 flex gap-3">
          <input 
            ref={fileInputRef} 
            type="file" 
            accept=".epub" 
            className="hidden" 
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            disabled={isBusy}
          />
          <Button onClick={onPickFile} disabled={isBusy} className="gap-2">
            <Upload className="w-4 h-4" />
            本地导入
          </Button>
          {books.length > 0 && (
            <Button 
              variant="outline" 
              onClick={onClear} 
              disabled={isBusy}
              className="gap-2 hover:text-destructive hover:border-destructive"
            >
              <Trash2 className="w-4 h-4" />
              清空书架
            </Button>
          )}
        </div>

        {/* 当前阅读卡片 */}
        {currentBook && (
          <section className="mb-8">
            <h2 className="text-lg font-bold mb-4">正在阅读</h2>
            <div className="rounded-2xl border bg-card p-6 hover:border-primary/30 transition-all cursor-pointer" onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("tabs/reader.html") })}>
              <div className="flex gap-6 items-start">
                <div className="w-32 h-48 shrink-0 bg-muted rounded-lg shadow-md overflow-hidden border hover:shadow-lg transition-shadow">
                  {currentBook.cover ? (
                    <img src={currentBook.cover} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12 opacity-30" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold">{currentBook.title}</h3>
                    <Badge className="text-xs">正在读</Badge>
                  </div>
                  <p className="text-muted-foreground mb-4">{currentBook.author || "未知作者"}</p>
                  
                  <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <div className="text-sm text-muted-foreground">总章节</div>
                      <div className="text-2xl font-bold">{currentBook.totalChapters}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">阅读进度</div>
                      <div className="text-2xl font-bold">第 {(currentBook.progress?.chapterIndex ?? 0) + 1} 章</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">添加时间</div>
                      <div className="text-sm font-medium">{new Date(currentBook.addedAt).toLocaleDateString("zh-CN")}</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onResetProgress()
                      }}
                      disabled={isBusy}
                      className="gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      重置进度
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 书架列表 */}
        <section>
          <div className="flex items-center justify-between mb-6 border-b pb-4">
            <h2 className="text-lg font-bold">我的收藏 ({books.length})</h2>
          </div>

          {isLoading ? (
            <div className="py-20 text-center">
              <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                <Library className="w-8 h-8 text-muted-foreground animate-pulse" />
              </div>
              <p className="text-muted-foreground">加载中...</p>
            </div>
          ) : books.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {books.map((book) => (
                <div 
                  key={book.id} 
                  className="group relative flex flex-col gap-3 cursor-pointer"
                >
                  {/* 书籍封面 */}
                  <div className="relative aspect-[2/3] w-full bg-muted rounded-xl border shadow-md overflow-hidden transition-all hover:shadow-lg">
                    {book.cover ? (
                      <img 
                        src={book.cover} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-gradient-to-br from-muted to-muted/50">
                        <BookOpen className="w-10 h-10 opacity-40 mb-2" />
                        <span className="text-xs line-clamp-3 font-medium">{book.title}</span>
                      </div>
                    )}

                    {/* 悬停操作层 */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3 backdrop-blur-sm">
                      {currentBook?.id !== book.id && (
                        <Button 
                          size="sm" 
                          className="w-full text-xs h-8"
                          onClick={() => onSetCurrent(book)}
                          disabled={isBusy}
                        >
                          阅读
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="w-full text-xs h-8"
                        onClick={() => onDeleteBook(book)}
                        disabled={isBusy}
                      >
                        删除
                      </Button>
                    </div>

                    {/* 当前阅读指示 */}
                    {currentBook?.id === book.id && (
                      <div className="absolute top-3 right-3 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </div>
                    )}
                  </div>

                  {/* 书籍信息 */}
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {book.author || "未知作者"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {book.totalChapters} 章
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                <Library className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium mb-2">书架空空如也</p>
              <p className="text-sm text-muted-foreground mb-6">
                点击下方按钮导入本地 EPUB 文件开始阅读
              </p>
              <Button onClick={onPickFile} disabled={isBusy} className="gap-2">
                <Upload className="w-4 h-4" />
                导入第一本书
              </Button>
            </div>
          )}
        </section>

        {/* 提示信息 */}
        {books.length > 0 && (
          <div className="mt-12 p-6 rounded-2xl border border-dashed border-primary/40 bg-primary/5">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-2">💡 使用提示</p>
                <ul className="space-y-1 text-xs">
                  <li>• 支持标准 EPUB 格式的电子书导入</li>
                  <li>• 点击"阅读"可将书籍设为当前活动，在任何网页上显示阅读条</li>
                  <li>• 所有书籍数据存储在浏览器本地，不会上传到服务器</li>
                  <li>• 删除书籍后无法恢复，请谨慎操作</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {status && (
          <div className="mt-6 p-4 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
            {status}
          </div>
        )}
      </div>
    </ThemeProvider>
  )
}
