// 轻小说下载相关的类型定义

export interface Chapter {
  title: string;
  url: string;
}

export interface Volume {
  title: string;
  chapters: Chapter[];
  cover?: string;
}

export interface NovelInfo {
  id: string;
  title: string;
  author: string;
  cover?: string;
  status: string;
  description?: string;
  volumes: Volume[];
  source: "bili" | "wenku";
}

export interface DownloadProgress {
  current: number;
  total: number;
  status: string;
}

export interface ParseResult {
  novelInfo: NovelInfo;
  totalChapters: number;
}
