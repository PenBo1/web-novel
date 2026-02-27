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
    sourceId?: string;   // 爬源 ID
    bookUrl?: string;    // 在线书籍详情页地址
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
