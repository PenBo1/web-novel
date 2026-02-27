import { useState, useEffect } from "react"
import { Download, Trash2, RotateCcw, BookOpen, Info, Loader2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThemeProvider } from "@/components/theme-provider"
import type { Book, BookChapter } from "@/lib/types"
import { StorageManager } from "@/lib/storage"
import { toast, Toaster } from "sonner"
import "~styles/globals.css"

/**
 * 下载管理页面组件
 * 显示存储的小说下载记录，支持再次下载、删除等操作
 */
export default function DownloadPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [storageUsed, setStorageUsed] = useState<string>("计算中...")

  // 初始化加载书架数据
  useEffect(() => {
    loadBooks()
    calculateStorageUsage()
  }, [])

  const loadBooks = async () => {
    try {
      setIsLoading(true)
      const bookshelf = await StorageManager.getBookshelf()
      setBooks(bookshelf)
    } catch (error) {
      console.error("Load books error:", error)
      toast.error("加载书籍列表失败")
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 计算存储空间使用情况
   */
  const calculateStorageUsage = async () => {
    try {
      const info = await StorageManager.getStorageInfo()
      setStorageUsed(info.estimatedSize)
    } catch (error) {
      console.error("Calculate storage error:", error)
      setStorageUsed("计算失败")
    }
  }

  /**
   * 下载书籍为 HTML 格式
   */
  const handleDownloadBook = async (book: Book) => {
    setDownloadingId(book.id)
    try {
      const chapters = await StorageManager.getBookChapters(book.id)
      
      if (!chapters || chapters.length === 0) {
        toast.error("书籍内容为空，无法下载")
        return
      }

      // 生成 HTML 内容
      const htmlContent = generateHTML(book, chapters)
      
      // 创建 Blob 并下载
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${book.title}_${book.author || "未知作者"}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(`《${book.title}》下载成功`)
    } catch (error) {
      console.error("Download error:", error)
      toast.error("下载失败，请稍后重试")
    } finally {
      setDownloadingId(null)
    }
  }

  /**
   * 删除书籍
   */
  const handleDeleteBook = async (book: Book) => {
    if (!confirm(`确定要删除《${book.title}》吗？此操作不可撤销。`)) {
      return
    }

    try {
      await StorageManager.deleteBook(book.id)
      setBooks(books.filter(b => b.id !== book.id))
      toast.success(`《${book.title}》已删除`)
      // 重新计算存储空间
      calculateStorageUsage()
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("删除失败")
    }
  }

  /**
   * 激活书籍为当前阅读
   */
  const handleActivateBook = async (book: Book) => {
    try {
      await StorageManager.switchBook(book.id)
      toast.success(`已切换到《${book.title}》`)
    } catch (error) {
      console.error("Activate error:", error)
      toast.error("激活失败")
    }
  }

  /**
   * 生成 HTML 文件内容
   */
  const generateHTML = (book: Book, chapters: BookChapter[]): string => {
    // 生成章节内容
    const chaptersContent = chapters
      .map((ch, idx) => `
    <div class="chapter" id="ch${idx}">
      <h2>${escapeHtml(ch.title)}</h2>
      <div class="content">
        ${escapeHtml(ch.content).split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('')}
      </div>
    </div>`)
      .join("")

    // 生成目录
    const toc = chapters
      .map((ch, idx) => `<li><a href="#ch${idx}">${escapeHtml(ch.title)}</a></li>`)
      .join("")

    return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(book.title)}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: 'Georgia', 'SimSun', serif; 
        line-height: 1.8; 
        color: #333; 
        background: #f5f5f5;
        padding: 20px;
      }
      .container { 
        max-width: 800px; 
        margin: 0 auto; 
        background: white; 
        padding: 40px; 
        border-radius: 8px; 
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      h1 { 
        font-size: 2.5em; 
        margin-bottom: 0.5em; 
        text-align: center;
        color: #222;
      }
      .metadata { 
        color: #666; 
        margin-bottom: 2em; 
        border-bottom: 2px solid #eee; 
        padding-bottom: 1em;
        text-align: center;
      }
      .metadata p { margin: 0.5em 0; }
      .toc { 
        margin: 2em 0; 
        padding: 1.5em; 
        background: #f9f9f9; 
        border-left: 4px solid #007bff;
        border-radius: 4px;
      }
      .toc h2 { margin-bottom: 1em; }
      .toc ul { 
        list-style: none; 
        padding-left: 0; 
      }
      .toc li { 
        margin: 0.5em 0; 
      }
      .toc a { 
        text-decoration: none; 
        color: #007bff; 
        transition: color 0.3s;
      }
      .toc a:hover { 
        color: #0056b3; 
        text-decoration: underline;
      }
      .chapter { 
        margin-top: 3em; 
        padding-top: 2em;
        border-top: 1px solid #eee;
      }
      .chapter:first-of-type {
        border-top: none;
        padding-top: 0;
        margin-top: 0;
      }
      h2 { 
        font-size: 1.8em; 
        margin-bottom: 1em; 
        color: #222;
      }
      .content { 
        text-align: justify;
      }
      p { 
        margin: 1em 0; 
        text-indent: 2em;
      }
      p:first-child {
        text-indent: 0;
      }
      @media print {
        body { background: white; }
        .container { box-shadow: none; }
        .chapter { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>${escapeHtml(book.title)}</h1>
      <div class="metadata">
        <p><strong>作者：</strong>${escapeHtml(book.author || "未知")}</p>
        <p><strong>章节数：</strong>${chapters.length}</p>
        <p><strong>导出时间：</strong>${new Date().toLocaleString('zh-CN')}</p>
      </div>
      
      <div class="toc">
        <h2>目录</h2>
        <ul>
          ${toc}
        </ul>
      </div>

      ${chaptersContent}
    </div>
  </body>
</html>`
  }

  /**
   * 转义 HTML 特殊字符
   */
  const escapeHtml = (text: string): string => {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }
    return text.replace(/[&<>"']/g, m => map[m])
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-background text-foreground font-sans p-8 max-w-6xl mx-auto">
        {/* 页眉 */}
        <header className="flex items-center justify-between mb-8 border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Download className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">下载管理</h1>
              <p className="text-sm text-muted-foreground mt-1">管理您的小说下载记录与本地存储</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.close()}>关闭页面</Button>
        </header>

        {/* 统计信息 */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl border bg-card">
            <div className="text-sm text-muted-foreground mb-1">已下载书籍</div>
            <div className="text-3xl font-bold">{books.length}</div>
          </div>
          <div className="p-4 rounded-2xl border bg-card">
            <div className="text-sm text-muted-foreground mb-1">总章节数</div>
            <div className="text-3xl font-bold">{books.reduce((sum, b) => sum + b.totalChapters, 0)}</div>
          </div>
          <div className="p-4 rounded-2xl border bg-card">
            <div className="text-sm text-muted-foreground mb-1">存储空间</div>
            <div className="text-3xl font-bold">{storageUsed}</div>
          </div>
        </div>

        {/* 书籍列表 */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-xl font-bold">我的书库 ({books.length})</h2>
            {books.length > 0 && (
              <Button variant="outline" size="sm" onClick={loadBooks} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                刷新
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="py-20 text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">加载中...</p>
            </div>
          ) : books.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((book) => (
                <div key={book.id} className="p-5 rounded-2xl border bg-card hover:border-primary/30 transition-all flex flex-col gap-4 group">
                  {/* 书籍信息 */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors">{book.title}</h3>
                        <p className="text-sm text-muted-foreground">{book.author || "未知作者"}</p>
                      </div>
                      {book.isScraped && (
                        <Badge variant="outline" className="text-[10px] opacity-70 shrink-0">
                          在线源
                        </Badge>
                      )}
                    </div>

                    {/* 书籍统计 */}
                    <div className="text-[11px] text-muted-foreground space-y-1 mt-3">
                      <p>总章节：{book.totalChapters}</p>
                      <p>阅读进度：第 {(book.progress?.chapterIndex ?? 0) + 1} 章</p>
                      <p>添加时间：{new Date(book.addedAt).toLocaleDateString("zh-CN")}</p>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button 
                      size="sm" 
                      className="flex-1 gap-1.5 h-9 rounded-xl"
                      onClick={() => handleActivateBook(book)}
                    >
                      <BookOpen className="w-4 h-4" />
                      阅读
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 gap-1.5 h-9 rounded-xl"
                      onClick={() => handleDownloadBook(book)}
                      disabled={downloadingId === book.id}
                    >
                      {downloadingId === book.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          下载中
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          导出HTML
                        </>
                      )}
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="w-9 h-9 rounded-xl shrink-0 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeleteBook(book)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* 在线源链接 */}
                  {book.isScraped && book.bookUrl && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="w-full gap-2 text-xs h-8 rounded-lg"
                      asChild
                    >
                      <a href={book.bookUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3 h-3" />
                        查看原始链接
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="inline-flex p-4 rounded-full bg-muted/50">
                <Info className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">还没有下载任何书籍</p>
              <p className="text-sm text-muted-foreground">
                前往<span className="text-primary font-semibold">搜索</span>页面或<span className="text-primary font-semibold">导入</span>本地文件开始阅读
              </p>
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
                  <li>• 所有书籍数据存储在浏览器本地，不会上传到服务器</li>
                  <li>• 点击"阅读"可将书籍设为当前活动，在任何网页上显示阅读条</li>
                  <li>• 点击"导出HTML"可将书籍导出为 HTML 格式，方便在浏览器或其他设备阅读</li>
                  <li>• 删除书籍后无法恢复，请谨慎操作</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </ThemeProvider>
  )
}
