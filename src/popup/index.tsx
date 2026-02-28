import { useEffect, useState } from "react";
import {
  BookOpen,
  Download,
  HelpCircle,
  Library,
  Search,
  Settings,
  History,
  BookMarked,
  Cloud,
  Loader2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { STORAGE_KEYS, StorageManager } from "@/lib/storage";
import { DownloadRecordManager } from "@/lib/idb-storage";
import { EpubGenerator } from "@/lib/epub-generator";
import type { Book } from "@/lib/types";
import { toast, Toaster } from "sonner";
import "~styles/globals.css";

/**
 * 插件 Popup 主入口
 */
function Popup() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PopupBody />
      <Toaster position="top-center" richColors />
    </ThemeProvider>
  );
}

/**
 * Popup 主体内容组件
 */
function PopupBody() {
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [bookshelf, setBookshelf] = useState<Book[]>([]);
  const [activeTab, setActiveTab] = useState("bookshelf");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { setTheme } = useTheme();

  // 初始化
  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    try {
      // 0. 确保默认数据已初始化
      await StorageManager.initializeDefaults();
    } catch (e) {
      console.error("Failed to initialize defaults:", e);
    }

    // 1. 加载设置
    const currentSettings = await StorageManager.getSettings();
    // 适配 next-themes：将主题 ID 映射为 dark/light
    const themeMode = currentSettings.pluginTheme.includes("light")
      ? "light"
      : "dark";
    setTheme(themeMode);

    // 2. 加载书架
    await loadBookshelf();
  };

  const loadBookshelf = async () => {
    const books = await StorageManager.getBookshelf();

    // chrome.storage.local.get 返回的是一个对象，键为请求的 key
    const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_BOOK_ID);
    const activeId = result[STORAGE_KEYS.ACTIVE_BOOK_ID];

    books.sort((a, b) => b.addedAt - a.addedAt);
    setBookshelf(books);

    if (activeId) {
      const active = books.find((b) => b.id === activeId);
      setCurrentBook(active || null);
    } else {
      setCurrentBook(null);
    }
  };

  const handleDownloadEpub = async (book: Book, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发打开书架
    setDownloadingId(book.id);
    try {
      const chapters = await StorageManager.getBookChapters(book.id);

      if (!chapters || chapters.length === 0) {
        toast.error("书籍内容为空");
        return;
      }

      const generator = new EpubGenerator(book, chapters);
      const blob = await generator.generate();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${book.title}.epub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await DownloadRecordManager.createRecord(book.id, book, chapters, "epub");
      toast.success("导出成功");
    } catch (e: any) {
      console.error("Download error:", e);
      toast.error("导出失败");
    } finally {
      setDownloadingId(null);
    }
  };

  const openTab = (path: string) => {
    chrome.tabs.create({
      url: chrome.runtime.getURL(
        `${path === "options" ? "options" : `tabs/${path}`}.html`,
      ),
    });
  };

  return (
    <div className="w-[520px] h-[600px] bg-background text-foreground font-sans flex flex-col">
      {/* 固定头部导航 */}
      <div className="shrink-0 px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <div className="font-bold text-lg">Web-novel</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            沉浸式网页阅读扩展
          </div>
        </div>
        <div className="flex gap-1 items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => openTab("bookshelf")}
                >
                  <Library className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>我的书架</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => openTab("reader")}
                >
                  <BookMarked className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>阅读</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => openTab("search")}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>全网搜索</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => openTab("download")}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>下载管理</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => openTab("lightnovel")}
                >
                  <Cloud className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>轻小说下载</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => openTab("options")}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>设置</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => openTab("help")}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>帮助中心</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => openTab("changelog")}
                >
                  <History className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>更新日志</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* 标签栏 - 固定 */}
      <div className="shrink-0 px-5 py-2">
        <div className="w-full grid grid-cols-3 h-auto bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab("bookshelf")}
            className={`text-[13px] h-8 rounded transition-all ${
              activeTab === "bookshelf"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            书架
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`text-[13px] h-8 rounded transition-all ${
              activeTab === "search"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            发现
          </button>
          <button
            onClick={() => setActiveTab("help")}
            className={`text-[13px] h-8 rounded transition-all ${
              activeTab === "help"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            关于
          </button>
        </div>
      </div>

      {/* 内容区域 - 可滚动 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "bookshelf" && (
          <div className="p-4 space-y-3">
            {/* 当前阅读卡片 */}
            {currentBook && (
              <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-3 flex gap-3 items-start relative overflow-hidden group hover:border-primary/30 transition-all">
                <div className="w-12 h-16 shrink-0 bg-muted rounded-md shadow-sm overflow-hidden border">
                  {currentBook.cover ? (
                    <img
                      src={currentBook.cover}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                      <BookOpen className="w-5 h-5 opacity-40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" className="text-[10px] px-1.5 h-4">
                      正在读
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {currentBook.totalChapters} 章
                    </span>
                  </div>
                  <h3 className="font-bold text-sm leading-tight truncate mb-0.5">
                    {currentBook.title}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {currentBook.author || "佚名"}
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => openTab("reader")}
                    >
                      继续阅读
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs px-2"
                      onClick={() => openTab("bookshelf")}
                    >
                      管理
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 书架列表 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-semibold text-sm">
                  我的收藏 ({bookshelf.length})
                </h3>
                {bookshelf.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2 hover:text-primary"
                    onClick={() => openTab("bookshelf")}
                  >
                    全部管理
                  </Button>
                )}
              </div>

              {bookshelf.length > 0 ? (
                <div className="grid grid-cols-3 gap-2.5 pb-2">
                  {bookshelf.slice(0, 6).map((book) => (
                    <div
                      key={book.id}
                      className="group relative flex flex-col gap-1.5"
                    >
                      <div
                        className="aspect-[2/3] w-full bg-muted rounded-md border shadow-sm overflow-hidden relative transition-all hover:shadow-md cursor-pointer"
                        onClick={() => openTab("bookshelf")}
                      >
                        {book.cover ? (
                          <img
                            src={book.cover}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-center p-1.5 bg-gradient-to-br from-muted to-muted/50">
                            <BookOpen className="w-6 h-6 opacity-40 mb-0.5" />
                            <span className="text-[9px] line-clamp-2 font-medium">
                              {book.title}
                            </span>
                          </div>
                        )}

                        {/* 悬浮操作层 */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 rounded-full shadow-sm"
                            onClick={(e) => handleDownloadEpub(book, e)}
                            disabled={downloadingId === book.id}
                            title="下载 EPUB"
                          >
                            {downloadingId === book.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </Button>
                        </div>

                        {currentBook?.id === book.id && (
                          <div className="absolute top-1.5 right-1.5 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate leading-tight">
                          {book.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {book.totalChapters} 章
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed rounded-lg bg-muted/5 p-3">
                  <Library className="w-8 h-8 mb-2 opacity-30" />
                  <div className="text-xs font-medium mb-0.5">书架空空如也</div>
                  <div className="text-[11px] text-muted-foreground mb-3">
                    导入或搜索小说开始阅读
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openTab("bookshelf")}
                    className="gap-1.5 h-7 text-xs"
                  >
                    <Library className="w-3 h-3" />
                    前往书架
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "search" && (
          <div className="p-8 text-center space-y-4 flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Search className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-bold">发现精彩小说</h3>
            <p className="text-sm text-muted-foreground">
              前往聚合搜索页，一键抓取全网小说到书架。
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => openTab("search")} size="sm">
                进入搜索中心
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openTab("rules")}
              >
                查看书源
              </Button>
            </div>
          </div>
        )}

        {activeTab === "help" && (
          <div className="p-6 space-y-6 overflow-y-auto">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Web-novel</h3>
                <p className="text-xs text-muted-foreground mt-1">v0.0.1</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold mb-1">关于</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Web-novel 是一款沉浸式网页阅读扩展。支持导入 EPUB
                  文件，在任意网页底部显示阅读条，提供章节/进度保存与快捷键导航功能。
                </p>
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
              <Button
                onClick={() => openTab("help")}
                size="sm"
                variant="outline"
              >
                使用手册
              </Button>
              <Button
                onClick={() => openTab("options")}
                size="sm"
                variant="outline"
              >
                设置
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Popup;
