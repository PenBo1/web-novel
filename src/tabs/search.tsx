import { useState } from "react";
import {
  Search,
  ExternalLink,
  Globe,
  ArrowRight,
  Layout,
  Info,
  Loader2,
  BookPlus,
  Settings,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeProvider } from "@/components/theme-provider";
import { ScraperEngine } from "@/lib/scraper/engine";
import { BUILTIN_RULES } from "@/lib/scraper/rules";
import type { SearchResult as ScraperSearchResult } from "@/lib/scraper/types";
import type { Book, BookChapter } from "@/lib/types";
import { StorageManager } from "@/lib/storage";
import { DownloadRecordManager } from "@/lib/idb-storage";
import { EpubGenerator } from "@/lib/epub-generator";
import { DownloadManager } from "@/lib/download/manager";
import { toast, Toaster } from "sonner";
import "~styles/globals.css";

/**
 * 搜索页面组件
 * 负责聚合搜索全网小说并支持一键抓取至书架
 */
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [results, setResults] = useState<ScraperSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const openRules = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/rules.html") });
  };

  /**
   * 执行搜索逻辑 - 改进版本，添加更好的错误处理和调试
   */
  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("请输入搜索关键词");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setResults([]);

    try {
      const allResults: ScraperSearchResult[] = [];
      const failedSources: string[] = [];

      // 获取最新的书源规则（包括用户自定义的）
      const rules = await StorageManager.getRules();
      const activeRules = rules.length > 0 ? rules : BUILTIN_RULES;

      // 并发搜索所有书源
      const searchPromises = activeRules.map(async (rule) => {
        const engine = new ScraperEngine(rule);
        try {
          console.log(`[Search] 开始搜索: ${rule.name}`);
          const results = await engine.search(query);
          console.log(`[Search] ${rule.name} 返回 ${results.length} 个结果`);
          return results;
        } catch (e) {
          console.error(`[Search] ${rule.name} 搜索失败:`, e);
          failedSources.push(rule.name);
          return [];
        }
      });

      const resultsArray = await Promise.all(searchPromises);
      resultsArray.forEach((res, index) => {
        if (res && Array.isArray(res) && res.length > 0) {
          allResults.push(...res);
        }
      });

      console.log(`[Search] 总共获取 ${allResults.length} 个结果`);

      setResults(allResults);

      // 提供更详细的反馈
      if (allResults.length === 0) {
        if (failedSources.length > 0) {
          toast.error(
            `搜索失败: ${failedSources.join(", ")} 无法连接，请检查网络或稍后重试`,
          );
        } else {
          toast.info("未找到相关小说，请尝试更换关键词或检查书源是否可用");
        }
      } else {
        toast.success(`找到 ${allResults.length} 个搜索结果`);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("搜索出错，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 将选中的搜索结果添加到书架
   */
  const handleAddToShelf = async (result: ScraperSearchResult) => {
    const rules = await StorageManager.getRules();
    const rule =
      rules.find((r) => r.id === result.sourceId) ||
      BUILTIN_RULES.find((r) => r.id === result.sourceId);

    if (!rule) {
      toast.error("找不到对应的书源规则");
      return;
    }

    toast.info(`正在获取《${result.bookName}》详情与目录...`);

    try {
      const engine = new ScraperEngine(rule);
      const { info, toc } = await engine.getBookInfo(result.url);

      if (!toc || !toc.length) {
        toast.error("抓取目录失败，该源目前可能不可用");
        return;
      }

      const bookshelf = await StorageManager.getBookshelf();

      // 避免重复添加
      if (
        bookshelf.some(
          (b) => b.title === info.bookName && b.author === info.author,
        )
      ) {
        toast.warning("书架中已存在此书");
        return;
      }

      // 构造统一的书籍对象
      const newBookId = `scraper-${Date.now()}`;
      const newBook: Book = {
        id: newBookId,
        title: info.bookName,
        author: info.author,
        cover: info.coverUrl,
        totalChapters: toc.length,
        addedAt: Date.now(),
        progress: { chapterIndex: 0, scroll: 0 },
        isScraped: true,
        sourceId: result.sourceId,
        bookUrl: result.url,
      };

      // 将章节目录转换为统一格式（初始内容为空，阅读时按需下载）
      const unifiedChapters: BookChapter[] = toc.map((t, i) => ({
        title: t.title,
        content: "",
        url: t.url,
      }));

      // 使用 StorageManager 统一处理持久化
      await StorageManager.saveBook(newBook, unifiedChapters);

      // 自动设置为当前阅读书籍，以便 Reader Bar 立即响应
      await StorageManager.switchBook(newBookId);

      toast.success(`《${info.bookName}》已入库，开始后台下载全本...`);

      // 触发后台下载
      DownloadManager.getInstance().startDownload(newBook, result.sourceId);
    } catch (error) {
      console.error("Add to shelf error:", error);
      toast.error("添加失败，请尝试其他来源");
    }
  };

  /**
   * 一键抓取并下载 EPUB
   */
  const handleDownloadDirectly = async (result: ScraperSearchResult) => {
    const rules = await StorageManager.getRules();
    const rule =
      rules.find((r) => r.id === result.sourceId) ||
      BUILTIN_RULES.find((r) => r.id === result.sourceId);

    if (!rule) {
      toast.error("找不到对应的书源规则");
      return;
    }

    setDownloadingId(result.url);
    toast.info(`正在准备《${result.bookName}》下载任务...`);

    try {
      const engine = new ScraperEngine(rule);
      const { info, toc } = await engine.getBookInfo(result.url);

      if (!toc || !toc.length) {
        toast.error("抓取目录失败");
        return;
      }

      // 构造临时书籍对象
      const tempBookId = `temp-${Date.now()}`;
      const book: Book = {
        id: tempBookId,
        title: info.bookName,
        author: info.author,
        cover: info.coverUrl,
        totalChapters: toc.length,
        addedAt: Date.now(),
        progress: { chapterIndex: 0, scroll: 0 },
        isScraped: true,
        sourceId: result.sourceId,
        bookUrl: result.url,
      };

      // 初始化章节
      const chapters: BookChapter[] = toc.map((t) => ({
        title: t.title,
        content: "",
        url: t.url,
      }));

      // 保存到数据库以便 DownloadManager 处理
      await StorageManager.saveBook(book, chapters);

      const manager = DownloadManager.getInstance();
      manager.startDownload(book, result.sourceId);

      // 监听下载进度
      await new Promise<void>((resolve, reject) => {
        const unsubscribe = manager.onProgress(tempBookId, (task) => {
          if (task.status === "completed") {
            unsubscribe();
            resolve();
          } else if (task.status === "error") {
            unsubscribe();
            reject(new Error(task.error));
          } else {
            toast.message(
              `正在下载: ${task.downloadedChapters}/${task.totalChapters}`,
              { id: "direct-download" },
            );
          }
        });
      });

      toast.success("下载完成，正在打包 EPUB...", { id: "direct-download" });

      // 读取完整内容
      const fullChapters = await StorageManager.getBookChapters(tempBookId);

      // 生成 EPUB
      const generator = new EpubGenerator(book, fullChapters);
      const blob = await generator.generate();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${info.bookName}_${info.author}.epub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await DownloadRecordManager.createRecord(
        book.id,
        book,
        fullChapters,
        "epub",
      );

      // 清理临时书籍数据
      await StorageManager.deleteBook(tempBookId);

      toast.success(`《${info.bookName}》已导出到本地`);
    } catch (error) {
      console.error("Direct download error:", error);
      toast.error("下载失败，请尝试其他来源");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-background text-foreground font-sans p-8 max-w-6xl mx-auto">
        {/* 页眉 */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur flex items-center justify-between mb-8 border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">全网小说大搜索</h1>
              <p className="text-sm text-muted-foreground mt-1">
                一站式发现全网优质文学资源
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={openRules} className="gap-2">
            <Settings className="w-4 h-4" />
            书源管理
          </Button>
        </header>

        {/* 搜索框 */}
        <div className="mb-10 max-w-2xl mx-auto text-center space-y-4">
          <h2 className="text-3xl font-black tracking-tight">
            找小说，一个搜索框就够了
          </h2>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="输入作品名、作者或关键词..."
              className="w-full bg-muted/40 border-2 border-transparent focus:border-primary/20 rounded-2xl py-5 pl-12 pr-6 text-xl focus:outline-none focus:bg-background shadow-lg transition-all"
            />
            <Button
              className="absolute right-2 top-2 bottom-2 rounded-xl px-8 h-auto text-lg"
              onClick={handleSearch}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "全网搜"
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">
            支持：香书、书海阁等 {BUILTIN_RULES.length} 个内置书源聚合搜索
          </p>
        </div>

        {/* 结果展示区 */}
        {hasSearched && (
          <section className="mb-12 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-xl font-bold">搜索结果 ({results.length})</h2>
              {isLoading && (
                <span className="text-xs text-muted-foreground animate-pulse">
                  正在从多个书源抓取中...
                </span>
              )}
            </div>

            {results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((result, i) => (
                  <div
                    key={`${result.sourceId}-${i}`}
                    className="p-4 rounded-2xl border bg-card hover:border-primary/30 transition-all flex flex-col gap-3 group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                          {result.bookName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {result.author || "未知作者"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] opacity-70"
                      >
                        {
                          BUILTIN_RULES.find((r) => r.id === result.sourceId)
                            ?.name
                        }
                      </Badge>
                    </div>

                    <div className="text-[11px] text-muted-foreground space-y-1">
                      {result.latestChapter && (
                        <p className="line-clamp-1">
                          最新：{result.latestChapter}
                        </p>
                      )}
                      {result.lastUpdateTime && (
                        <p>更新：{result.lastUpdateTime}</p>
                      )}
                    </div>

                    <div className="mt-auto flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5 h-9 rounded-xl"
                          onClick={() => handleAddToShelf(result)}
                        >
                          <BookPlus className="w-4 h-4" />
                          加入书架
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1 gap-1.5 h-9 rounded-xl"
                          onClick={() => handleDownloadDirectly(result)}
                          disabled={downloadingId === result.url}
                        >
                          {downloadingId === result.url ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              下载 EPUB
                            </>
                          )}
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full gap-2 text-xs h-8 rounded-lg"
                        asChild
                      >
                        <a href={result.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-3 h-3" />
                          查看原文
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !isLoading && (
                <div className="py-20 text-center space-y-4">
                  <div className="inline-flex p-4 rounded-full bg-muted/50">
                    <Info className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    没有找到匹配的结果，请换个词试试
                  </p>
                </div>
              )
            )}
          </section>
        )}

        {/* 底部推荐与提示 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="md:col-span-2 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  活跃资源站点
                </h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  推荐收藏
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    name: "知宣搜书",
                    url: "https://zhixuan.la",
                    desc: "主打极致简洁，提供高质量 EPUB 资源下载。",
                    tag: "热门推荐",
                  },
                  {
                    name: "鸠摩搜索",
                    url: "https://www.jiumodiary.com",
                    desc: "非常强大的文档搜索引擎，资源极其丰富。",
                    tag: "必备工具",
                  },
                  {
                    name: "我的小书屋",
                    url: "http://mebook.cc",
                    desc: "老牌精选电子书分享站点，带详细内容介绍。",
                    tag: "精选周刊",
                  },
                  {
                    name: "书伴 (Bookfere)",
                    url: "https://bookfere.com",
                    desc: "不仅是资源，更是关于阅读的一切资讯。",
                    tag: "知识库",
                  },
                  {
                    name: "田间漫步",
                    url: "https://www.tjmb.cc",
                    desc: "精美排版的小说资源站。",
                    tag: "新晋黑马",
                  },
                  {
                    name: "搬书匠",
                    url: "http://www.banshujiang.com",
                    desc: "如果你也对编程和技术书感兴趣。",
                    tag: "技术领域",
                  },
                ].map((site) => (
                  <a
                    key={site.name}
                    href={site.url}
                    target="_blank"
                    className="flex flex-col p-5 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-lg group-hover:text-primary transition-colors">
                        {site.name}
                      </div>
                      <ExternalLink className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                    <div className="text-sm text-muted-foreground leading-snug mb-4">
                      {site.desc}
                    </div>
                    <div className="mt-auto">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-muted rounded-full">
                        {site.tag}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-dashed border-primary/40 p-6 bg-primary/5 relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                  <Layout className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-primary">
                  内置爬虫已开启
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  直接在上方搜索框输入关键词，即可一键将书籍抓取到扩展书架中，无需手动下载文件。
                </p>
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-none"
                >
                  核心功能已上线
                </Badge>
              </div>
            </div>

            <div className="rounded-2xl border p-6 space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Info className="w-4 h-4" />
                搜索小技巧
              </h3>
              <ul className="space-y-3">
                {[
                  "直接搜索书名全称准确度更高",
                  "如果搜不到，尝试只搜索作者名",
                  "抓取成功后可直接在侧边栏激活阅读",
                  "部分站点可能有搜索频率限制",
                ].map((tip, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    <ArrowRight className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </ThemeProvider>
  );
}
