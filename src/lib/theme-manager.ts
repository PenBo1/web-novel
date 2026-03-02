/**
 * 主题管理器
 * 统一管理插件和阅读条的主题设置
 * 支持 dark/light/system 三种模式
 */

import { LOCAL_STORAGE_KEYS, getLocalStorage, setLocalStorage } from "./local-storage-keys";

export type ThemeMode = "dark" | "light" | "system";

export interface ThemeConfig {
  plugin: ThemeMode;
  reader: ThemeMode;
}

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  plugin: "system",
  reader: "system",
};

/**
 * 主题管理器
 */
export const ThemeManager = {
  /**
   * 获取当前主题配置
   */
  getThemeConfig(): ThemeConfig {
    const pluginTheme = getLocalStorage<ThemeMode>(
      LOCAL_STORAGE_KEYS.THEME.PLUGIN,
      "system"
    );
    const readerTheme = getLocalStorage<ThemeMode>(
      LOCAL_STORAGE_KEYS.THEME.READER,
      "system"
    );

    return {
      plugin: pluginTheme || "system",
      reader: readerTheme || "system",
    };
  },

  /**
   * 设置插件主题
   */
  setPluginTheme(theme: ThemeMode): void {
    console.log(`[ThemeManager] Setting plugin theme to: ${theme}`);
    setLocalStorage(LOCAL_STORAGE_KEYS.THEME.PLUGIN, theme);
    this.applyPluginTheme(theme);
  },

  /**
   * 设置阅读条主题
   */
  setReaderTheme(theme: ThemeMode): void {
    console.log(`[ThemeManager] Setting reader theme to: ${theme}`);
    setLocalStorage(LOCAL_STORAGE_KEYS.THEME.READER, theme);
    this.applyReaderTheme(theme);
  },

  /**
   * 应用插件主题到 DOM
   */
  applyPluginTheme(theme: ThemeMode): void {
    const html = document.documentElement;
    
    if (theme === "system") {
      // 检测系统主题
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      html.classList.toggle("dark", isDark);
    } else {
      html.classList.toggle("dark", theme === "dark");
    }
    
    console.log(`[ThemeManager] Applied plugin theme: ${theme}`);
  },

  /**
   * 应用阅读条主题到 DOM
   */
  applyReaderTheme(theme: ThemeMode): void {
    const readerElement = document.getElementById("Web-Novel-host");
    if (!readerElement) return;

    if (theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      readerElement.classList.toggle("dark", isDark);
    } else {
      readerElement.classList.toggle("dark", theme === "dark");
    }
    
    console.log(`[ThemeManager] Applied reader theme: ${theme}`);
  },

  /**
   * 初始化主题
   */
  initializeTheme(): void {
    const config = this.getThemeConfig();
    this.applyPluginTheme(config.plugin);
    this.applyReaderTheme(config.reader);
    
    // 监听系统主题变化
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", () => {
      const config = this.getThemeConfig();
      if (config.plugin === "system") {
        this.applyPluginTheme("system");
      }
      if (config.reader === "system") {
        this.applyReaderTheme("system");
      }
    });
    
    console.log("[ThemeManager] Theme initialized");
  },

  /**
   * 切换主题
   */
  toggleTheme(): void {
    const config = this.getThemeConfig();
    const currentTheme = config.plugin;
    
    let nextTheme: ThemeMode;
    if (currentTheme === "dark") {
      nextTheme = "light";
    } else if (currentTheme === "light") {
      nextTheme = "system";
    } else {
      nextTheme = "dark";
    }
    
    this.setPluginTheme(nextTheme);
  },

  /**
   * 重置为默认主题
   */
  resetTheme(): void {
    this.setPluginTheme(DEFAULT_THEME_CONFIG.plugin);
    this.setReaderTheme(DEFAULT_THEME_CONFIG.reader);
  },
};
