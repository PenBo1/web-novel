import {
  ExternalLink,
  Globe,
  Info,
  MessageSquare,
  Star,
  Download,
  Search,
  Layout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeProvider } from "@/components/theme-provider";
import "~styles/globals.css";

/**
 * 帮助中心页面
 * 为用户提供详细的使用说明与常见问题解答
 */
export default function HelpPage() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background text-foreground font-sans p-8 max-w-4xl mx-auto">
        {/* 页眉部分 */}
        <header className="flex items-center justify-between mb-8 border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Layout className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Web-novel 帮助中心</h1>
              <p className="text-sm text-muted-foreground mt-1">
                沉浸式网页阅读与管理指南
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.close()}>
            关闭页面
          </Button>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            {/* 项目介绍 */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/5">
                  <Info className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">什么是 Web-novel？</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Web-novel
                是一款为您量身定制的沉浸式网页阅读工具。它可以让您在浏览任何网页时，都能无缝切换到纯净的小说阅读模式。通过简单的
                EPUB
                文件导入或全网搜索功能，它会在网页边缘（如底部或顶部）生成一个极简的阅读条，让您利用零碎时间享受阅读的乐趣。
              </p>
            </section>

            {/* 快速上手指南 */}
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">快速上手步骤</h2>
              <div className="grid gap-4">
                {[
                  {
                    step: "01",
                    title: "导入/搜索您的图书馆",
                    desc: "在扩展弹出框的“书架”页面点击“本地导入”，或前往“发现”频道进行全网搜索。系统会自动解析章节并保存到本地（无须上传服务器）。",
                  },
                  {
                    step: "02",
                    title: "激活阅读",
                    desc: "在书架中找到您刚导入的作品，点击并选择“阅读”。此时该作品会被设为当前活动书籍，“书架”中的封面右上角会出现绿色运行指示灯。",
                  },
                  {
                    step: "03",
                    title: "享受沉浸阅读",
                    desc: "刷新当前打开的任意网页，您会发现页面底部出现了一个半透明的阅读条。它会记住您的每一章进度以及精确的滚动位置。",
                  },
                  {
                    step: "04",
                    title: "快捷导航",
                    desc: "使用键盘左右方向键进行翻页，使用 Alt + C 显示/隐藏。所有快捷键均可在插件“快捷”设置页进行完全自定义。",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="flex gap-4 p-4 rounded-xl border bg-muted/30"
                  >
                    <div className="text-2xl font-black text-primary/20 shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-bold text-base mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-snug">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 常见问题 */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">常见问题 (FAQ)</h2>
              </div>
              <div className="divide-y border rounded-xl overflow-hidden">
                {[
                  {
                    q: "为什么刷新网页后没看到阅读条？",
                    a: "请检查：1. 是否已将某本书设为“正在读”；2. 书架中封面右上角是否有绿色指示灯；3. 尝试在搜索页以外的普通网页测试。",
                  },
                  {
                    q: "支持哪些电子书格式？",
                    a: "目前深度支持标准 EPUB 格式以及基于 Scraper 引擎的在线资源抓取。对于 TXT 或 PDF 格式，建议转换后再使用以获得最佳分节效果。",
                  },
                  {
                    q: "我的阅读进度会同步吗？",
                    a: "目前所有数据均存储在您的浏览器本地存储 (Local Storage) 中。如果您删除插件或清除浏览器缓存，数据可能会丢失。",
                  },
                ].map((item, i) => (
                  <div key={i} className="p-4 bg-background">
                    <div className="font-bold text-sm mb-2 opacity-90">
                      Q: {item.q}
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      A: {item.a}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            {/* 互动卡片 */}
            <div className="rounded-xl border p-5 bg-primary/5 border-primary/20 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-primary fill-primary/50" />
              </div>
              <h3 className="font-bold mb-2 text-sm">喜欢这个扩展吗？</h3>
              <p className="text-xs text-muted-foreground mb-4">
                如果您觉得 Web-novel
                帮助到了您，请前往我们的仓库为我们点亮一颗星，您的反馈是对我们最大的支持！
              </p>
              <Button className="w-full gap-2 text-xs" variant="default">
                <Star className="w-4 h-4 fill-white" />
                项目主页
              </Button>
            </div>

            {/* 反馈信息 */}
            <div className="rounded-xl border p-5 space-y-4">
              <h3 className="font-bold text-sm">联系与反馈</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start text-xs gap-2 h-9"
                  size="sm"
                >
                  <Globe className="w-4 h-4" />
                  官方网站
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-xs gap-2 h-9"
                  size="sm"
                  asChild
                >
                  <a
                    href="https://github.com/wordflowlab/novel-writer/issues"
                    target="_blank"
                  >
                    <MessageSquare className="w-4 h-4" />
                    反馈问题 (Issue)
                  </a>
                </Button>
              </div>
            </div>
          </aside>
        </main>

        <footer className="mt-12 pt-8 border-t text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Web-novel Team. Built with ❤️ for
          reading.
        </footer>
      </div>
    </ThemeProvider>
  );
}
