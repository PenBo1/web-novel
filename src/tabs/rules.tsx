import { useEffect, useState } from "react";
import {
  ExternalLink,
  Globe,
  Search,
  Upload,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StorageManager } from "@/lib/storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreateRuleDialog } from "@/components/create-rule-dialog";
import type { ScraperRule } from "@/lib/scraper/types";
import "~styles/globals.css";

function RulesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [rules, setRules] = useState<ScraperRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importContent, setImportContent] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  // 初始化加载规则
  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const storedRules = await StorageManager.getRules();
      setRules(storedRules);
    } catch (error) {
      console.error("Failed to load rules:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setImportError(null);
    if (!importContent.trim()) {
      setImportError("请输入书源内容");
      return;
    }

    try {
      let newRules: ScraperRule[] = [];
      // 尝试解析 JSON
      const parsed = JSON.parse(importContent);

      if (Array.isArray(parsed)) {
        newRules = parsed;
      } else if (typeof parsed === "object" && parsed !== null) {
        newRules = [parsed as ScraperRule];
      } else {
        throw new Error("无效的 JSON 格式");
      }

      // 简单校验必要字段
      const isValid = newRules.every(
        (r) => r.name && r.url && r.search && r.book && r.chapter,
      );
      if (!isValid) {
        throw new Error("书源格式不正确，缺少必要字段");
      }

      // 合并规则（去重）
      const mergedRules = [...rules];
      let addedCount = 0;

      newRules.forEach((newRule) => {
        // 如果没有 ID，生成一个
        if (!newRule.id) {
          newRule.id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        const existingIndex = mergedRules.findIndex(
          (r) => r.url === newRule.url || (r.id && r.id === newRule.id),
        );
        if (existingIndex >= 0) {
          // 更新现有规则
          mergedRules[existingIndex] = {
            ...newRule,
            id: mergedRules[existingIndex].id,
          };
        } else {
          // 添加新规则
          mergedRules.push(newRule);
          addedCount++;
        }
      });

      await StorageManager.saveRules(mergedRules);
      setRules(mergedRules);
      setIsImportOpen(false);
      setImportContent("");
      alert(`成功导入 ${newRules.length} 个书源`);
    } catch (e) {
      setImportError((e as Error).message || "解析失败，请检查 JSON 格式");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("确定要删除这个书源吗？")) return;

    const newRules = rules.filter((r) => r.id !== id);
    await StorageManager.saveRules(newRules);
    setRules(newRules);
  };

  const handleRuleCreate = async (newRule: ScraperRule) => {
    try {
      const mergedRules = [...rules];
      const existingIndex = mergedRules.findIndex(
        (r) => r.url === newRule.url || r.id === newRule.id,
      );

      if (existingIndex >= 0) {
        mergedRules[existingIndex] = newRule;
      } else {
        mergedRules.push(newRule);
      }

      await StorageManager.saveRules(mergedRules);
      setRules(mergedRules);
      alert("书源创建成功");
    } catch (error) {
      console.error("Failed to create rule:", error);
      alert("创建书源失败");
    }
  };

  const filteredRules = rules.filter(
    (rule) =>
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.url.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background text-foreground font-sans p-8 max-w-5xl mx-auto">
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">书源规则中心</h1>
            <p className="text-muted-foreground mt-1">
              内置 {rules.length} 个优质小说源，支持自动解析与更新。
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="搜索书源..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <CreateRuleDialog onRuleCreate={handleRuleCreate} />

            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-10" variant="outline">
                  <Upload className="w-4 h-4" />
                  导入书源
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>导入书源规则</DialogTitle>
                  <DialogDescription>
                    请粘贴标准的 JSON 格式书源规则。支持单个规则对象或规则数组。
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="json">JSON 内容</Label>
                    <Textarea
                      id="json"
                      placeholder='[{"name": "书源名称", "url": "...", ...}]'
                      className="h-[300px] font-mono text-xs"
                      value={importContent}
                      onChange={(e) => setImportContent(e.target.value)}
                    />
                  </div>
                  {importError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>导入失败</AlertTitle>
                      <AlertDescription>{importError}</AlertDescription>
                    </Alert>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsImportOpen(false)}
                  >
                    取消
                  </Button>
                  <Button onClick={handleImport}>确认导入</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-xl border bg-card p-4 flex flex-col gap-4 hover:shadow-md transition-shadow group relative"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold">{rule.name}</div>
                    <div
                      className="text-xs text-muted-foreground truncate max-w-[180px] hover:underline cursor-pointer"
                      onClick={() => window.open(rule.url, "_blank")}
                    >
                      {rule.url}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => window.open(rule.url, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {rule.search && (
                    <Badge variant="secondary" className="text-xs">
                      支持搜索
                    </Badge>
                  )}
                  {rule.toc && (
                    <Badge variant="secondary" className="text-xs">
                      目录解析
                    </Badge>
                  )}
                  {rule.chapter && (
                    <Badge variant="secondary" className="text-xs">
                      正文提取
                    </Badge>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                <span>ID: {rule.id.slice(0, 8)}...</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    正常
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(rule.id)}
                    title="删除书源"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {filteredRules.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              未找到匹配的书源
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}

export default RulesPage;
