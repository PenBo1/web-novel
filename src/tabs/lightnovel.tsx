import { useState } from "react";
import {
  Download,
  Loader2,
  Search,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster, toast } from "sonner";
import { EpubGenerator } from "@/lib/epub-generator";
import { DownloadRecordManager } from "@/lib/idb-storage";
import { StorageManager } from "@/lib/storage";
import type { Book, BookChapter } from "@/lib/types";
import type { NovelInfo, DownloadProgress } from "@/lib/lightnovel/types";
import {
  useNovelParser,
  useNovelDownloader,
  useVolumeSelection,
} from "@/lib/lightnovel/hooks";
import "~styles/globals.css";

/**
 * 来源选择器
 */
const SourceSelector = ({
  source,
  onSourceChange,
}: {
  source: "bili" | "wenku";
  onSourceChange: (source: "bili" | "wenku") => void;
}) => (
  <div className="flex gap-2">
    <Button
      variant={source === "bili" ? "default" : "outline"}
      onClick={() => onSourceChange("bili")}
      className="flex-1"
    >
      哔哩轻小说
    </Button>
    <Button
      variant={source === "wenku" ? "default" : "outline"}
      onClick={() => onSourceChange("wenku")}
      className="flex-1"
    >
      轻小说文库
    </Button>
  </div>
);

/**
 * 输入框和搜索按钮
 */
const SearchInput = ({
  input,
  onInputChange,
  onSearch,
  isLoading,
  source,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onSearch: () => void;
  isLoading: boolean;
  source: "bili" | "wenku";
}) => (
  <div className="flex gap-2">
    <Input
      placeholder={
        source === "bili"
          ? "输入小说 ID 或链接（如：123456）"
          : "输入小说 ID 或链接"
      }
      value={input}
      onChange={(e) => onInputChange(e.target.value)}
      onKeyPress={(e) => e.key === "Enter" && onSearch()}
      disabled={isLoading}
      className="flex-1"
    />
    <Button
      onClick={onSearch}
      disabled={isLoading || !input.trim()}
      className="gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          解析中
        </>
      ) : (
        <>
          <Search className="w-4 h-4" />
          解析
        </>
      )}
    </Button>
  </div>
);

/**
 * 使用示例提示
 */
const UsageExample = ({
  copied,
  onCopy,
}: {
  copied: boolean;
  onCopy: () => void;
}) => (
  <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6">
    <div className="flex gap-3">
      <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div className="text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-2">📝 使用示例</p>
        <div className="space-y-2">
          <p>方式一：直接输入小说 ID</p>
          <div className="mt-2 flex items-center gap-2 bg-background/50 p-2 rounded border">
            <code className="text-xs flex-1">123456</code>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={onCopy}
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </div>
          <p className="mt-3">方式二：粘贴完整链接</p>
          <div className="mt-2 flex items-center gap-2 bg-background/50 p-2 rounded border">
            <code className="text-xs flex-1 truncate">
              https://www.bilinovel.com/novel/123456
            </code>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * 小说信息卡片
 */
const NovelInfoCard = ({ novelInfo }: { novelInfo: NovelInfo }) => (
  <div className="flex gap-6 mb-6">
    {/* 封面 */}
    {novelInfo.cover && (
      <div className="w-32 h-48 shrink-0 rounded-lg overflow-hidden border bg-muted">
        <img
          src={novelInfo.cover}
          alt={novelInfo.title}
          className="w-full h-full object-cover"
        />
      </div>
    )}

    {/* 信息 */}
    <div className="flex-1 space-y-4">
      <div>
        <h3 className="text-2xl font-bold mb-1">{novelInfo.title}</h3>
        <p className="text-muted-foreground">作者：{novelInfo.author}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="text-xs text-muted-foreground mb-1">总卷数</div>
          <div className="text-2xl font-bold">{novelInfo.volumes.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="text-xs text-muted-foreground mb-1">总章节数</div>
          <div className="text-2xl font-bold">
            {novelInfo.volumes.reduce((sum, v) => sum + v.chapters.length, 0)}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="text-xs text-muted-foreground mb-1">状态</div>
          <div className="text-sm font-semibold">准备下载</div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * 卷选择器
 */
const VolumeSelector = ({
  volumes,
  selectedVolumes,
  onToggleVolume,
  onToggleAll,
}: {
  volumes: NovelInfo["volumes"];
  selectedVolumes: Set<number>;
  onToggleVolume: (index: number) => void;
  onToggleAll: () => void;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium">选择卷</label>
      <Button
        size="sm"
        variant="outline"
        onClick={onToggleAll}
        className="text-xs h-7"
      >
        {selectedVolumes.size === volumes.length ? "取消全选" : "全选"}
      </Button>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
      {volumes.map((volume, idx) => (
        <Button
          key={idx}
          variant={selectedVolumes.has(idx) ? "default" : "outline"}
          size="sm"
          onClick={() => onToggleVolume(idx)}
          className="text-xs justify-start truncate"
        >
          {volume.title || `第 ${idx + 1} 卷`}
        </Button>
      ))}
    </div>
  </div>
);

/**
 * 章节范围输入
 */
const ChapterRangeInput = ({
  startChapter,
  endChapter,
  onStartChange,
  onEndChange,
  disabled,
}: {
  startChapter: string;
  endChapter: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  disabled: boolean;
}) => (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="text-sm font-medium block mb-2">起始章节</label>
      <Input
        type="number"
        min="1"
        value={startChapter}
        onChange={(e) => onStartChange(e.target.value)}
        disabled={disabled}
      />
    </div>
    <div>
      <label className="text-sm font-medium block mb-2">结束章节</label>
      <Input
        type="number"
        min="1"
        value={endChapter}
        onChange={(e) => onEndChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  </div>
);

/**
 * 下载进度显示
 */
const DownloadProgressBar = ({ progress }: { progress: DownloadProgress }) => (
  <div className="space-y-2 p-3 rounded-lg bg-muted/50">
    <div className="flex justify-between text-xs">
      <span>下载进度</span>
      <span>
        {progress.current} / {progress.total}
      </span>
    </div>
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary transition-all"
        style={{
          width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
        }}
      />
    </div>
    <p className="text-xs text-muted-foreground truncate">{progress.status}</p>
  </div>
);

/**
 * 重要提示
 */
const ImportantNotice = () => (
  <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6">
    <div className="flex gap-3">
      <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div className="text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-2">⚠️ 重要提示</p>
        <ul className="space-y-1 text-xs">
          <li>• 下载的小说仅供个人学习和研究使用</li>
          <li>• 请尊重作者版权，不要用于商业目的</li>
          <li>• 下载过程中请勿关闭浏览器或此页面</li>
          <li>• 下载的小说将保存在浏览器本地存储中</li>
          <li>• 某些网站可能有反爬虫机制，下载可能失败</li>
          <li>• 下载速度受网络和网站限制，请耐心等待</li>
        </ul>
      </div>
    </div>
  </div>
);

/**
 * 轻小说下载页面
 * 支持从哔哩轻小说、轻小说文库等来源下载小说
 */
export default function LightNovelPage() {
  // 状态管理
  const [input, setInput] = useState("");
  const [source, setSource] = useState<"bili" | "wenku">("bili");
  const [novelInfo, setNovelInfo] = useState<NovelInfo | null>(null);
  const [startChapter, setStartChapter] = useState("1");
  const [endChapter, setEndChapter] = useState("");
  const [addVolumeTitle, setAddVolumeTitle] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 自定义 hooks
  const { parseNovel, isLoading } = useNovelParser();
  const { downloadNovel, downloadProgress } = useNovelDownloader();
  const {
    selectedVolumes,
    setSelectedVolumes,
    toggleVolume,
    toggleAllVolumes,
  } = useVolumeSelection();

  // 处理解析
  const handleParseUrl = async () => {
    if (!input.trim()) {
      return;
    }

    try {
      const info = await parseNovel(input, source);
      setNovelInfo(info);
      setSelectedVolumes(new Set([0]));
      setEndChapter(info.volumes[0]?.chapters.length.toString() || "");
    } catch {
      // 错误已由 hook 处理
    }
  };

  // 处理下载
  const handleDownloadChapters = async () => {
    if (!novelInfo) return;

    const start = Math.max(1, parseInt(startChapter) || 1);
    const end = parseInt(endChapter) || 999999;

    await downloadNovel(novelInfo, selectedVolumes, start, end, addVolumeTitle);

    // 重置状态
    setNovelInfo(null);
    setInput("");
  };

  // 处理直接下载 EPUB
  const handleExportEpub = async () => {
    if (!novelInfo) return;
    setIsExporting(true);

    try {
      const start = Math.max(1, parseInt(startChapter) || 1);
      const end = parseInt(endChapter) || 999999;

      // 1. 先下载到本地存储
      await downloadNovel(
        novelInfo,
        selectedVolumes,
        start,
        end,
        addVolumeTitle,
      );

      // 2. 从存储中读取并打包
      const bookId = `ln-${novelInfo.id}`;
      const chapters = await StorageManager.getBookChapters(bookId);

      if (!chapters || chapters.length === 0) {
        throw new Error("下载失败，无法生成文件");
      }

      const book: Book = {
        id: bookId,
        title: novelInfo.title,
        author: novelInfo.author,
        cover: novelInfo.cover,
        totalChapters: chapters.length,
        addedAt: Date.now(),
        progress: { chapterIndex: 0, scroll: 0 },
      };

      const generator = new EpubGenerator(book, chapters);
      const blob = await generator.generate();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${novelInfo.title}.epub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 记录
      await DownloadRecordManager.createRecord(book.id, book, chapters, "epub");

      toast.success("导出成功");
    } catch (e: any) {
      console.error("Export error:", e);
      toast.error(`导出失败：${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = () => {
    navigator.clipboard.writeText("https://www.bilinovel.com/novel/123456");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Toaster position="top-center" richColors />
      <div className="min-h-screen bg-background text-foreground font-sans p-8 max-w-5xl mx-auto">
        {/* 页眉 */}
        <header className="flex items-center justify-between mb-8 border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Download className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">轻小说下载</h1>
              <p className="text-sm text-muted-foreground mt-1">
                从网络来源下载轻小说到本地书架
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.close()}>
            关闭页面
          </Button>
        </header>

        <main className="space-y-8">
          {/* 搜索区域 */}
          <section className="space-y-4">
            <div className="rounded-2xl border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">输入小说链接或 ID</h2>

              <div className="space-y-4">
                {/* 来源选择 */}
                <SourceSelector source={source} onSourceChange={setSource} />

                {/* 输入框 */}
                <SearchInput
                  input={input}
                  onInputChange={setInput}
                  onSearch={handleParseUrl}
                  isLoading={isLoading}
                  source={source}
                />
              </div>
            </div>

            {/* 使用示例 */}
            <UsageExample copied={copied} onCopy={copyToClipboard} />
          </section>

          {/* 小说信息展示 */}
          {novelInfo && (
            <section className="space-y-4">
              <div className="rounded-2xl border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">小说信息</h2>

                {/* 小说基本信息 */}
                <NovelInfoCard novelInfo={novelInfo} />

                {/* 下载选项 */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold">下载选项</h3>

                  {/* 卷选择 */}
                  <VolumeSelector
                    volumes={novelInfo.volumes}
                    selectedVolumes={selectedVolumes}
                    onToggleVolume={toggleVolume}
                    onToggleAll={() =>
                      toggleAllVolumes(novelInfo.volumes.length)
                    }
                  />

                  {/* 章节范围 */}
                  <ChapterRangeInput
                    startChapter={startChapter}
                    endChapter={endChapter}
                    onStartChange={setStartChapter}
                    onEndChange={setEndChapter}
                    disabled={downloadProgress !== null}
                  />

                  {/* 卷标题选项 */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="addVolumeTitle"
                      checked={addVolumeTitle}
                      onChange={(e) => setAddVolumeTitle(e.target.checked)}
                      disabled={downloadProgress !== null}
                      className="w-4 h-4"
                    />
                    <label
                      htmlFor="addVolumeTitle"
                      className="text-sm cursor-pointer"
                    >
                      为每卷添加标题
                    </label>
                  </div>

                  {/* 下载进度 */}
                  {downloadProgress && (
                    <DownloadProgressBar progress={downloadProgress} />
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleDownloadChapters}
                      disabled={
                        downloadProgress !== null ||
                        selectedVolumes.size === 0 ||
                        isExporting
                      }
                      className="flex-1 gap-2"
                    >
                      {downloadProgress ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          下载中...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          保存到书架
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleExportEpub}
                      disabled={
                        downloadProgress !== null ||
                        selectedVolumes.size === 0 ||
                        isExporting
                      }
                      variant="secondary"
                      className="flex-1 gap-2"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          打包中...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          直接导出 EPUB
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNovelInfo(null);
                        setInput("");
                      }}
                      disabled={downloadProgress !== null || isExporting}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 重要提示 */}
          <ImportantNotice />
        </main>
      </div>
    </ThemeProvider>
  );
}
