import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ThemeManager } from "@/lib/theme-manager";
import { UISettingsManager } from "@/lib/ui-settings-manager";
import { ShortcutsManager } from "@/lib/shortcuts-manager";
import { bootstrapStorage } from "@/lib/storage-bootstrap";
import type { Shortcut } from "@/lib/types";
import "~styles/globals.css";

function OptionsPage() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <OptionsBody />
    </ThemeProvider>
  );
}

function OptionsBody() {
  const [settings, setSettings] = useState({
    pluginTheme: "21st-dark",
    readerTheme: "21st-dark",
    defaultShow: true,
    position: "bottom" as "bottom" | "top",
  });
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const { setTheme } = useTheme();

  useEffect(() => {
    initData();
  }, []);

  /**
   * 键盘快捷键录制逻辑
   */
  useEffect(() => {
    if (!recordingId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) return;

      const keys: string[] = [];
      if (e.ctrlKey) keys.push("Ctrl");
      if (e.altKey) keys.push("Alt");
      if (e.shiftKey) keys.push("Shift");
      if (e.metaKey) keys.push("Meta");

      let mainKey = e.key;
      if (e.code.startsWith("Arrow")) {
        mainKey = e.code;
      } else if (mainKey === " ") {
        mainKey = "Space";
      } else if (mainKey.length === 1) {
        mainKey = mainKey.toUpperCase();
      }
      keys.push(mainKey);

      // 冲突检测
      const conflict = shortcuts.find(
        (s) =>
          s.id !== recordingId &&
          JSON.stringify(s.keys) === JSON.stringify(keys),
      );
      if (conflict) {
        window.alert(`快捷键冲突：该组合已被“${conflict.label}”占用`);
        return;
      }

      const newShortcuts = shortcuts.map((s) =>
        s.id === recordingId ? { ...s, keys } : s,
      );
      saveShortcuts(newShortcuts);
      setRecordingId(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [recordingId, shortcuts]);

  const initData = async () => {
    try {
      // 1. 启动存储系统
      await bootstrapStorage();
      
      // 2. 初始化应用状态
      const { AppStateManager } = await import("@/lib/app-state-manager");
      AppStateManager.initializeAppState();
      
      // 3. 初始化主题
      const themeConfig = ThemeManager.getThemeConfig();
      
      // 4. 初始化 UI 设置
      const uiSettings = UISettingsManager.getUISettings();
      
      setSettings({
        pluginTheme: themeConfig.plugin === "dark" ? "21st-dark" : "21st-light",
        readerTheme: themeConfig.reader === "dark" ? "21st-dark" : "21st-light",
        defaultShow: uiSettings.defaultShow,
        position: uiSettings.readerPosition,
      });
      
      // 5. 适配 next-themes
      setTheme(themeConfig.plugin === "dark" ? "dark" : "light");

      // 6. 加载快捷键
      const shortcuts = ShortcutsManager.getShortcuts();
      setShortcuts(shortcuts);
    } catch (e) {
      console.error("Failed to initialize options:", e);
    }
  };

  const saveSettings = async (newSettings: any) => {
    setSettings(newSettings);
    
    // 保存主题
    const pluginTheme = newSettings.pluginTheme.includes("dark") ? "dark" : "light";
    const readerTheme = newSettings.readerTheme.includes("dark") ? "dark" : "light";
    ThemeManager.setPluginTheme(pluginTheme as any);
    ThemeManager.setReaderTheme(readerTheme as any);
    
    // 保存 UI 设置
    UISettingsManager.setDefaultShow(newSettings.defaultShow);
    UISettingsManager.setReaderPosition(newSettings.position);
  };

  const saveShortcuts = async (newShortcuts: Shortcut[]) => {
    setShortcuts(newShortcuts);
    ShortcutsManager.setShortcuts(newShortcuts);
  };

  const resetShortcuts = async () => {
    if (!confirm("确定要恢复所有快捷键为默认设置吗？")) return;
    ShortcutsManager.resetToDefaults();
    const defaultShortcuts = ShortcutsManager.getShortcuts();
    setShortcuts(defaultShortcuts);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">设置与快捷键</h1>

      <div className="space-y-8">
        {/* 常规设置 */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">常规设置</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">管理界面主题</Label>
                <p className="text-xs text-muted-foreground">
                  切换扩展弹出页面的明暗外观
                </p>
              </div>
              <Switch
                checked={settings.pluginTheme !== "21st-light"}
                onCheckedChange={(checked) => {
                  const newTheme = checked ? "21st-dark" : "21st-light";
                  saveSettings({ ...settings, pluginTheme: newTheme });
                  setTheme(checked ? "dark" : "light");
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">阅读条主题</Label>
                <p className="text-xs text-muted-foreground">
                  切换网页底部阅读条的明暗外观
                </p>
              </div>
              <Switch
                checked={settings.readerTheme !== "21st-light"}
                onCheckedChange={(checked) => {
                  const newTheme = checked ? "21st-dark" : "21st-light";
                  saveSettings({ ...settings, readerTheme: newTheme });
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">阅读条默认显示</Label>
                <p className="text-xs text-muted-foreground">
                  打开新网页时是否自动显示阅读条
                </p>
              </div>
              <Switch
                checked={settings.defaultShow}
                onCheckedChange={(c) =>
                  saveSettings({ ...settings, defaultShow: c })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">阅读条位置</Label>
                <p className="text-xs text-muted-foreground">
                  选择阅读条固定在屏幕顶部还是底部
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={settings.position === "top" ? "default" : "outline"}
                  size="sm"
                  onClick={() => saveSettings({ ...settings, position: "top" })}
                >
                  顶部
                </Button>
                <Button
                  variant={settings.position !== "top" ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    saveSettings({ ...settings, position: "bottom" })
                  }
                >
                  底部
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* 快捷键设置 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold border-b pb-2 flex-1">
              快捷键设置
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={resetShortcuts}
            >
              恢复默认
            </Button>
          </div>
          <div className="space-y-3">
            {shortcuts.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2"
              >
                <span className="text-sm font-medium">{item.label}</span>
                <div className="flex gap-3 items-center">
                  <Kbd className="text-xs min-w-[80px] justify-center">
                    {item.keys.join(" + ") || "未设置"}
                  </Kbd>
                  <Button
                    variant={
                      recordingId === item.id ? "destructive" : "secondary"
                    }
                    size="sm"
                    className="w-20"
                    onClick={() =>
                      setRecordingId(recordingId === item.id ? null : item.id)
                    }
                  >
                    {recordingId === item.id ? "按键录制中" : "修改"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default OptionsPage;
