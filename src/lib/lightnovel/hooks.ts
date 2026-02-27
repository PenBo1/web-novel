// 轻小说下载相关的 React hooks

import { useState } from "react"
import { toast } from "sonner"
import { parseBilibiliNovel } from "./bili-parser"
import { parseWenkuNovel } from "./wenku-parser"
import { downloadNovelChapters, calculateTotalChapters } from "./downloader"
import { StorageManager } from "@/lib/storage"
import type { NovelInfo, DownloadProgress } from "./types"
import type { Book } from "@/lib/types"

/**
 * 轻小说解析 hook
 */
export const useNovelParser = () => {
  const [isLoading, setIsLoading] = useState(false)

  const parseNovel = async (input: string, source: "bili" | "wenku"): Promise<NovelInfo> => {
    setIsLoading(true)
    try {
      const novelInfo = source === "bili" ? await parseBilibiliNovel(input) : await parseWenkuNovel(input)

      const totalChapters = novelInfo.volumes.reduce((sum, v) => sum + v.chapters.length, 0)
      toast.success(`成功获取《${novelInfo.title}》的信息，共 ${novelInfo.volumes.length} 卷 ${totalChapters} 章`)

      return novelInfo
    } catch (error: any) {
      console.error("Parse error:", error)
      toast.error(error?.message || "解析失败，请检查输入是否正确")
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return { parseNovel, isLoading }
}

/**
 * 轻小说下载 hook
 */
export const useNovelDownloader = () => {
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)

  const downloadNovel = async (
    novelInfo: NovelInfo,
    selectedVolumes: Set<number>,
    startChapter: number,
    endChapter: number,
    addVolumeTitle: boolean
  ): Promise<void> => {
    if (selectedVolumes.size === 0) {
      toast.error("请选择要下载的卷")
      return
    }

    const start = Math.max(1, startChapter)
    const end = endChapter || 999999

    setDownloadProgress({ current: 0, total: 0, status: "准备下载..." })

    try {
      // 下载章节
      const chapters = await downloadNovelChapters(
        novelInfo,
        selectedVolumes,
        start,
        end,
        addVolumeTitle,
        setDownloadProgress
      )

      // 保存到书架
      const newBook: Book = {
        id: crypto.randomUUID(),
        title: novelInfo.title,
        author: novelInfo.author,
        cover: novelInfo.cover,
        totalChapters: chapters.length,
        addedAt: Date.now(),
        isScraped: true,
        sourceId: novelInfo.id,
        progress: { chapterIndex: 0, scroll: 0 }
      }

      await StorageManager.saveBook(newBook, chapters)
      await StorageManager.switchBook(newBook.id)

      setDownloadProgress(null)
      toast.success(`《${novelInfo.title}》已添加到书架，共 ${chapters.length} 章`)
    } catch (error: any) {
      console.error("Download error:", error)
      toast.error(error?.message || "下载失败，请稍后重试")
      setDownloadProgress(null)
    }
  }

  return { downloadNovel, downloadProgress }
}

/**
 * 卷选择管理 hook
 */
export const useVolumeSelection = (initialVolumes: number = 0) => {
  const [selectedVolumes, setSelectedVolumes] = useState<Set<number>>(
    initialVolumes > 0 ? new Set([0]) : new Set()
  )

  const toggleVolume = (index: number) => {
    const newSelected = new Set(selectedVolumes)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedVolumes(newSelected)
  }

  const toggleAllVolumes = (totalVolumes: number) => {
    if (selectedVolumes.size === totalVolumes) {
      setSelectedVolumes(new Set())
    } else {
      setSelectedVolumes(new Set(Array.from({ length: totalVolumes }, (_, i) => i)))
    }
  }

  return { selectedVolumes, setSelectedVolumes, toggleVolume, toggleAllVolumes }
}
