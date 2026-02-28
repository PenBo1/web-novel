/**
 * 核心类型定义
 */

/**
 * 章节内容结构
 */
export interface BookChapter {
  title: string;
  content: string;
  url?: string; // 只有爬取源书籍才有此字段
}

/**
 * 书架中的书籍元数据
 */
export interface Book {
  id: string;
  title: string;
  author?: string;
  cover?: string;
  totalChapters: number;
  addedAt: number;
  isScraped?: boolean; // 是否为在线爬取书籍
  sourceId?: string; // 爬源 ID
  bookUrl?: string; // 在线书籍详情页地址
  progress: {
    chapterIndex: number;
    scroll: number;
  };
}

/**
 * 快捷键配置结构
 */
export interface Shortcut {
  id: string;
  label: string;
  keys: string[];
}

/**
 * 扩展设置项
 */
export interface UserSettings {
  pluginTheme: string;
  readerTheme: string;
  defaultShow: boolean;
  position: "bottom" | "top";
}

/**
 * 下载记录
 * 记录用户导出/下载的书籍信息
 */
export interface DownloadRecord {
  id: string; // 唯一标识符
  bookId: string; // 关联的书籍 ID
  title: string; // 书籍标题
  author?: string; // 作者
  format: "html" | "epub" | "txt"; // 导出格式
  fileSize: number; // 文件大小（字节）
  downloadedAt: number; // 下载时间戳
  fileName: string; // 文件名
  chapterCount: number; // 章节数
  status: "success" | "failed" | "pending"; // 下载状态
  errorMessage?: string; // 错误信息（如果失败）
  sourceUrl?: string; // 原始来源 URL
}
