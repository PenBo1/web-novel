export interface ScraperRule {
    id: string
    name: string
    url: string
    search: {
        url: string
        method: "get" | "post"
        data?: string
        result: string
        bookName: string
        author: string
        latestChapter?: string
        lastUpdateTime?: string
        category?: string
        status?: string
        wordCount?: string
    }
    book: {
        bookName: string
        author: string
        intro: string
        category?: string
        coverUrl?: string
        latestChapter?: string
        lastUpdateTime?: string
        status?: string
        wordCount?: string
    }
    toc: {
        url?: string
        baseUri?: string
        list?: string
        item: string
        nextPage?: string
    }
    chapter: {
        title: string
        content: string
        nextPage?: string
        filterTxt?: string
        filterTag?: string
    }
}

export interface SearchResult {
    sourceId: string
    url: string
    bookName: string
    author: string
    category?: string
    latestChapter?: string
    lastUpdateTime?: string
    status?: string
    wordCount?: string
}

export interface BookInfo {
    url: string
    bookName: string
    author: string
    intro: string
    coverUrl?: string
    category?: string
    latestChapter?: string
    lastUpdateTime?: string
    status?: string
    wordCount?: string
}

export interface Chapter {
    title: string
    url: string
    order: number
    content?: string
}
