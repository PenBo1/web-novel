import type { Book, BookChapter, UserSettings, Shortcut } from "./types"
import type { ScraperRule } from "./scraper/types"
import { BUILTIN_RULES } from "./scraper/rules"

/**
 * 存储键名常量，避免硬编码字符串散落在各处
 * 统一管理所有存储键，便于维护和迁移
 */
export const STORAGE_KEYS = {
    // 书架相关
    BOOKSHELF: "bookshelf",
    ACTIVE_BOOK_ID: "activeBookId",
    
    // 用户设置
    SETTINGS: "settings",
    SHORTCUTS: "shortcuts",
    IS_VISIBLE: "isVisible",
    
    // 书源规则
    RULES: "scraper_rules",
    
    // 当前激活书籍的快速访问槽（用于 Reader Bar 快速读取）
    // 这些字段应该与 Book 对象中的字段保持同步
    ACTIVE_CHAPTERS: "bookChapters",
    ACTIVE_TITLE: "bookTitle",
    ACTIVE_AUTHOR: "bookAuthor",
    ACTIVE_TOTAL_CHAPTERS: "totalChapters",
    ACTIVE_CURRENT_INDEX: "currentChapterIndex",
    ACTIVE_CURRENT_SCROLL: "currentScroll",
} as const

/**
 * 获取书籍内容的存储键名
 * @param bookId 书籍ID
 * @returns 存储键名
 */
export const getBookContentKey = (bookId: string) => `book_content_${bookId}`

/**
 * 获取书籍的所有存储键名（用于清理）
 * @param bookId 书籍ID
 * @returns 存储键名数组
 */
export const getBookStorageKeys = (bookId: string) => [
    getBookContentKey(bookId)
]

/**
 * 书架操作工具类
 * 统一管理所有存储操作，确保数据一致性
 */
export const StorageManager = {
    /**
     * 获取书架列表
     * @returns 书籍数组
     */
    async getBookshelf(): Promise<Book[]> {
        try {
            const data = await chrome.storage.local.get(STORAGE_KEYS.BOOKSHELF)
            return (data[STORAGE_KEYS.BOOKSHELF] as Book[]) || []
        } catch (error) {
            console.error("Failed to get bookshelf:", error)
            return []
        }
    },

    /**
     * 获取书籍的章节内容
     * @param bookId 书籍ID
     * @returns 章节数组
     */
    async getBookChapters(bookId: string): Promise<BookChapter[]> {
        try {
            const key = getBookContentKey(bookId)
            const data = await chrome.storage.local.get(key)
            return (data[key] as BookChapter[]) || []
        } catch (error) {
            console.error(`Failed to get chapters for book ${bookId}:`, error)
            return []
        }
    },

    /**
     * 将书籍保存/更新到书架
     * 同时保存章节内容
     * @param book 书籍对象
     * @param chapters 章节数组
     */
    async saveBook(book: Book, chapters: BookChapter[]): Promise<void> {
        try {
            const bookshelf = await this.getBookshelf()
            const index = bookshelf.findIndex(b => b.id === book.id)
            const newShelf = [...bookshelf]

            if (index >= 0) {
                newShelf[index] = book
            } else {
                newShelf.unshift(book)
            }

            await chrome.storage.local.set({
                [STORAGE_KEYS.BOOKSHELF]: newShelf,
                [getBookContentKey(book.id)]: chapters
            })
        } catch (error) {
            console.error("Failed to save book:", error)
            throw error
        }
    },

    /**
     * 更新书籍进度
     * 同时更新书架和快速访问槽
     * @param bookId 书籍ID
     * @param chapterIndex 当前章节索引
     * @param scroll 滚动位置
     */
    async updateBookProgress(bookId: string, chapterIndex: number, scroll: number): Promise<void> {
        try {
            const bookshelf = await this.getBookshelf()
            const book = bookshelf.find(b => b.id === bookId)
            
            if (!book) throw new Error(`Book ${bookId} not found`)

            const updatedBook = {
                ...book,
                progress: { chapterIndex, scroll }
            }

            const newShelf = bookshelf.map(b => b.id === bookId ? updatedBook : b)

            // 同时更新书架和快速访问槽
            const updates: Record<string, any> = {
                [STORAGE_KEYS.BOOKSHELF]: newShelf,
                [STORAGE_KEYS.ACTIVE_CURRENT_INDEX]: chapterIndex,
                [STORAGE_KEYS.ACTIVE_CURRENT_SCROLL]: scroll
            }

            await chrome.storage.local.set(updates)
        } catch (error) {
            console.error("Failed to update book progress:", error)
            throw error
        }
    },

    /**
     * 切换当前激活的书籍
     * 更新快速访问槽，使 Reader Bar 能快速访问
     * @param bookId 书籍ID
     */
    async switchBook(bookId: string): Promise<void> {
        try {
            const bookshelf = await this.getBookshelf()
            const book = bookshelf.find(b => b.id === bookId)
            
            if (!book) throw new Error(`Book ${bookId} not found`)

            const chapters = await this.getBookChapters(bookId)
            if (!chapters || chapters.length === 0) {
                throw new Error(`No chapters found for book ${bookId}`)
            }

            await chrome.storage.local.set({
                [STORAGE_KEYS.ACTIVE_BOOK_ID]: bookId,
                [STORAGE_KEYS.ACTIVE_CHAPTERS]: chapters,
                [STORAGE_KEYS.ACTIVE_TITLE]: book.title,
                [STORAGE_KEYS.ACTIVE_AUTHOR]: book.author || "",
                [STORAGE_KEYS.ACTIVE_TOTAL_CHAPTERS]: book.totalChapters,
                [STORAGE_KEYS.ACTIVE_CURRENT_INDEX]: book.progress.chapterIndex,
                [STORAGE_KEYS.ACTIVE_CURRENT_SCROLL]: book.progress.scroll,
            })
        } catch (error) {
            console.error("Failed to switch book:", error)
            throw error
        }
    },

    /**
     * 获取当前激活的书籍ID
     * @returns 书籍ID或null
     */
    async getActiveBookId(): Promise<string | null> {
        try {
            const data = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_BOOK_ID)
            return data[STORAGE_KEYS.ACTIVE_BOOK_ID] || null
        } catch (error) {
            console.error("Failed to get active book ID:", error)
            return null
        }
    },

    /**
     * 删除书籍及其所有相关数据
     * @param bookId 书籍ID
     */
    async deleteBook(bookId: string): Promise<void> {
        try {
            const bookshelf = await this.getBookshelf()
            const newShelf = bookshelf.filter(b => b.id !== bookId)
            const activeId = await this.getActiveBookId()

            const keysToRemove = getBookStorageKeys(bookId)

            // 如果删除的是当前激活的书，清除快速访问槽
            if (activeId === bookId) {
                keysToRemove.push(
                    STORAGE_KEYS.ACTIVE_BOOK_ID,
                    STORAGE_KEYS.ACTIVE_CHAPTERS,
                    STORAGE_KEYS.ACTIVE_TITLE,
                    STORAGE_KEYS.ACTIVE_AUTHOR,
                    STORAGE_KEYS.ACTIVE_TOTAL_CHAPTERS,
                    STORAGE_KEYS.ACTIVE_CURRENT_INDEX,
                    STORAGE_KEYS.ACTIVE_CURRENT_SCROLL
                )
            }

            await chrome.storage.local.set({ [STORAGE_KEYS.BOOKSHELF]: newShelf })
            await chrome.storage.local.remove(keysToRemove)
        } catch (error) {
            console.error("Failed to delete book:", error)
            throw error
        }
    },

    /**
     * 加载设置
     * @returns 用户设置对象
     */
    async getSettings(): Promise<UserSettings> {
        try {
            const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS)
            return data[STORAGE_KEYS.SETTINGS] || {
                pluginTheme: "21st-dark",
                readerTheme: "21st-dark",
                defaultShow: true,
                position: "bottom"
            }
        } catch (error) {
            console.error("Failed to get settings:", error)
            return {
                pluginTheme: "21st-dark",
                readerTheme: "21st-dark",
                defaultShow: true,
                position: "bottom"
            }
        }
    },

    /**
     * 保存设置
     * @param settings 用户设置对象
     */
    async saveSettings(settings: UserSettings): Promise<void> {
        try {
            await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings })
        } catch (error) {
            console.error("Failed to save settings:", error)
            throw error
        }
    },

    /**
     * 获取书源规则
     * 优先从本地存储获取，如果为空则返回内置规则并初始化存储
     * @returns 书源规则数组
     */
    async getRules(): Promise<ScraperRule[]> {
        try {
            const data = await chrome.storage.local.get(STORAGE_KEYS.RULES)
            const rules = data[STORAGE_KEYS.RULES] as ScraperRule[]

            if (!rules || rules.length === 0) {
                // 初始化内置规则
                await chrome.storage.local.set({ [STORAGE_KEYS.RULES]: BUILTIN_RULES })
                return BUILTIN_RULES
            }

            return rules
        } catch (error) {
            console.error("Failed to get rules:", error)
            return BUILTIN_RULES
        }
    },

    /**
     * 保存书源规则
     * @param rules 书源规则数组
     */
    async saveRules(rules: ScraperRule[]): Promise<void> {
        try {
            await chrome.storage.local.set({ [STORAGE_KEYS.RULES]: rules })
        } catch (error) {
            console.error("Failed to save rules:", error)
            throw error
        }
    },

    /**
     * 获取默认快捷键
     * @returns 默认快捷键数组
     */
    getDefaultShortcuts(): Shortcut[] {
        return [
            { id: "toggle", label: "显示/隐藏阅读条", keys: ["Alt", "S"] },
            { id: "prev", label: "上一页", keys: ["ArrowLeft"] },
            { id: "next", label: "下一页", keys: ["ArrowRight"] },
            { id: "boss", label: "老板键 (瞬间隐藏)", keys: ["Escape"] },
            { id: "switchBook", label: "小说切换", keys: ["Alt", "B"] },
            { id: "toggleTheme", label: "阅读条主题切换", keys: ["Alt", "T"] }
        ]
    },

    /**
     * 获取快捷键设置
     * @returns 快捷键数组
     */
    async getShortcuts(): Promise<Shortcut[]> {
        try {
            const data = await chrome.storage.local.get(STORAGE_KEYS.SHORTCUTS)
            const shortcuts = data[STORAGE_KEYS.SHORTCUTS] as Shortcut[]
            const defaultShortcuts = this.getDefaultShortcuts()

            if (!shortcuts || shortcuts.length === 0) {
                await chrome.storage.local.set({ [STORAGE_KEYS.SHORTCUTS]: defaultShortcuts })
                return defaultShortcuts
            }

            // 检查是否有缺失的快捷键，如果有则补充
            const existingIds = new Set(shortcuts.map(s => s.id))
            const missingShortcuts = defaultShortcuts.filter(s => !existingIds.has(s.id))
            
            if (missingShortcuts.length > 0) {
                const updatedShortcuts = [...shortcuts, ...missingShortcuts]
                await chrome.storage.local.set({ [STORAGE_KEYS.SHORTCUTS]: updatedShortcuts })
                return updatedShortcuts
            }

            return shortcuts
        } catch (error) {
            console.error("Failed to get shortcuts:", error)
            return []
        }
    },

    /**
     * 保存快捷键设置
     * @param shortcuts 快捷键数组
     */
    async saveShortcuts(shortcuts: Shortcut[]): Promise<void> {
        try {
            await chrome.storage.local.set({ [STORAGE_KEYS.SHORTCUTS]: shortcuts })
        } catch (error) {
            console.error("Failed to save shortcuts:", error)
            throw error
        }
    },

    /**
     * 清空所有数据（谨慎使用）
     */
    async clearAll(): Promise<void> {
        try {
            await chrome.storage.local.clear()
        } catch (error) {
            console.error("Failed to clear storage:", error)
            throw error
        }
    },

    /**
     * 获取存储使用情况
     * @returns 存储使用信息
     */
    async getStorageInfo(): Promise<{
        totalBooks: number
        totalChapters: number
        estimatedSize: string
    }> {
        try {
            const bookshelf = await this.getBookshelf()
            let totalChapters = 0
            let totalBytes = 0

            for (const book of bookshelf) {
                const chapters = await this.getBookChapters(book.id)
                totalChapters += chapters.length
                totalBytes += JSON.stringify(chapters).length
            }

            // 估算总大小（包括元数据）
            totalBytes += JSON.stringify(bookshelf).length

            const formatSize = (bytes: number): string => {
                if (bytes < 1024) return `${bytes} B`
                if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
                return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
            }

            return {
                totalBooks: bookshelf.length,
                totalChapters,
                estimatedSize: formatSize(totalBytes)
            }
        } catch (error) {
            console.error("Failed to get storage info:", error)
            return {
                totalBooks: 0,
                totalChapters: 0,
                estimatedSize: "0 B"
            }
        }
    }
}
