import { History, Tag, Plus, Bug, Zap, Palette, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeProvider } from "@/components/theme-provider";
import "~styles/globals.css";

/**
 * 更新日志页面
 * 展示插件的版本更新历史与功能变更记录
 */
export default function ChangelogPage() {
  const changelog = [
    {
      version: "0.0.1",
      date: "2024-02-27",
      type: "initial",
      title: "初始版本发布",
      changes: [
        { type: "feature", text: "支持 EPUB 格式电子书导入" },
        { type: "feature", text: "在任意网页底部显示沉浸式阅读条" },
        { type: "feature", text: "章节进度与滚动位置自动保存" },
        { type: "feature", text: "支持键盘快捷键导航（左右方向键翻页）" },
        { type: "feature", text: "内置多个网络小说爬虫规则" },
        { type: "feature", text: "支持 HTML 格式导出下载" },
        { type: "feature", text: "浅色/深色主题切换" },
      ],
    },
    {
      version: "0.0.2",
      date: "2024-03-15",
      type: "improvement",
      title: "功能优化与修复",
      changes: [
        { type: "feature", text: "新增存储空间使用情况统计" },
        { type: "improvement", text: "优化阅读条的响应式布局" },
        { type: "improvement", text: "改进章节加载性能" },
        { type: "bug", text: "修复某些网站上阅读条显示位置错误的问题" },
        { type: "bug", text: "修复进度保存偶发丢失的问题" },
      ],
    },
    {
      version: "0.0.3",
      date: "2024-04-10",
      type: "feature",
      title: "新增功能与体验升级",
      changes: [
        { type: "feature", text: "新增更新日志页面" },
        { type: "feature", text: "支持批量导入多个 EPUB 文件" },
        { type: "feature", text: "新增书籍搜索与筛选功能" },
        { type: "improvement", text: "优化 UI 设计，提升视觉层次感" },
        { type: "improvement", text: "增强键盘快捷键的自定义能力" },
        { type: "bug", text: "修复某些特殊字符导致的显示问题" },
      ],
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case "feature":
        return "bg-green-500/10 text-green-700 border-green-200";
      case "improvement":
        return "bg-blue-500/10 text-blue-700 border-blue-200";
      case "bug":
        return "bg-red-500/10 text-red-700 border-red-200";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "feature":
        return <Plus className="w-3.5 h-3.5" />;
      case "improvement":
        return <Zap className="w-3.5 h-3.5" />;
      case "bug":
        return <Bug className="w-3.5 h-3.5" />;
      default:
        return <Info className="w-3.5 h-3.5" />;
    }
  };

  const getVersionBadgeColor = (type: string) => {
    switch (type) {
      case "initial":
        return "bg-purple-500/10 text-purple-700 border-purple-200";
      case "improvement":
        return "bg-blue-500/10 text-blue-700 border-blue-200";
      case "feature":
        return "bg-green-500/10 text-green-700 border-green-200";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-200";
    }
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background text-foreground font-sans p-8 max-w-4xl mx-auto">
        {/* 页眉部分 */}
        <header className="flex items-center justify-between mb-8 border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <History className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">更新日志</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Web-novel 版本更新历史与功能变更记录
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.close()}>
            关闭页面
          </Button>
        </header>

        <main className="space-y-8">
          {/* 版本时间线 */}
          <div className="relative">
            {/* 时间线竖线 */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary to-primary/20" />

            {/* 版本列表 */}
            <div className="space-y-8">
              {changelog.map((release, idx) => (
                <div key={release.version} className="relative pl-20">
                  {/* 时间线圆点 */}
                  <div className="absolute left-0 top-1.5 w-14 h-14 -ml-7 rounded-full border-4 border-background bg-primary/10 flex items-center justify-center">
                    <Tag className="w-6 h-6 text-primary" />
                  </div>

                  {/* 版本卡片 */}
                  <div className="rounded-2xl border bg-card p-6 hover:border-primary/30 transition-all">
                    {/* 版本头部 */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-xl font-bold">
                            v{release.version}
                          </h2>
                          <Badge
                            className={`text-xs border ${getVersionBadgeColor(release.type)}`}
                          >
                            {release.type === "initial"
                              ? "初始版本"
                              : release.type === "feature"
                                ? "新功能"
                                : "优化更新"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {release.title}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-muted-foreground">
                          {release.date}
                        </p>
                      </div>
                    </div>

                    {/* 更新内容 */}
                    <div className="space-y-2 mt-4 pt-4 border-t">
                      {release.changes.map((change, changeIdx) => (
                        <div key={changeIdx} className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border ${getTypeColor(change.type)}`}
                          >
                            {getTypeIcon(change.type)}
                          </div>
                          <div className="flex-1 pt-0.5">
                            <p className="text-sm text-foreground">
                              {change.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 底部提示 */}
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-2">
                  📝 更新说明
                </p>
                <ul className="space-y-1 text-xs">
                  <li>
                    • <span className="font-medium">新功能</span> -
                    新增的功能特性
                  </li>
                  <li>
                    • <span className="font-medium">优化更新</span> -
                    性能优化与体验改进
                  </li>
                  <li>
                    • <span className="font-medium">问题修复</span> - 已修复的
                    Bug 与问题
                  </li>
                  <li>• 所有更新均向下兼容，无需担心数据丢失</li>
                </ul>
              </div>
            </div>
          </div>
        </main>

        <footer className="mt-12 pt-8 border-t text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Web-novel Team. Built with ❤️ for
          reading.
        </footer>
      </div>
    </ThemeProvider>
  );
}
