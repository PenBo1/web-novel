// 轻小说下载管理器

import type { NovelInfo, DownloadProgress } from "./types"
import { getBiliChapterContent } from "./bili-parser"
import { getWenkuChapter } from "./wenku-parser"
import type { BookChapter } from "@/lib/types"

// 下载速率限制（毫秒）
const DOWNLOAD_DELAY = 300

/**
 * 计算需要下载的总章节数
 */
export const calculateTotalChapters = (
  novelInfo: NovelInfo,
  selectedVolumes: Set<number>,
  startChapter: number,
  endChapter: number
): number => {
  let total = 0
  const selectedList = Array.from(selectedVolumes).sort((a, b) => a - b)

  selectedList.forEach((volumeIdx) => {
    const volume = novelInfo.volumes[volumeIdx]
    if (volume) {
      const volumeStart = volumeIdx === selectedList[0] ? startChapter - 1 : 0
      const volumeEnd = volumeIdx === selectedList[selectedList.length - 1] ? endChapter : volume.chapters.length
      total += Math.max(0, volumeEnd - volumeStart)
    }
  })

  return total
}

/**
 * 下载单个章节
 */
const downloadChapter = async (url: string, source: "bili" | "wenku"): Promise<string> => {
  if (source === "bili") {
    // 使用 bili-parser 中的完整实现
    const chapter = { title: "", url }
    return getBiliChapterContent(chapter)
  } else {
    // 使用 wenku-parser 中的完整实现
    const chapter = { title: "", url }
    return getWenkuChapter(chapter)
  }
}

/**
 * 转义 HTML 特殊字符
 */
export const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

/**
 * 生成卷标题章节
 */
export const createVolumeTitleChapter = (volumeTitle: string): BookChapter => ({
  title: volumeTitle,
  content: `<h1 style="text-align: center; margin: 2em 0; font-size: 1.8em;">${escapeHtml(volumeTitle)}</h1>`
})

/**
 * 生成错误章节
 */
export const createErrorChapter = (title: string, error: Error): BookChapter => ({
  title,
  content: `<p style="color: red; text-align: center;">[章节加载失败: ${error.message}]</p>`
})

/**
 * 下载小说章节
 */
export const downloadNovelChapters = async (
  novelInfo: NovelInfo,
  selectedVolumes: Set<number>,
  startChapter: number,
  endChapter: number,
  addVolumeTitle: boolean,
  onProgress: (progress: DownloadProgress) => void
): Promise<BookChapter[]> => {
  const chapters: BookChapter[] = []
  const selectedList = Array.from(selectedVolumes).sort((a, b) => a - b)
  const totalChapters = calculateTotalChapters(novelInfo, selectedVolumes, startChapter, endChapter)

  let downloadedCount = 0

  // 下载选中的卷
  for (const volumeIdx of selectedList) {
    const volume = novelInfo.volumes[volumeIdx]
    if (!volume) continue

    // 添加卷标题
    if (addVolumeTitle && volume.title) {
      chapters.push(createVolumeTitleChapter(volume.title))
    }

    // 计算该卷的章节范围
    const volumeStart = volumeIdx === selectedList[0] ? startChapter - 1 : 0
    const volumeEnd = volumeIdx === selectedList[selectedList.length - 1] ? endChapter : volume.chapters.length

    // 下载该卷的章节
    for (let i = volumeStart; i < Math.min(volumeEnd, volume.chapters.length); i++) {
      const chapter = volume.chapters[i]

      try {
        onProgress({
          current: downloadedCount + 1,
          total: totalChapters,
          status: `下载中: ${chapter.title}`
        })

        const content = await downloadChapter(chapter.url, novelInfo.source)
        chapters.push({
          title: chapter.title,
          content
        })

        downloadedCount++
      } catch (error) {
        console.error(`Failed to download chapter ${i}:`, error)
        chapters.push(createErrorChapter(chapter.title, error as Error))
        downloadedCount++
      }

      // 速率限制
      await new Promise(resolve => setTimeout(resolve, DOWNLOAD_DELAY))
    }
  }

  if (chapters.length === 0) {
    throw new Error("未下载到任何章节")
  }

  return chapters
}
