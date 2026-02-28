import { StorageManager } from "../storage";
import { ScraperEngine } from "../scraper/engine";
import { BUILTIN_RULES } from "../scraper/rules";
import type { Book, BookChapter } from "../types";
import type { ScraperRule } from "../scraper/types";

export type DownloadStatus =
  | "pending"
  | "downloading"
  | "paused"
  | "completed"
  | "error";

export interface DownloadTask {
  bookId: string;
  bookName: string;
  totalChapters: number;
  downloadedChapters: number;
  status: DownloadStatus;
  error?: string;
}

type ProgressCallback = (task: DownloadTask) => void;

export class DownloadManager {
  private static instance: DownloadManager;
  private tasks: Map<string, DownloadTask> = new Map();
  private activeDownloads: Set<string> = new Set();
  private progressCallbacks: Map<string, Set<ProgressCallback>> = new Map();
  private CONCURRENCY = 5; // 并发请求数限制

  private constructor() {}

  static getInstance(): DownloadManager {
    if (!DownloadManager.instance) {
      DownloadManager.instance = new DownloadManager();
    }
    return DownloadManager.instance;
  }

  /**
   * 开始下载书籍
   * @param book 书籍对象
   * @param ruleId 书源规则ID
   * @param isDirect 是否为直接下载（不存书架，暂未完全实现，目前统一走书架逻辑）
   */
  async startDownload(book: Book, ruleId?: string) {
    if (this.activeDownloads.has(book.id)) return;

    const rules = await StorageManager.getRules();
    const rule =
      rules.find((r) => r.id === (ruleId || book.sourceId)) ||
      BUILTIN_RULES.find((r) => r.id === (ruleId || book.sourceId));

    if (!rule) {
      throw new Error("未找到对应的书源规则");
    }

    // 初始化任务状态
    let chapters = await StorageManager.getBookChapters(book.id);
    if (!chapters || chapters.length === 0) {
      // 如果没有章节，尝试获取目录（通常加入书架时已有目录，这里防守一下）
      try {
        const engine = new ScraperEngine(rule);
        const { toc } = await engine.getBookInfo(book.bookUrl!);
        chapters = toc.map((t) => ({
          title: t.title,
          content: "",
          url: t.url,
        }));
        await StorageManager.saveBook(book, chapters);
      } catch (e) {
        throw new Error("获取目录失败");
      }
    }

    const downloadedCount = chapters.filter(
      (c) => c.content && c.content.trim().length > 0,
    ).length;

    const task: DownloadTask = {
      bookId: book.id,
      bookName: book.title,
      totalChapters: chapters.length,
      downloadedChapters: downloadedCount,
      status: "downloading",
    };

    this.tasks.set(book.id, task);
    this.activeDownloads.add(book.id);
    this.notifyProgress(book.id);

    // 异步开始下载
    this.processDownload(book, chapters, rule);
  }

  /**
   * 监听下载进度
   */
  onProgress(bookId: string, callback: ProgressCallback) {
    if (!this.progressCallbacks.has(bookId)) {
      this.progressCallbacks.set(bookId, new Set());
    }
    this.progressCallbacks.get(bookId)!.add(callback);

    // 如果有当前状态，立即回调一次
    if (this.tasks.has(bookId)) {
      callback(this.tasks.get(bookId)!);
    }

    return () => {
      const callbacks = this.progressCallbacks.get(bookId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.progressCallbacks.delete(bookId);
        }
      }
    };
  }

  private async processDownload(
    book: Book,
    chapters: BookChapter[],
    rule: ScraperRule,
  ) {
    const engine = new ScraperEngine(rule);
    const task = this.tasks.get(book.id)!;

    // 找出未下载的章节
    const pendingChapters = chapters
      .map((c, index) => ({ c, index }))
      .filter(({ c }) => !c.content || c.content.trim().length === 0);

    if (pendingChapters.length === 0) {
      task.status = "completed";
      this.activeDownloads.delete(book.id);
      this.notifyProgress(book.id);
      return;
    }

    try {
      // 分批处理
      for (let i = 0; i < pendingChapters.length; i += this.CONCURRENCY) {
        if (!this.activeDownloads.has(book.id)) {
          task.status = "paused";
          this.notifyProgress(book.id);
          return;
        }

        const batch = pendingChapters.slice(i, i + this.CONCURRENCY);

        await Promise.all(
          batch.map(async ({ c, index }) => {
            if (c.url) {
              try {
                const content = await engine.getChapterContent(c.url);
                chapters[index].content = content;
                task.downloadedChapters++;
              } catch (e) {
                console.warn(`Chapter ${index} download failed:`, e);
                // 失败暂不处理，保留空内容以便重试
              }
            }
          }),
        );

        // 每批次保存一次，防止数据丢失
        await StorageManager.saveBook(book, chapters);
        this.notifyProgress(book.id);
      }

      task.status = "completed";
    } catch (e: any) {
      console.error("Download process error:", e);
      task.status = "error";
      task.error = e.message;
    } finally {
      this.activeDownloads.delete(book.id);
      this.notifyProgress(book.id);
    }
  }

  private notifyProgress(bookId: string) {
    const task = this.tasks.get(bookId);
    const callbacks = this.progressCallbacks.get(bookId);
    if (task && callbacks) {
      callbacks.forEach((cb) => cb({ ...task }));
    }
  }

  getTask(bookId: string): DownloadTask | undefined {
    return this.tasks.get(bookId);
  }
}
