import { useEffect, useRef, useState } from "react";
import type { PlasmoCSConfig } from "plasmo";
import { BUILTIN_THEMES } from "@/lib/themes/builtin-themes";
import { ScraperEngine } from "@/lib/scraper/engine";
import { BUILTIN_RULES } from "@/lib/scraper/rules";
import { StorageManager, STORAGE_KEYS } from "@/lib/storage";
import { ContentScriptStorageManager } from "@/lib/content-script-storage";
import { ThemeManager } from "@/lib/theme-manager";
import { ShortcutsManager } from "@/lib/shortcuts-manager";
import { UISettingsManager } from "@/lib/ui-settings-manager";
import { bootstrapStorage } from "@/lib/storage-bootstrap";
import { getActiveState, updateProgress } from "@/lib/content-script-storage-helper";
import type { BookChapter, Shortcut } from "@/lib/types";

/**
 * Plasmo 内容脚本配置
 * 匹配所有网页，确保阅读条可以在任何地方呼出
 */
export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false,
};

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "toggleReader", label: "显示/隐藏阅读条", keys: ["Alt", "C"] },
  { id: "nextPage", label: "下一页", keys: ["ArrowRight"] },
  { id: "prevPage", label: "上一页", keys: ["ArrowLeft"] },
  { id: "nextChapter", label: "下一章", keys: ["Alt", "ArrowDown"] },
  { id: "prevChapter", label: "上一章", keys: ["Alt", "ArrowUp"] },
  { id: "selectNovel", label: "选择小说", keys: ["Alt", "S"] },
  { id: "switchTheme", label: "切换主题", keys: ["Alt", "T"] },
];

/**
 * 阅读条组件
 * 注入到网页底部的核心交互界面
 */
export default function Reader() {
  const [isVisible, setIsVisible] = useState(false);
  const [chapters, setChapters] = useState<BookChapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentScroll, setCurrentScroll] = useState(0);
  const [settings, setSettings] = useState<{
    readerTheme: string;
    defaultShow: boolean;
    position: "bottom" | "top";
  }>({
    readerTheme: "21st-dark",
    defaultShow: true,
    position: "bottom",
  });
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);
  const [pageSize, setPageSize] = useState(50);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [isFetchingChapter, setIsFetchingChapter] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * 初始化数据与监听存储变化
   */
  useEffect(() => {
    // 启动存储系统
    bootstrapStorage().catch(console.error);
    
    // 清理旧版 DOM 以防冲突
    const cleanupLegacy = () => {
      const legacy = document.getElementById("page-footer-host");
      if (legacy) legacy.remove();
    };
    cleanupLegacy();

    // 监听后期动态生成的旧版 DOM
    const observer = new MutationObserver((mutations) => {
      let found = false;
      for (const m of mutations) {
        for (const n of m.addedNodes) {
          if (n instanceof Element && n.id === "page-footer-host") {
            n.remove();
            found = true;
          }
        }
      }
      if (found) cleanupLegacy();
    });
    observer.observe(document.body, { childList: true });

    // 初始化加载
    const init = async () => {
      // 初始化所有管理器
      const uiSettings = UISettingsManager.getUISettings();
      
      // 使用新的辅助工具读取活跃状态
      const activeState = await getActiveState();
      
      console.log("[Reader] Active state:", activeState);

      if (activeState.activeBookId) {
        console.log("[Reader] Active book ID:", activeState.activeBookId);
        setActiveBookId(activeState.activeBookId);
        // 从后台脚本获取章节（通过消息传递）
        try {
            const chapters = await ContentScriptStorageManager.getBookChapters(activeState.activeBookId);
            console.log("[Reader] Loaded chapters:", chapters.length);
            if (chapters.length > 0) {
              console.log("[Reader] First chapter:", chapters[0].title, "Content length:", chapters[0].content?.length);
            }
            setChapters(chapters);
        } catch (e) {
            console.error("Failed to load chapters from background:", e);
        }
      } else {
        console.log("[Reader] No active book ID found");
      }

      // 恢复进度
      setCurrentChapterIndex(activeState.activeCurrentIndex);
      setCurrentScroll(activeState.activeCurrentScroll);

      // 从 UI 设置管理器加载设置
      setIsVisible(uiSettings.readerVisible);
      setSettings({
        readerTheme: ThemeManager.getThemeConfig().reader === "dark" ? "21st-dark" : "21st-light",
        defaultShow: uiSettings.defaultShow,
        position: uiSettings.readerPosition,
      });
      
      // 从快捷键管理器加载快捷键
      const shortcuts = ShortcutsManager.getShortcuts();
      setShortcuts(shortcuts);
      console.log("[Reader] Loaded shortcuts:", shortcuts.length);
    };
    init();

    // 存储联动监听
    const handleChange = async (
      changes: chrome.storage.StorageChange,
      area: string,
    ) => {
      if (area !== "local") return;
      
      if (changes[STORAGE_KEYS.ACTIVE_BOOK_ID]) {
        const newBookId = changes[STORAGE_KEYS.ACTIVE_BOOK_ID].newValue;
        console.log("[Reader] Book switched to:", newBookId);
        setActiveBookId(newBookId);
        if (newBookId) {
            try {
                const chapters = await ContentScriptStorageManager.getBookChapters(newBookId);
                console.log("[Reader] Loaded chapters for new book:", chapters.length);
                if (chapters.length > 0) {
                  console.log("[Reader] First chapter of new book:", chapters[0].title, "Content length:", chapters[0].content?.length);
                }
                setChapters(chapters);
                // 切换书籍时重置进度，除非有保存的进度
                setCurrentChapterIndex(0);
                setCurrentScroll(0);
            } catch (e) {
                console.error("Failed to load chapters on change:", e);
            }
        } else {
            console.log("[Reader] Clearing chapters");
            setChapters([]);
        }
      }
      
      if (changes[STORAGE_KEYS.ACTIVE_CURRENT_INDEX]) {
        const newIndex = changes[STORAGE_KEYS.ACTIVE_CURRENT_INDEX].newValue;
        console.log("[Reader] Chapter index changed to:", newIndex);
        setCurrentChapterIndex(newIndex ?? 0);
      }
      
      if (changes[STORAGE_KEYS.ACTIVE_CURRENT_SCROLL]) {
        const newScroll = changes[STORAGE_KEYS.ACTIVE_CURRENT_SCROLL].newValue;
        console.log("[Reader] Scroll position changed to:", newScroll);
        setCurrentScroll(newScroll ?? 0);
      }
    };

    chrome.storage.onChanged.addListener(handleChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleChange);
      observer.disconnect();
    };
  }, []);

  /**
   * 自动适应屏幕宽度计算每屏字符数
   */
  useEffect(() => {
    const calculatePageSize = () => {
      const span = document.createElement("span");
      span.style.fontFamily =
        "'JetBrains Mono', Consolas, 'Courier New', monospace";
      span.style.fontSize = "13px";
      span.style.position = "absolute";
      span.style.visibility = "hidden";
      span.textContent = "我";
      document.body.appendChild(span);
      const charWidth = span.getBoundingClientRect().width;
      document.body.removeChild(span);

      const safeCharWidth = charWidth > 0 ? charWidth : 14;
      const availableWidth = window.innerWidth - 120;
      const newSize = Math.floor(availableWidth / safeCharWidth);
      setPageSize(newSize > 0 ? newSize : 50);
    };

    calculatePageSize();
    window.addEventListener("resize", calculatePageSize);
    return () => window.removeEventListener("resize", calculatePageSize);
  }, []);

  /**
   * 核心：自动抓取在线章节内容
   * 当选中的章节内容为空且有来源 URL 时触发
   * 支持本地导入和爬虫源书籍
   */
  useEffect(() => {
    if (
      !isVisible ||
      !activeBookId ||
      chapters.length === 0 ||
      isFetchingChapter
    )
      return;

    const chapter = chapters[currentChapterIndex];
    
    // 如果章节已有内容，不需要抓取
    if (chapter && chapter.content && chapter.content.trim().length > 0) {
      return;
    }

    // 只有爬虫源书籍且有 URL 才需要抓取
    if (chapter && !chapter.content && chapter.url) {
      const fetchChapter = async () => {
        setIsFetchingChapter(true);
        try {
          const bookshelf = await ContentScriptStorageManager.getBookshelf();
          const book = bookshelf.find((b) => b.id === activeBookId);

          if (book?.isScraped && book.sourceId) {
            const rule = BUILTIN_RULES.find((r) => r.id === book.sourceId);
            if (rule) {
              const engine = new ScraperEngine(rule);
              const content = await engine.getChapterContent(chapter.url);

              if (content) {
                const newChapters = [...chapters];
                // 文本清洗：HTML -> 纯文本
                const cleanContent = content
                  .replace(/<br\s*\/?>/gi, "\n")
                  .replace(/<\/p>/gi, "\n")
                  .replace(/<[^>]+>/g, "")
                  .replace(/&nbsp;/g, " ")
                  .trim();

                newChapters[currentChapterIndex] = {
                  ...chapter,
                  content: cleanContent,
                };
                setChapters(newChapters);

                // 持久化缓存：更新 IndexedDB（通过后台脚本）
                // 注意：这里需要通过消息传递，但为了简化，我们先跳过
                // 实际应该在后台脚本中添加 SAVE_BOOK 消息处理

                // 同时更新快速访问槽
                await chrome.storage.local.set({
                  [STORAGE_KEYS.ACTIVE_CHAPTERS]: newChapters,
                });
              }
            }
          }
        } catch (error) {
          console.error("Failed to fetch chapter content:", error);
        } finally {
          setIsFetchingChapter(false);
        }
      };
      fetchChapter();
    }
  }, [
    isVisible,
    currentChapterIndex,
    chapters,
    activeBookId,
    isFetchingChapter,
  ]);

  /**
   * 后台静默保存阅读进度
   */
  useEffect(() => {
    if (!activeBookId) return;

    const save = async () => {
      try {
        // 更新 IDB 中的书籍进度
        await StorageManager.updateBookProgress(activeBookId, currentChapterIndex, currentScroll);
        
        // 同时更新 chrome.storage.local
        await updateProgress(currentChapterIndex, currentScroll);

        console.log("[Reader] Progress saved:", { activeBookId, currentChapterIndex, currentScroll });
      } catch (e) {
        console.error("[Reader] Failed to save progress:", e);
      }
    };

    const timer = setTimeout(save, 500);
    return () => clearTimeout(timer);
  }, [currentChapterIndex, currentScroll, activeBookId]);

  /**
   * 动态获取当前主题样式
   */
  const getTheme = () => {
    const theme =
      BUILTIN_THEMES.find((t) => t.id === settings.readerTheme) ||
      BUILTIN_THEMES[0];
    return {
      bg: theme.colors["editor.background"],
      fg: theme.colors["editor.foreground"],
      primary: theme.colors["button.background"] || theme.colors["focusBorder"],
      border: theme.colors["sideBar.border"],
    };
  };
  const theme = getTheme();

  const currentChapter = chapters[currentChapterIndex];
  const contentText = currentChapter?.content || "";

  /**
   * 滚动条溢出修正
   */
  useEffect(() => {
    if (contentText && currentScroll >= contentText.length) {
      setCurrentScroll(Math.max(0, contentText.length - pageSize));
    }
  }, [contentText, pageSize]);

  // 文字显示逻辑
  const displayText = isFetchingChapter
    ? "正在从书源抓取章节内容，请稍候..."
    : contentText
      ? contentText
          .substring(currentScroll, currentScroll + pageSize)
          .replace(/[\r\n]+/g, "  ")
      : "暂无内容，请检查书源或稍后重试";

  const percent =
    contentText.length > 0
      ? ((currentScroll / contentText.length) * 100).toFixed(1)
      : "0.0";

  /**
   * 导航处理
   */
  const next = () => {
    if (!contentText && !isFetchingChapter) return;
    if (currentScroll + pageSize < contentText.length) {
      setCurrentScroll((prev) => prev + pageSize);
    } else if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex((prev) => prev + 1);
      setCurrentScroll(0);
    }
  };

  const prev = () => {
    if (!contentText && !isFetchingChapter) return;
    if (currentScroll - pageSize >= 0) {
      setCurrentScroll((prev) => prev - pageSize);
    } else if (currentChapterIndex > 0) {
      const prevIdx = currentChapterIndex - 1;
      const prevLen = chapters[prevIdx]?.content?.length || 0;
      setCurrentChapterIndex(prevIdx);
      setCurrentScroll(Math.max(0, prevLen - pageSize));
    }
  };

  const nextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex((prev) => prev + 1);
      setCurrentScroll(0);
    }
  };

  const prevChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex((prev) => prev - 1);
      setCurrentScroll(0);
    }
  };

  const toggleVisibility = () => {
    const newVal = !isVisible;
    setIsVisible(newVal);
    UISettingsManager.setReaderVisible(newVal);
    // 同时更新进度到 chrome.storage.local
    updateProgress(currentChapterIndex, currentScroll).catch(console.error);
  };

  const switchTheme = () => {
    ThemeManager.toggleTheme();
  };

  /**
   * 键盘快捷键监听
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 输入框内禁用快捷键
      if (
        ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) ||
        (e.target as HTMLElement).isContentEditable
      )
        return;

      // 切换到书架里的下一本书
      const switchNextBook = async () => {
        const bookshelf = await ContentScriptStorageManager.getBookshelf();
        if (bookshelf.length === 0) return;

        bookshelf.sort((a, b) => b.addedAt - a.addedAt);

        const result = await chrome.storage.local.get(
          STORAGE_KEYS.ACTIVE_BOOK_ID,
        );
        const activeId = result[STORAGE_KEYS.ACTIVE_BOOK_ID];
        const currentIndex = bookshelf.findIndex((b) => b.id === activeId);
        const nextIndex = (currentIndex + 1) % bookshelf.length;

        await StorageManager.switchBook(bookshelf[nextIndex].id);
      };

      // 使用快捷键管理器检查快捷键
      if (ShortcutsManager.matchesShortcut("toggleReader", e)) {
        toggleVisibility();
        e.preventDefault();
        return;
      }
      if (ShortcutsManager.matchesShortcut("switchTheme", e)) {
        switchTheme();
        e.preventDefault();
        return;
      }
      if (ShortcutsManager.matchesShortcut("selectNovel", e)) {
        switchNextBook();
        e.preventDefault();
        return;
      }

      if (!isVisible) return;

      if (ShortcutsManager.matchesShortcut("nextPage", e)) {
        next();
        e.preventDefault();
      } else if (ShortcutsManager.matchesShortcut("prevPage", e)) {
        prev();
        e.preventDefault();
      } else if (ShortcutsManager.matchesShortcut("nextChapter", e)) {
        nextChapter();
        e.preventDefault();
      } else if (ShortcutsManager.matchesShortcut("prevChapter", e)) {
        prevChapter();
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isVisible,
    currentChapterIndex,
    chapters,
    currentScroll,
    pageSize,
    activeBookId,
  ]);

  if (!isVisible) return null;

  return (
    <div
      key={settings.readerTheme}
      id="Web-Novel-host"
      style={{
        position: "fixed",
        zIndex: 2147483647,
        left: 0,
        right: 0,
        top: settings.position === "top" ? 0 : "auto",
        bottom: settings.position === "top" ? "auto" : 0,
        pointerEvents: "none",
        height: "28px",
        overflow: "visible",
        display: "flex", // 确保子元素正确布局
        flexDirection: "column",
        justifyContent: settings.position === "top" ? "flex-start" : "flex-end",
      }}
    >
      <div
        ref={containerRef}
        style={{
          pointerEvents: "auto",
          width: "100%",
          height: "28px",
          backgroundColor: theme.bg,
          color: theme.fg,
          borderTop:
            settings.position === "bottom"
              ? `1px solid ${theme.border}`
              : "none",
          borderBottom:
            settings.position === "top" ? `1px solid ${theme.border}` : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
          fontSize: "13px",
          boxSizing: "border-box",
          boxShadow: "0 -2px 8px rgba(0,0,0,0.05)",
          transition: "all 0.2s ease",
        }}
      >
        {/* 左侧：内容区域 (占据绝大部分空间) */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            marginRight: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginRight: "12px",
              opacity: 0.7,
              flexShrink: 0,
              fontSize: "11px",
              fontWeight: "bold",
              userSelect: "none",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: isFetchingChapter ? "#EAB308" : theme.primary,
                opacity: isFetchingChapter ? 1 : 0.8,
              }}
            />
            <span>{isFetchingChapter ? "FETCHING" : "READY"}</span>
          </div>

          <div
            style={{
              whiteSpace: "pre",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: "28px",
              cursor: "text",
            }}
          >
            {displayText}
          </div>
        </div>

        {/* 右侧：信息与控制区 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexShrink: 0,
            fontSize: "11px",
            opacity: 0.8,
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                maxWidth: "100px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {currentChapter?.title || "No Chapter"}
            </span>
            <span style={{ opacity: 0.5 }}>|</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {percent}%
            </span>
            <span style={{ opacity: 0.5 }}>|</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {currentChapterIndex + 1}/{chapters.length}
            </span>
          </div>

          {/* 极简翻页按钮 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              marginLeft: "4px",
            }}
          >
            <button
              onClick={prev}
              title="上一页 (←)"
              style={{
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                borderRadius: "3px",
                opacity: 0.6,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={next}
              title="下一页 (→)"
              style={{
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                borderRadius: "3px",
                opacity: 0.6,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </div>
  );
}
