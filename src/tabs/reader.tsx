import { useState, useEffect } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  List,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeProvider } from "@/components/theme-provider";
import type { Book, BookChapter } from "@/lib/types";
import { StorageManager } from "@/lib/storage";
import { toast, Toaster } from "sonner";
import "~styles/globals.css";

/**
 * 小说阅读页面
 * 展示书籍详情和章节内容，支持章节导航和排版显示
 */
export default function ReaderPage() {
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showToc, setShowToc] = useState(false);
  const [view, setView] = useState<"detail" | "read">("detail");

  // 初始化加载书籍数据
  useEffect(() => {
    loadBook();
  }, []);

  const loadBook = async () => {
    try {
      setIsLoading(true);
      const activeId = await StorageManager.getActiveBookId();

      if (!activeId) {
        toast.error("没有选中的书籍");
        return;
      }

      const bookshelf = await StorageManager.getBookshelf();
      const activeBook = bookshelf.find((b) => b.id === activeId);

      if (!activeBook) {
        toast.error("书籍不存在");
        return;
      }

      const bookChapters = await StorageManager.getBookChapters(activeBook.id);

      if (!bookChapters || bookChapters.length === 0) {
        toast.error("章节内容为空");
        return;
      }

      setBook(activeBook);
      setChapters(bookChapters);
      setCurrentChapterIndex(activeBook.progress?.chapterIndex ?? 0);
    } catch (error) {
      console.error("Load book error:", error);
      toast.error("加载书籍失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChapterChange = (index: number) => {
    if (index >= 0 && index < chapters.length) {
      setCurrentChapterIndex(index);
      setView("read");
    }
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      handleChapterChange(currentChapterIndex - 1);
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      handleChapterChange(currentChapterIndex + 1);
    }
  };

  const saveProgress = async () => {
    if (!book) return;
    try {
      await StorageManager.updateBookProgress(book.id, currentChapterIndex, 0);
    } catch (error) {
      console.error("Save progress error:", error);
    }
  };

  useEffect(() => {
    saveProgress();
  }, [currentChapterIndex]);

  if (isLoading) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-muted/50">
              <BookOpen className="w-8 h-8 text-muted-foreground animate-pulse" />
            </div>
            <p className="text-muted-foreground">加载中...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!book || chapters.length === 0) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-muted/50">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">没有可读的书籍</p>
            <Button onClick={() => window.close()}>关闭</Button>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  const currentChapter = chapters[currentChapterIndex];

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Toaster position="top-center" richColors />
      {view === "detail" ? (
        // 详情视图
        <div className="min-h-screen bg-background text-foreground font-sans p-8 max-w-4xl mx-auto">
          {/* 页眉 */}
          <header className="sticky top-0 z-50 bg-background/95 backdrop-blur flex items-center justify-between mb-8 border-b pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">小说阅读</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  沉浸式阅读体验
                </p>
              </div>
            </div>
          </header>

          {/* 书籍详情卡片 */}
          <div className="rounded-2xl border bg-card p-8 mb-8">
            <div className="flex gap-8 items-start">
              {/* 书籍封面 */}
              <div className="w-48 h-72 shrink-0 bg-muted rounded-xl shadow-lg overflow-hidden border">
                {book.cover ? (
                  <img
                    src={book.cover}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <BookOpen className="w-16 h-16 opacity-30" />
                  </div>
                )}
              </div>

              {/* 书籍信息 */}
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-2">{book.title}</h2>
                <p className="text-lg text-muted-foreground mb-6">
                  {book.author || "未知作者"}
                </p>

                {/* 统计信息 */}
                <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      总章节
                    </div>
                    <div className="text-2xl font-bold">{chapters.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      当前进度
                    </div>
                    <div className="text-2xl font-bold">
                      第 {currentChapterIndex + 1} 章
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      完成度
                    </div>
                    <div className="text-2xl font-bold">
                      {Math.round(
                        ((currentChapterIndex + 1) / chapters.length) * 100,
                      )}
                      %
                    </div>
                  </div>
                </div>

                {/* 开始阅读按钮 */}
                <Button
                  size="lg"
                  className="gap-2 mb-4"
                  onClick={() => setView("read")}
                >
                  <BookOpen className="w-5 h-5" />
                  开始阅读
                </Button>
              </div>
            </div>
          </div>

          {/* 章节列表 */}
          <section>
            <h3 className="text-xl font-bold mb-4">章节目录</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-4 rounded-lg border bg-muted/20">
              {chapters.map((chapter, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChapterChange(idx)}
                  className={`text-left p-3 rounded-lg transition-all border ${
                    idx === currentChapterIndex
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-muted hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <div className="text-sm font-medium line-clamp-2">
                    {chapter.title}
                  </div>
                  <div className="text-xs opacity-70 mt-1">第 {idx + 1} 章</div>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : (
        // 阅读视图
        <div className="min-h-screen bg-background text-foreground font-sans flex flex-col h-screen w-screen overflow-hidden">
          {/* 阅读工具栏 */}
          <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b flex-shrink-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setView("detail")}
                >
                  <Home className="w-4 h-4" />
                </Button>
                <div className="text-sm min-w-0">
                  <div className="font-semibold line-clamp-1">{book.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {currentChapter.title}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowToc(!showToc)}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 章节进度 */}
            <div className="px-4 pb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>
                  第 {currentChapterIndex + 1} / {chapters.length} 章
                </span>
                <span>
                  {Math.round(
                    ((currentChapterIndex + 1) / chapters.length) * 100,
                  )}
                  %
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1">
                <div
                  className="bg-primary h-1 rounded-full transition-all"
                  style={{
                    width: `${((currentChapterIndex + 1) / chapters.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 主内容区域 - Flexbox 布局 */}
          <div className="flex flex-1 overflow-hidden">
            {/* 目录侧边栏 */}
            {showToc && (
              <div
                className="fixed inset-0 z-40 bg-black/50 md:hidden"
                onClick={() => setShowToc(false)}
              />
            )}
            <div
              className={`fixed md:relative top-16 md:top-auto left-0 h-[calc(100vh-4rem)] md:h-full w-64 bg-background border-r transform transition-transform md:transform-none ${
                showToc ? "translate-x-0" : "-translate-x-full md:translate-x-0"
              } overflow-y-auto z-40 md:z-auto flex-shrink-0`}
            >
              <div className="p-4 space-y-2">
                {chapters.map((chapter, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      handleChapterChange(idx);
                      setShowToc(false);
                    }}
                    className={`w-full text-left p-2 rounded text-sm transition-all ${
                      idx === currentChapterIndex
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="line-clamp-2">{chapter.title}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 阅读内容区域 */}
            <div className="flex-1 overflow-y-auto w-full">
              <article className="max-w-3xl mx-auto px-6 py-8 sm:px-8">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                  {currentChapter.title}
                </h1>
                <div className="text-sm text-muted-foreground mb-8">
                  第 {currentChapterIndex + 1} 章 / 共 {chapters.length} 章
                </div>

                {/* 章节内容 - 支持 HTML 和纯文本 */}
                <div className="max-w-none leading-relaxed">
                  {currentChapter.content &&
                  currentChapter.content.includes("<") ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(currentChapter.content),
                      }}
                      className="space-y-4 text-base"
                    />
                  ) : (
                    <div className="space-y-4">
                      {currentChapter.content &&
                        currentChapter.content.split("\n").map(
                          (paragraph, idx) =>
                            paragraph.trim() && (
                              <p
                                key={idx}
                                className="text-base leading-8 text-justify"
                              >
                                {paragraph}
                              </p>
                            ),
                        )}
                    </div>
                  )}
                </div>

                {/* 章节导航 */}
                <div className="flex gap-3 mt-12 pt-8 border-t flex-wrap">
                  <Button
                    variant="outline"
                    className="flex-1 min-w-24 gap-2"
                    onClick={handlePrevChapter}
                    disabled={currentChapterIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    上一章
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 min-w-24 gap-2"
                    onClick={() => setView("detail")}
                  >
                    <List className="w-4 h-4" />
                    目录
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 min-w-24 gap-2"
                    onClick={handleNextChapter}
                    disabled={currentChapterIndex === chapters.length - 1}
                  >
                    下一章
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* 底部间距 */}
                <div className="h-12" />
              </article>
            </div>
          </div>
        </div>
      )}
    </ThemeProvider>
  );
}

/**
 * 清理 HTML 内容，防止 XSS 攻击
 */
function sanitizeHtml(html: string): string {
  const allowedTags = [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "div",
    "span",
    "img",
    "a",
  ];
  const allowedAttrs = ["src", "alt", "href", "title", "class"];

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const sanitize = (node: Node): Node => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;

      if (!allowedTags.includes(element.tagName.toLowerCase())) {
        const fragment = document.createDocumentFragment();
        for (const child of Array.from(element.childNodes)) {
          fragment.appendChild(sanitize(child));
        }
        return fragment;
      }

      const newElement = document.createElement(element.tagName);

      for (const attr of Array.from(element.attributes)) {
        if (allowedAttrs.includes(attr.name.toLowerCase())) {
          if (attr.name === "href" && !attr.value.startsWith("javascript:")) {
            newElement.setAttribute(attr.name, attr.value);
          } else if (attr.name !== "href") {
            newElement.setAttribute(attr.name, attr.value);
          }
        }
      }

      for (const child of Array.from(element.childNodes)) {
        newElement.appendChild(sanitize(child));
      }

      return newElement;
    }

    return node;
  };

  const sanitized = sanitize(doc.body) as Element;
  return sanitized.innerHTML;
}
