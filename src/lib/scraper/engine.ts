import type { ScraperRule, SearchResult, BookInfo, Chapter } from "./types"

/**
 * 爬虫解析引擎
 */
export class ScraperEngine {
    private rule: ScraperRule

    constructor(rule: ScraperRule) {
        this.rule = rule
    }

    /**
     * 发起网络请求
     */
    async fetchHtml(url: string, method: "get" | "post" = "get", data?: any): Promise<string> {
        const absoluteUrl = new URL(url, this.rule.url).href

        // 渲染层日志：确认消息是否发出
        console.log(`[Engine] 发送请求到后台: ${method.toUpperCase()} ${absoluteUrl}`)

        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: "SCRAPER_FETCH",
                payload: {
                    url: absoluteUrl,
                    method,
                    data,
                    headers: {
                        "Referer": this.rule.url,
                        "Origin": new URL(this.rule.url).origin
                    }
                }
            }, (response) => {
                const error = chrome.runtime.lastError
                if (error) {
                    console.error("[Engine] Chrome Runtime Error:", error.message)
                    // 如果提示 "Could not establish connection"，通常需要刷新插件或后台已崩溃
                    reject(new Error(`通信失败: ${error.message}`))
                    return
                }

                if (response?.success) {
                    console.log(`[Engine] 收到后台响应: ${absoluteUrl} (成功)`)
                    resolve(response.data)
                } else {
                    const errorMsg = response?.error || "未知通信错误"
                    console.error(`[Engine] 后台处理报错 [${absoluteUrl}]:`, errorMsg)
                    reject(new Error(errorMsg))
                }
            })
        })
    }

    /**
     * 内容解析函数
     */
    parseContent(html: string | HTMLElement | Document | Element, query: string, type: "text" | "html" | "attr" = "text", attrName?: string): string {
        if (!query) return ""

        const [selector, jsCode] = query.split("@js:")
        let result = ""

        let root: Document | Element
        if (typeof html === "string") {
            root = new DOMParser().parseFromString(html, "text/html")
        } else {
            root = html as (Document | Element)
        }

        let element: Element | null = null
        if (selector.trim().startsWith("/") || selector.trim().startsWith("//")) {
            try {
                const ownerDoc = root.ownerDocument || root as Document
                const xpathResult = ownerDoc.evaluate(selector.trim(), root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
                element = xpathResult.singleNodeValue as Element
            } catch (e) {
                console.warn("XPath fail:", selector, e)
            }
        } else if (selector.trim()) {
            try {
                element = root.querySelector(selector.trim())
            } catch (e) {
                console.warn("CSS fail:", selector, e)
            }
        } else {
            element = (root instanceof Document ? root.documentElement : root)
        }

        if (element) {
            if (type === "text") {
                result = (element as HTMLElement).innerText?.trim() || element.textContent?.trim() || ""
            } else if (type === "html") {
                result = element.innerHTML?.trim() || ""
            } else if (type === "attr" && attrName) {
                result = element.getAttribute(attrName) || ""
            }
        } else if (!selector.trim() && jsCode) {
            result = typeof html === "string" ? html : (html as any).innerHTML || ""
        }

        if (jsCode && result !== undefined) {
            try {
                const fn = new Function("r", `var result = r; ${jsCode}; return typeof r !== 'undefined' ? r : result;`)
                result = fn(result)
            } catch (e) {
                console.error("Rules JS error:", query, e)
            }
        }

        return result
    }

    /**
     * 搜索小说
     */
    async search(keyword: string): Promise<SearchResult[]> {
        const searchRule = this.rule.search
        let url = searchRule.url.replace("%s", encodeURIComponent(keyword))

        let html = ""
        try {
            if (searchRule.method === "post") {
                // 对 POST 请求的 data 进行 URL 编码，以符合表单提交格式
                const encodedData = searchRule.data?.replace("%s", encodeURIComponent(keyword));
                html = await this.fetchHtml(url, "post", encodedData);
            } else {
                html = await this.fetchHtml(url, "get")
            }
        } catch (e: any) {
            console.error(`[Engine] 搜索网络层报错:`, e.message)
            return []
        }

        const doc = new DOMParser().parseFromString(html, "text/html")
        const items = doc.querySelectorAll(searchRule.result)
        const results: SearchResult[] = []

        items.forEach((item) => {
            const bookName = this.parseContent(item, searchRule.bookName)
            let bookUrl = this.parseContent(item, searchRule.bookName, "attr", "href")
            const author = this.parseContent(item, searchRule.author)

            if (bookName && bookUrl) {
                results.push({
                    sourceId: this.rule.id,
                    bookName,
                    url: new URL(bookUrl, this.rule.url).href,
                    author,
                    latestChapter: searchRule.latestChapter ? this.parseContent(item, searchRule.latestChapter) : undefined,
                    lastUpdateTime: searchRule.lastUpdateTime ? this.parseContent(item, searchRule.lastUpdateTime) : undefined,
                    category: searchRule.category ? this.parseContent(item, searchRule.category) : undefined,
                    status: searchRule.status ? this.parseContent(item, searchRule.status) : undefined,
                    wordCount: searchRule.wordCount ? this.parseContent(item, searchRule.wordCount) : undefined,
                })
            }
        })

        return results
    }

    /**
     * 获取详情及 TOC
     */
    async getBookInfo(bookUrl: string): Promise<{ info: BookInfo; toc: Chapter[] }> {
        const html = await this.fetchHtml(bookUrl)
        const doc = new DOMParser().parseFromString(html, "text/html")

        const bookRule = this.rule.book
        const info: BookInfo = {
            url: bookUrl,
            bookName: this.parseContent(doc, bookRule.bookName),
            author: this.parseContent(doc, bookRule.author),
            intro: this.parseContent(doc, bookRule.intro),
            coverUrl: bookRule.coverUrl ? (this.parseContent(doc, bookRule.coverUrl, "attr", "src") || this.parseContent(doc, bookRule.coverUrl, "attr", "content")) : undefined,
            category: bookRule.category ? this.parseContent(doc, bookRule.category) : undefined,
            latestChapter: bookRule.latestChapter ? this.parseContent(doc, bookRule.latestChapter) : undefined,
            lastUpdateTime: bookRule.lastUpdateTime ? this.parseContent(doc, bookRule.lastUpdateTime) : undefined,
        }

        if (info.coverUrl) info.coverUrl = new URL(info.coverUrl, bookUrl).href

        let tocDoc = doc
        if (this.rule.toc.url) {
            const bookIdMatch = bookUrl.match(/\/(\d+)\/?$/) || bookUrl.split('/').filter(Boolean).pop()?.match(/(\d+)/)
            const bookId = bookIdMatch ? bookIdMatch[1] : ""
            const tocUrl = this.rule.toc.url.replace("%s", bookId)
            const tocHtml = await this.fetchHtml(new URL(tocUrl, bookUrl).href)
            tocDoc = new DOMParser().parseFromString(tocHtml, "text/html")
        }

        let tocContainer: Document | Element = tocDoc
        if (this.rule.toc.list) {
            const cleanHtml = this.parseContent(tocDoc.documentElement.innerHTML, this.rule.toc.list)
            if (cleanHtml) {
                const temp = document.createElement("div")
                temp.innerHTML = cleanHtml
                tocContainer = temp
            }
        }

        const tocItems = tocContainer.querySelectorAll(this.rule.toc.item)
        const toc: Chapter[] = []
        tocItems.forEach((item, index) => {
            const title = (item as HTMLElement).innerText.trim()
            const url = item.getAttribute("href")
            if (title && url) {
                toc.push({
                    title,
                    url: new URL(url, bookUrl).href,
                    order: index + 1
                })
            }
        })

        return { info, toc }
    }

    /**
     * 获取章节内容
     */
    async getChapterContent(chapterUrl: string): Promise<string> {
        const html = await this.fetchHtml(chapterUrl)
        const doc = new DOMParser().parseFromString(html, "text/html")

        const chapterRule = this.rule.chapter
        let content = this.parseContent(doc, chapterRule.content, "html")

        if (chapterRule.filterTag) {
            const filterTags = chapterRule.filterTag.split(/\s+/)
            const tempDiv = document.createElement("div")
            tempDiv.innerHTML = content
            filterTags.forEach(tag => {
                const els = tempDiv.querySelectorAll(tag.trim())
                els.forEach(el => el.remove())
            })
            content = tempDiv.innerHTML
        }

        if (chapterRule.filterTxt) {
            const filters = chapterRule.filterTxt.split("|")
            filters.forEach(f => {
                if (!f.trim()) return
                try {
                    const regex = new RegExp(f, "g")
                    content = content.replace(regex, "")
                } catch (e) {
                    content = content.split(f).join("")
                }
            })
        }

        return content
    }
}
