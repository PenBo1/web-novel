import { useState } from "react"
import { Plus, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ScraperRule } from "@/lib/scraper/types"

interface CreateRuleDialogProps {
  onRuleCreate: (rule: ScraperRule) => void
}

export function CreateRuleDialog({ onRuleCreate }: CreateRuleDialogProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"form" | "json">("form")
  const [error, setError] = useState<string | null>(null)
  
  // Form mode state
  const [formData, setFormData] = useState<Partial<ScraperRule>>({
    name: "",
    url: "",
    search: {
      url: "",
      method: "post",
      result: "",
      bookName: "",
      author: "",
    },
    book: {
      bookName: "",
      author: "",
      intro: "",
    },
    toc: {
      item: "",
    },
    chapter: {
      title: "",
      content: "",
    },
  })

  // JSON mode state
  const [jsonContent, setJsonContent] = useState("")

  const handleFormChange = (path: string, value: any) => {
    setError(null)
    const keys = path.split(".")
    const newData = JSON.parse(JSON.stringify(formData))
    
    let current = newData
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {}
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value
    
    setFormData(newData)
  }

  const validateRule = (rule: any): string | null => {
    if (!rule.name?.trim()) return "书源名称不能为空"
    if (!rule.url?.trim()) return "书源URL不能为空"
    if (!rule.search?.url?.trim()) return "搜索URL不能为空"
    if (!rule.search?.result?.trim()) return "搜索结果选择器不能为空"
    if (!rule.search?.bookName?.trim()) return "书名选择器不能为空"
    if (!rule.search?.author?.trim()) return "作者选择器不能为空"
    if (!rule.book?.bookName?.trim()) return "书籍页面书名选择器不能为空"
    if (!rule.book?.author?.trim()) return "书籍页面作者选择器不能为空"
    if (!rule.book?.intro?.trim()) return "书籍页面简介选择器不能为空"
    if (!rule.toc?.item?.trim()) return "目录项选择器不能为空"
    if (!rule.chapter?.title?.trim()) return "章节标题选择器不能为空"
    if (!rule.chapter?.content?.trim()) return "章节内容选择器不能为空"
    return null
  }

  const handleFormSubmit = () => {
    const validationError = validateRule(formData)
    if (validationError) {
      setError(validationError)
      return
    }

    const rule: ScraperRule = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name!,
      url: formData.url!,
      search: formData.search as any,
      book: formData.book as any,
      toc: formData.toc as any,
      chapter: formData.chapter as any,
    }

    onRuleCreate(rule)
    resetForm()
    setOpen(false)
  }

  const handleJsonSubmit = () => {
    setError(null)
    if (!jsonContent.trim()) {
      setError("请输入JSON内容")
      return
    }

    try {
      const parsed = JSON.parse(jsonContent)
      const rule = typeof parsed === "object" && parsed !== null ? parsed : null
      
      if (!rule) {
        throw new Error("无效的JSON格式")
      }

      const validationError = validateRule(rule)
      if (validationError) {
        setError(validationError)
        return
      }

      if (!rule.id) {
        rule.id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      onRuleCreate(rule as ScraperRule)
      resetForm()
      setOpen(false)
    } catch (e) {
      setError((e as Error).message || "JSON解析失败")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      url: "",
      search: {
        url: "",
        method: "post",
        result: "",
        bookName: "",
        author: "",
      },
      book: {
        bookName: "",
        author: "",
        intro: "",
      },
      toc: {
        item: "",
      },
      chapter: {
        title: "",
        content: "",
      },
    })
    setJsonContent("")
    setError(null)
    setMode("form")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 h-10">
          <Plus className="w-4 h-4" />
          新建书源
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新建书源规则</DialogTitle>
          <DialogDescription>
            通过表单或JSON创建新的书源规则
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "form" | "json")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">表单编辑</TabsTrigger>
            <TabsTrigger value="json">JSON编辑</TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-4 py-4">
            {/* 基本信息 */}
            <div className="space-y-3 border-b pb-4">
              <h3 className="font-semibold text-sm">基本信息</h3>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="name" className="text-xs">书源名称 *</Label>
                  <Input
                    id="name"
                    placeholder="如：香书小说"
                    value={formData.name || ""}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="url" className="text-xs">书源URL *</Label>
                  <Input
                    id="url"
                    placeholder="如：http://www.xbiqugu.la/"
                    value={formData.url || ""}
                    onChange={(e) => handleFormChange("url", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* 搜索配置 */}
            <div className="space-y-3 border-b pb-4">
              <h3 className="font-semibold text-sm">搜索配置</h3>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="search-url" className="text-xs">搜索URL *</Label>
                  <Input
                    id="search-url"
                    placeholder="搜索接口地址"
                    value={formData.search?.url || ""}
                    onChange={(e) => handleFormChange("search.url", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="search-method" className="text-xs">请求方法 *</Label>
                  <select
                    id="search-method"
                    value={formData.search?.method || "post"}
                    onChange={(e) => handleFormChange("search.method", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="get">GET</option>
                    <option value="post">POST</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="search-data" className="text-xs">请求数据</Label>
                  <Input
                    id="search-data"
                    placeholder='如：{searchkey: %s}'
                    value={formData.search?.data || ""}
                    onChange={(e) => handleFormChange("search.data", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="search-result" className="text-xs">结果选择器 *</Label>
                  <Input
                    id="search-result"
                    placeholder="CSS选择器"
                    value={formData.search?.result || ""}
                    onChange={(e) => handleFormChange("search.result", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="search-bookname" className="text-xs">书名选择器 *</Label>
                    <Input
                      id="search-bookname"
                      placeholder="CSS选择器"
                      value={formData.search?.bookName || ""}
                      onChange={(e) => handleFormChange("search.bookName", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="search-author" className="text-xs">作者选择器 *</Label>
                    <Input
                      id="search-author"
                      placeholder="CSS选择器"
                      value={formData.search?.author || ""}
                      onChange={(e) => handleFormChange("search.author", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="search-latest" className="text-xs">最新章节选择器</Label>
                    <Input
                      id="search-latest"
                      placeholder="CSS选择器"
                      value={formData.search?.latestChapter || ""}
                      onChange={(e) => handleFormChange("search.latestChapter", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="search-update" className="text-xs">更新时间选择器</Label>
                    <Input
                      id="search-update"
                      placeholder="CSS选择器"
                      value={formData.search?.lastUpdateTime || ""}
                      onChange={(e) => handleFormChange("search.lastUpdateTime", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 书籍页面配置 */}
            <div className="space-y-3 border-b pb-4">
              <h3 className="font-semibold text-sm">书籍页面配置</h3>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="book-name" className="text-xs">书名选择器 *</Label>
                    <Input
                      id="book-name"
                      placeholder="CSS选择器"
                      value={formData.book?.bookName || ""}
                      onChange={(e) => handleFormChange("book.bookName", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="book-author" className="text-xs">作者选择器 *</Label>
                    <Input
                      id="book-author"
                      placeholder="CSS选择器"
                      value={formData.book?.author || ""}
                      onChange={(e) => handleFormChange("book.author", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="book-intro" className="text-xs">简介选择器 *</Label>
                  <Input
                    id="book-intro"
                    placeholder="CSS选择器"
                    value={formData.book?.intro || ""}
                    onChange={(e) => handleFormChange("book.intro", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="book-category" className="text-xs">分类选择器</Label>
                    <Input
                      id="book-category"
                      placeholder="CSS选择器"
                      value={formData.book?.category || ""}
                      onChange={(e) => handleFormChange("book.category", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="book-cover" className="text-xs">封面选择器</Label>
                    <Input
                      id="book-cover"
                      placeholder="CSS选择器"
                      value={formData.book?.coverUrl || ""}
                      onChange={(e) => handleFormChange("book.coverUrl", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 目录配置 */}
            <div className="space-y-3 border-b pb-4">
              <h3 className="font-semibold text-sm">目录配置</h3>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="toc-url" className="text-xs">目录URL</Label>
                  <Input
                    id="toc-url"
                    placeholder="目录页面URL模板"
                    value={formData.toc?.url || ""}
                    onChange={(e) => handleFormChange("toc.url", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="toc-item" className="text-xs">目录项选择器 *</Label>
                  <Input
                    id="toc-item"
                    placeholder="CSS选择器"
                    value={formData.toc?.item || ""}
                    onChange={(e) => handleFormChange("toc.item", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* 章节配置 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">章节配置</h3>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="chapter-title" className="text-xs">标题选择器 *</Label>
                  <Input
                    id="chapter-title"
                    placeholder="CSS选择器"
                    value={formData.chapter?.title || ""}
                    onChange={(e) => handleFormChange("chapter.title", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="chapter-content" className="text-xs">内容选择器 *</Label>
                  <Input
                    id="chapter-content"
                    placeholder="CSS选择器"
                    value={formData.chapter?.content || ""}
                    onChange={(e) => handleFormChange("chapter.content", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="chapter-filter" className="text-xs">过滤文本（正则）</Label>
                  <Textarea
                    id="chapter-filter"
                    placeholder="需要过滤的文本正则表达式"
                    value={formData.chapter?.filterTxt || ""}
                    onChange={(e) => handleFormChange("chapter.filterTxt", e.target.value)}
                    className="mt-1 h-20"
                  />
                </div>
                <div>
                  <Label htmlFor="chapter-tag" className="text-xs">过滤标签</Label>
                  <Input
                    id="chapter-tag"
                    placeholder="如：div p script"
                    value={formData.chapter?.filterTag || ""}
                    onChange={(e) => handleFormChange("chapter.filterTag", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="json" className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="json-content" className="text-xs">JSON 内容</Label>
              <Textarea
                id="json-content"
                placeholder={`{
  "name": "书源名称",
  "url": "http://example.com/",
  "search": {
    "url": "http://example.com/search",
    "method": "post",
    "result": ".result",
    "bookName": ".title",
    "author": ".author"
  },
  "book": {
    "bookName": "meta[property='og:novel:book_name']",
    "author": "meta[property='og:novel:author']",
    "intro": "meta[property='og:description']"
  },
  "toc": {
    "item": "#list > a"
  },
  "chapter": {
    "title": "h1",
    "content": "#content"
  }
}`}
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                className="h-[400px] font-mono text-xs"
              />
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>验证失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={mode === "form" ? handleFormSubmit : handleJsonSubmit}>
            创建书源
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
