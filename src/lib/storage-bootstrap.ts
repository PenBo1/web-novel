/**
 * 存储系统启动脚本
 * 在应用启动时调用，初始化所有存储管理器
 */

import { ThemeManager } from "./theme-manager";
import { ShortcutsManager } from "./shortcuts-manager";
import { UISettingsManager } from "./ui-settings-manager";
import { AppStateManager } from "./app-state-manager";

/**
 * 初始化存储系统
 * 应在应用启动时调用（popup 和 content script）
 */
export async function bootstrapStorage(): Promise<void> {
  try {
    console.log("[StorageBootstrap] Initializing storage system...");

    // 初始化主题
    ThemeManager.initializeTheme();
    console.log("[StorageBootstrap] Theme initialized");

    // 初始化快捷键
    const shortcuts = ShortcutsManager.getShortcuts();
    console.log(`[StorageBootstrap] Loaded ${shortcuts.length} shortcuts`);

    // 初始化 UI 设置
    const uiSettings = UISettingsManager.getUISettings();
    console.log("[StorageBootstrap] UI settings loaded");

    // 初始化应用状态
    AppStateManager.initializeAppState();
    console.log("[StorageBootstrap] App state initialized");

    console.log("[StorageBootstrap] Storage system initialized successfully");
  } catch (error) {
    console.error("[StorageBootstrap] Failed to initialize storage:", error);
    throw error;
  }
}
