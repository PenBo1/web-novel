/**
 * 快捷键管理器
 * 统一管理所有快捷键配置
 * 支持自定义快捷键和恢复默认快捷键
 */

import { LOCAL_STORAGE_KEYS, getLocalStorage, setLocalStorage } from "./local-storage-keys";
import type { Shortcut } from "./types";

export const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: "toggleReader", label: "显示/隐藏阅读条", keys: ["Alt", "C"] },
  { id: "nextPage", label: "下一页", keys: ["ArrowRight"] },
  { id: "prevPage", label: "上一页", keys: ["ArrowLeft"] },
  { id: "nextChapter", label: "下一章", keys: ["Alt", "ArrowDown"] },
  { id: "prevChapter", label: "上一章", keys: ["Alt", "ArrowUp"] },
  { id: "selectNovel", label: "选择小说", keys: ["Alt", "S"] },
  { id: "switchTheme", label: "切换主题", keys: ["Alt", "T"] },
];

/**
 * 快捷键管理器
 */
export const ShortcutsManager = {
  /**
   * 获取快捷键配置
   */
  getShortcuts(): Shortcut[] {
    try {
      const shortcuts = getLocalStorage<Shortcut[]>(
        LOCAL_STORAGE_KEYS.SHORTCUTS.CONFIG,
        DEFAULT_SHORTCUTS
      );
      
      if (!shortcuts || shortcuts.length === 0) {
        console.log("[ShortcutsManager] No shortcuts found, using defaults");
        return DEFAULT_SHORTCUTS;
      }
      
      // 检查缺失的快捷键
      const existingIds = new Set(shortcuts.map((s) => s.id));
      const missingShortcuts = DEFAULT_SHORTCUTS.filter(
        (s) => !existingIds.has(s.id)
      );
      
      if (missingShortcuts.length > 0) {
        console.log(`[ShortcutsManager] Found ${missingShortcuts.length} missing shortcuts, adding defaults`);
        const merged = [...shortcuts, ...missingShortcuts];
        setLocalStorage(LOCAL_STORAGE_KEYS.SHORTCUTS.CONFIG, merged);
        return merged;
      }
      
      return shortcuts;
    } catch (error) {
      console.error("[ShortcutsManager] Failed to get shortcuts:", error);
      return DEFAULT_SHORTCUTS;
    }
  },

  /**
   * 设置快捷键配置
   */
  setShortcuts(shortcuts: Shortcut[]): void {
    try {
      console.log(`[ShortcutsManager] Setting ${shortcuts.length} shortcuts`);
      setLocalStorage(LOCAL_STORAGE_KEYS.SHORTCUTS.CONFIG, shortcuts);
    } catch (error) {
      console.error("[ShortcutsManager] Failed to set shortcuts:", error);
    }
  },

  /**
   * 更新单个快捷键
   */
  updateShortcut(id: string, keys: string[]): void {
    try {
      const shortcuts = this.getShortcuts();
      const index = shortcuts.findIndex((s) => s.id === id);
      
      if (index === -1) {
        console.warn(`[ShortcutsManager] Shortcut ${id} not found`);
        return;
      }
      
      shortcuts[index].keys = keys;
      this.setShortcuts(shortcuts);
      console.log(`[ShortcutsManager] Updated shortcut ${id}:`, keys);
    } catch (error) {
      console.error("[ShortcutsManager] Failed to update shortcut:", error);
    }
  },

  /**
   * 获取单个快捷键
   */
  getShortcut(id: string): Shortcut | undefined {
    const shortcuts = this.getShortcuts();
    return shortcuts.find((s) => s.id === id);
  },

  /**
   * 重置为默认快捷键
   */
  resetToDefaults(): void {
    try {
      console.log("[ShortcutsManager] Resetting to default shortcuts");
      this.setShortcuts(DEFAULT_SHORTCUTS);
    } catch (error) {
      console.error("[ShortcutsManager] Failed to reset shortcuts:", error);
    }
  },

  /**
   * 检查快捷键是否匹配
   */
  matchesShortcut(id: string, event: KeyboardEvent): boolean {
    const shortcut = this.getShortcut(id);
    if (!shortcut || shortcut.keys.length === 0) return false;

    const hasCtrl = shortcut.keys.includes("Ctrl");
    const hasAlt = shortcut.keys.includes("Alt");
    const hasShift = shortcut.keys.includes("Shift");
    const hasMeta = shortcut.keys.includes("Meta");

    if (event.ctrlKey !== hasCtrl) return false;
    if (event.altKey !== hasAlt) return false;
    if (event.shiftKey !== hasShift) return false;
    if (event.metaKey !== hasMeta) return false;

    const mainKey = shortcut.keys.find(
      (k) => !["Ctrl", "Alt", "Shift", "Meta"].includes(k)
    );
    if (!mainKey) return false;

    let pressed = event.key;
    if (event.code.startsWith("Arrow")) pressed = event.code;
    else if (pressed === " ") pressed = "Space";
    else if (pressed.length === 1) pressed = pressed.toUpperCase();

    return pressed === mainKey;
  },

  /**
   * 获取快捷键的显示文本
   */
  getShortcutText(id: string): string {
    const shortcut = this.getShortcut(id);
    if (!shortcut) return "";
    return shortcut.keys.join(" + ");
  },

  /**
   * 验证快捷键配置
   */
  validateShortcuts(shortcuts: Shortcut[]): boolean {
    if (!Array.isArray(shortcuts)) return false;
    
    for (const shortcut of shortcuts) {
      if (!shortcut.id || !Array.isArray(shortcut.keys) || shortcut.keys.length === 0) {
        return false;
      }
    }
    
    return true;
  },

  /**
   * 导出快捷键配置
   */
  exportShortcuts(): string {
    const shortcuts = this.getShortcuts();
    return JSON.stringify(shortcuts, null, 2);
  },

  /**
   * 导入快捷键配置
   */
  importShortcuts(json: string): boolean {
    try {
      const shortcuts = JSON.parse(json) as Shortcut[];
      
      if (!this.validateShortcuts(shortcuts)) {
        console.error("[ShortcutsManager] Invalid shortcuts format");
        return false;
      }
      
      this.setShortcuts(shortcuts);
      console.log("[ShortcutsManager] Shortcuts imported successfully");
      return true;
    } catch (error) {
      console.error("[ShortcutsManager] Failed to import shortcuts:", error);
      return false;
    }
  },
};
